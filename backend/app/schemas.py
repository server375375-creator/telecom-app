from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# -------- AUTH --------

class RegisterIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=4, max_length=256)
    # role убран - все новые пользователи = technician

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
    is_central: bool = False
    user_id: int | None = None  # Привязка к монтажнику

class WarehouseOut(BaseModel):
    id: int
    name: str
    location: str | None = None
    description: str | None = None
    is_central: bool = False
    user_id: int | None = None
    user_name: str | None = None  # Имя монтажника
    created_at: datetime

# -------- INVENTORY TRANSACTIONS --------

class TransferRequest(BaseModel):
    serial_number: str  # Серийный номер для перемещения
    to_warehouse_id: int  # Куда перемещаем
    notes: str | None = None

class AddStockRequest(BaseModel):
    equipment_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)
    notes: str | None = None

class WriteOffRequest(BaseModel):
    equipment_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)
    serial_number: str | None = None  # Для серийных
    notes: str | None = None

class TransactionOut(BaseModel):
    id: int
    equipment_name: str
    serial_number: str | None = None
    from_warehouse: str | None = None
    to_warehouse: str | None = None
    quantity: int
    transaction_type: str
    notes: str | None = None
    created_by_name: str
    created_at: datetime

# -------- EQUIPMENT --------

class EquipmentCreate(BaseModel):
    material_number: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str | None = None
    unit: str = Field(default="шт", max_length=20)

class EquipmentOut(BaseModel):
    id: int
    material_number: str
    name: str
    description: str | None = None
    category: str | None = None
    unit: str
    created_at: datetime

# -------- SERIAL NUMBERS --------

class SerialNumberCreate(BaseModel):
    equipment_id: int
    serial_number: str = Field(min_length=1, max_length=100)
    warehouse_id: int | None = None
    status: str = Field(default="available")
    notes: str | None = None

class SerialNumberOut(BaseModel):
    id: int
    equipment_id: int
    serial_number: str
    warehouse_id: int | None = None
    status: str
    notes: str | None = None
    created_at: datetime
    equipment: EquipmentOut | None = None

    class Config:
        from_attributes = True
