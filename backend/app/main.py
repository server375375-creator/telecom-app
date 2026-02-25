import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import engine, Base, get_db
from .schemas import RegisterIn, TokenOut, UserOut
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_user_by_username,
)
from .warehouses import router as warehouses_router

app = FastAPI(title="Server375 API")

# Секретный ключ для создания админов (установите через env переменную)
ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY", "change-me-in-production")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(warehouses_router)

@app.on_event("startup")
def on_startup():
    # создадим таблицы, если их нет (users/warehouses)
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/db-time")
def db_time(db: Session = Depends(get_db)):
    now = db.execute(text("select now()")).scalar_one()
    return {"db_time": str(now)}

@app.get("/hello")
def hello():
    return {"hello": "world"}

@app.post("/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя.
    Все новые пользователи получают роль 'technician'.
    Создать админа можно только через секретный эндпоинт /auth/create-admin.
    """
    username = data.username.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    existing = get_user_by_username(db, username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Все новые пользователи - technician (нельзя указать роль при регистрации!)
    db.execute(
        text("""
            INSERT INTO users (username, password_hash, role)
            VALUES (:u, :p, 'technician')
        """),
        {"u": username, "p": hash_password(data.password)},
    )
    db.commit()
    return {"status": "created", "role": "technician"}


@app.post("/auth/create-admin")
def create_admin(
    data: RegisterIn,
    db: Session = Depends(get_db),
    admin_key: str = None
):
    """
    Создание админа - ТОЛЬКО с секретным ключом!
    
    Для создания админа нужно передать заголовок:
    X-Admin-Secret-Key: ваш_секретный_ключ
    
    Секретный ключ задаётся через env переменную ADMIN_SECRET_KEY.
    """
    # Проверяем секретный ключ
    if admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin secret key")

    username = data.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    existing = get_user_by_username(db, username)
    if existing:
        # Если пользователь существует - обновляем роль на admin
        db.execute(
            text("UPDATE users SET role = 'admin' WHERE username = :u"),
            {"u": username},
        )
        db.commit()
        return {"status": "updated", "username": username, "role": "admin"}
    
    # Создаём нового админа
    db.execute(
        text("""
            INSERT INTO users (username, password_hash, role)
            VALUES (:u, :p, 'admin')
        """),
        {"u": username, "p": hash_password(data.password)},
    )
    db.commit()
    return {"status": "created", "username": username, "role": "admin"}


def require_admin(user=Depends(get_current_user)):
    """Зависимость для проверки прав админа"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@app.post("/auth/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_username(db, form.username.strip())
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(form.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user["username"])
    return {"access_token": token, "token_type": "bearer"}

@app.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"], "role": user["role"]}
