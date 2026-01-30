from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import engine, Base, get_db
from .models import User
from .schemas import RegisterIn, TokenOut, UserOut
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_user_by_username,
)

app = FastAPI(title="Server375 API")


@app.on_event("startup")
def on_startup():
    # Создадим таблицы, если их нет (users уже есть — просто проверим)
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
    username = data.username.strip()
    role = (data.role or "technician").strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    existing = get_user_by_username(db, username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=username,
        password_hash=hash_password(data.password),
        role=role,
    )
    db.add(user)
    db.commit()
    return {"status": "created"}


@app.post("/auth/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_username(db, form.username)
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user.username)
    return TokenOut(access_token=token)


@app.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"], "role": user["role"]}


@app.get("/ping")
def ping():
    return {"pong": True}


@app.get("/ping")
def ping():
    return {"pong": True}
