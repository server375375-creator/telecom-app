from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from .db import get_db
from .schemas import WarehouseCreate, WarehouseOut
from .auth import get_current_user

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=List[WarehouseOut])
def list_warehouses(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить список всех складов"""
    result = db.execute(text("""
        SELECT w.id, w.name, w.location, w.description, w.is_central, w.user_id, 
               w.created_at, u.username as user_name
        FROM warehouses w
        LEFT JOIN users u ON w.user_id = u.id
        ORDER BY w.is_central DESC, w.name
    """))
    
    return [dict(row._mapping) for row in result]


@router.get("/{warehouse_id}", response_model=WarehouseOut)
def get_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить склад по ID"""
    result = db.execute(text("""
        SELECT w.id, w.name, w.location, w.description, w.is_central, w.user_id, 
               w.created_at, u.username as user_name
        FROM warehouses w
        LEFT JOIN users u ON w.user_id = u.id
        WHERE w.id = :id
    """), {"id": warehouse_id}).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    return dict(result._mapping)


@router.post("", response_model=WarehouseOut)
def create_warehouse(
    data: WarehouseCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Создать новый склад (только админ)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create warehouses")
    
    # Проверяем пользователя если привязываем к монтажнику
    if data.user_id:
        user_check = db.execute(
            text("SELECT id FROM users WHERE id = :id"),
            {"id": data.user_id}
        ).first()
        if not user_check:
            raise HTTPException(status_code=400, detail="User not found")
    
    result = db.execute(
        text("""
            INSERT INTO warehouses (name, location, description, is_central, user_id)
            VALUES (:name, :location, :description, :is_central, :user_id)
            RETURNING id, name, location, description, is_central, user_id, created_at
        """),
        {
            "name": data.name,
            "location": data.location,
            "description": data.description,
            "is_central": data.is_central,
            "user_id": data.user_id
        }
    ).first()
    
    db.commit()
    
    # Получаем имя пользователя если есть
    user_name = None
    if data.user_id:
        user_result = db.execute(
            text("SELECT username FROM users WHERE id = :id"),
            {"id": data.user_id}
        ).first()
        if user_result:
            user_name = user_result[0]
    
    return {**dict(result._mapping), "user_name": user_name}


@router.put("/{warehouse_id}", response_model=WarehouseOut)
def update_warehouse(
    warehouse_id: int,
    data: WarehouseCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Обновить склад (только админ)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update warehouses")
    
    existing = db.execute(
        text("SELECT id FROM warehouses WHERE id = :id"),
        {"id": warehouse_id}
    ).first()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    result = db.execute(
        text("""
            UPDATE warehouses 
            SET name = :name, location = :location, description = :description,
                is_central = :is_central, user_id = :user_id
            WHERE id = :id
            RETURNING id, name, location, description, is_central, user_id, created_at
        """),
        {
            "id": warehouse_id,
            "name": data.name,
            "location": data.location,
            "description": data.description,
            "is_central": data.is_central,
            "user_id": data.user_id
        }
    ).first()
    
    db.commit()
    
    user_name = None
    if data.user_id:
        user_result = db.execute(
            text("SELECT username FROM users WHERE id = :id"),
            {"id": data.user_id}
        ).first()
        if user_result:
            user_name = user_result[0]
    
    return {**dict(result._mapping), "user_name": user_name}


@router.delete("/{warehouse_id}")
def delete_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Удалить склад (только админ)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete warehouses")
    
    result = db.execute(
        text("DELETE FROM warehouses WHERE id = :id RETURNING id"),
        {"id": warehouse_id}
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    db.commit()
    return {"status": "deleted"}


@router.get("/{warehouse_id}/stock")
def get_warehouse_stock(
    warehouse_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить остатки на складе"""
    # Серийные номера на складе
    serials = db.execute(text("""
        SELECT sn.id, sn.serial_number, sn.status, sn.notes,
               e.id as equipment_id, e.material_number, e.name as equipment_name, e.unit
        FROM serial_numbers sn
        JOIN equipment e ON sn.equipment_id = e.id
        WHERE sn.warehouse_id = :wid
        ORDER BY e.name, sn.serial_number
    """), {"wid": warehouse_id})
    
    serial_list = []
    for row in serials:
        d = dict(row._mapping)
        serial_list.append({
            "id": d["id"],
            "serial_number": d["serial_number"],
            "status": d["status"],
            "notes": d["notes"],
            "equipment": {
                "id": d["equipment_id"],
                "material_number": d["material_number"],
                "name": d["equipment_name"],
                "unit": d["unit"]
            }
        })
    
    # Остатки несерийных материалов
    stock = db.execute(text("""
        SELECT ws.id, ws.quantity,
               e.id as equipment_id, e.material_number, e.name as equipment_name, e.unit
        FROM warehouse_stock ws
        JOIN equipment e ON ws.equipment_id = e.id
        WHERE ws.warehouse_id = :wid AND ws.quantity > 0
        ORDER BY e.name
    """), {"wid": warehouse_id})
    
    stock_list = []
    for row in stock:
        d = dict(row._mapping)
        stock_list.append({
            "id": d["id"],
            "quantity": d["quantity"],
            "equipment": {
                "id": d["equipment_id"],
                "material_number": d["material_number"],
                "name": d["equipment_name"],
                "unit": d["unit"]
            }
        })
    
    return {
        "serial_numbers": serial_list,
        "stock": stock_list
    }