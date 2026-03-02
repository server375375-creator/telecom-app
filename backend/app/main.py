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
from .equipment import router as equipment_router

app = FastAPI(title="Server375 API")

# Секретный ключ для создания админов (установите через env переменную)
ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY", "change-me-in-production")

# Допустимые роли
VALID_ROLES = [
    "technician",          # Техник
    "accountant",          # Бухгалтер
    "finance_director",    # Директор по финансам
    "tech_director",       # Директор по техническим вопросам
    "economist",           # Экономист
    "admin",               # Администратор
]

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(warehouses_router)
app.include_router(equipment_router)


@app.on_event("startup")
def on_startup():
    # создадим таблицы, если их нет
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-time")
def db_time(db: Session = Depends(get_db)):
    now = db.execute(text("select now()")).scalar_one()
    return {"db_time": str(now)}


@app.get("/roles")
def get_roles():
    """Получить список доступных ролей"""
    return {
        "roles": [
            {"value": "technician", "label": "Техник"},
            {"value": "accountant", "label": "Бухгалтер"},
            {"value": "finance_director", "label": "Директор по финансам"},
            {"value": "tech_director", "label": "Директор по техническим вопросам"},
            {"value": "economist", "label": "Экономист"},
        ]
    }


@app.post("/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя.
    Все новые пользователи получают роль 'technician'.
    """
    username = data.username.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    existing = get_user_by_username(db, username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Все новые пользователи - technician
    db.execute(
        text("""
            INSERT INTO users (username, password_hash, role)
            VALUES (:u, :p, 'technician')
        """),
        {"u": username, "p": hash_password(data.password)},
    )
    db.commit()
    return {"status": "created", "role": "technician"}


@app.post("/auth/create-user")
def create_user_with_role(
    username: str,
    password: str,
    role: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_user)
):
    """
    Создание пользователя с определённой ролью (только для админа).
    """
    # Проверяем права - только админ может создавать пользователей с ролями
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create users with roles")

    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Valid roles: {VALID_ROLES}")

    username = username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    existing = get_user_by_username(db, username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    db.execute(
        text("""
            INSERT INTO users (username, password_hash, role)
            VALUES (:u, :p, :r)
        """),
        {"u": username, "p": hash_password(password), "r": role},
    )
    db.commit()
    return {"status": "created", "username": username, "role": role}


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


@app.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin=Depends(get_current_user)
):
    """Список пользователей (только для админа)"""
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = db.execute(text("SELECT id, username, role FROM users ORDER BY id"))
    return [{"id": row[0], "username": row[1], "role": row[2]} for row in result]


@app.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_user)
):
    """Изменить роль пользователя (только для админа)"""
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Valid roles: {VALID_ROLES}")
    
    result = db.execute(
        text("UPDATE users SET role = :r WHERE id = :id RETURNING id, username, role"),
        {"r": role, "id": user_id}
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.commit()
    return {"id": result[0], "username": result[1], "role": result[2]}