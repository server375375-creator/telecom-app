from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# -------- AUTH --------

class RegisterIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=4, max_length=256)
    role: Optional[str] = "technician"

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    username: str
    role: str

# -------- WAREHOUSES --------

class WarehouseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    location: str | None = None
    description: str | None = None

class WarehouseOut(BaseModel):
    id: int
    name: str
    location: str | None = None
    description: str | None = None
    created_at: datetime
