from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

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
    target_warehouse_id: Optional[int] = Query(None, description="ID склада для перемещения остатков"),
    force: bool = Query(False, description="Принудительно удалить со всеми остатками"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Удалить склад (только админ). 
    
    Параметры:
    - target_warehouse_id: если указан, все остатки будут перемещены на этот склад
    - force: если True, склад будет удалён со всеми остатками (без перемещения)
    """
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete warehouses")
    
    # Проверяем существование склада
    warehouse = db.execute(
        text("SELECT id, name, is_central FROM warehouses WHERE id = :id"),
        {"id": warehouse_id}
    ).first()
    
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    if warehouse[2]:  # is_central
        raise HTTPException(status_code=400, detail="Cannot delete central warehouse")
    
    # Проверяем наличие остатков
    has_serials = db.execute(
        text("SELECT COUNT(*) FROM serial_numbers WHERE warehouse_id = :wid"),
        {"wid": warehouse_id}
    ).scalar()
    
    has_equipment_stock = db.execute(
        text("SELECT COUNT(*) FROM warehouse_stock WHERE warehouse_id = :wid AND quantity > 0"),
        {"wid": warehouse_id}
    ).scalar()
    
    has_material_stock = db.execute(
        text("SELECT COUNT(*) FROM material_stock WHERE warehouse_id = :wid AND quantity > 0"),
        {"wid": warehouse_id}
    ).scalar()
    
    total_items = (has_serials or 0) + (has_equipment_stock or 0) + (has_material_stock or 0)
    
    # Если есть остатки и не указан склад назначения и не force
    if total_items > 0 and not target_warehouse_id and not force:
        return {
            "status": "has_items",
            "message": f"На складе есть остатки: {has_serials} единиц оборудования, {has_equipment_stock} позиций складского учёта, {has_material_stock} позиций материалов. Укажите target_warehouse_id для перемещения или используйте force=true для удаления.",
            "has_serials": has_serials,
            "has_equipment_stock": has_equipment_stock,
            "has_material_stock": has_material_stock
        }
    
    # Если указан склад назначения
    if target_warehouse_id:
        # Проверяем существование целевого склада
        target = db.execute(
            text("SELECT id, name FROM warehouses WHERE id = :id"),
            {"id": target_warehouse_id}
        ).first()
        
        if not target:
            raise HTTPException(status_code=404, detail="Target warehouse not found")
        
        if target_warehouse_id == warehouse_id:
            raise HTTPException(status_code=400, detail="Cannot move to the same warehouse")
        
        # Перемещаем серийные номера
        db.execute(
            text("UPDATE serial_numbers SET warehouse_id = :target WHERE warehouse_id = :wid"),
            {"target": target_warehouse_id, "wid": warehouse_id}
        )
        
        # Перемещаем остатки оборудования
        # Сначала получаем текущие остатки на целевом складе
        db.execute(text("""
            INSERT INTO warehouse_stock (warehouse_id, equipment_id, quantity)
            SELECT :target, equipment_id, quantity FROM warehouse_stock 
            WHERE warehouse_id = :wid
            ON CONFLICT (warehouse_id, equipment_id) DO UPDATE 
            SET quantity = warehouse_stock.quantity + EXCLUDED.quantity
        """), {"target": target_warehouse_id, "wid": warehouse_id})
        
        db.execute(
            text("DELETE FROM warehouse_stock WHERE warehouse_id = :wid"),
            {"wid": warehouse_id}
        )
        
        # Перемещаем остатки материалов
        db.execute(text("""
            INSERT INTO material_stock (warehouse_id, material_id, quantity)
            SELECT :target, material_id, quantity FROM material_stock 
            WHERE warehouse_id = :wid
            ON CONFLICT (warehouse_id, material_id) DO UPDATE 
            SET quantity = material_stock.quantity + EXCLUDED.quantity
        """), {"target": target_warehouse_id, "wid": warehouse_id})
        
        db.execute(
            text("DELETE FROM material_stock WHERE warehouse_id = :wid"),
            {"wid": warehouse_id}
        )
        
        # Записываем транзакции перемещения
        moved_serials = has_serials or 0
        moved_equipment = has_equipment_stock or 0
        moved_materials = has_material_stock or 0
        
    elif force and total_items > 0:
        # Удаляем все остатки при force
        db.execute(text("UPDATE serial_numbers SET warehouse_id = NULL WHERE warehouse_id = :wid"), {"wid": warehouse_id})
        db.execute(text("DELETE FROM warehouse_stock WHERE warehouse_id = :wid"), {"wid": warehouse_id})
        db.execute(text("DELETE FROM material_stock WHERE warehouse_id = :wid"), {"wid": warehouse_id})
    
    # Отвязываем пользователей от склада
    db.execute(
        text("UPDATE users SET warehouse_id = NULL WHERE warehouse_id = :wid"),
        {"wid": warehouse_id}
    )
    
    # Удаляем склад
    db.execute(
        text("DELETE FROM warehouses WHERE id = :id"),
        {"id": warehouse_id}
    )
    
    db.commit()
    
    result = {"status": "deleted", "warehouse_name": warehouse[1]}
    
    if target_warehouse_id:
        result["moved_to"] = target[1]
        result["moved_items"] = {
            "serial_numbers": has_serials or 0,
            "equipment_stock": has_equipment_stock or 0,
            "materials": has_material_stock or 0
        }
    
    return result


@router.get("/{warehouse_id}/stock")
def get_warehouse_stock(
    warehouse_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить остатки на складе"""
    # Серийные номера оборудования на складе
    serials = db.execute(text("""
        SELECT sn.id, sn.serial_number, sn.status, sn.notes,
               e.id as equipment_id, e.material_number, e.name as equipment_name, e.unit
        FROM serial_numbers sn
        JOIN equipment e ON sn.equipment_id = e.id
        WHERE sn.warehouse_id = :wid AND sn.status != 'written_off'
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
    
    # Остатки оборудования (несерийного)
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
    
    # Остатки материалов
    materials = db.execute(text("""
        SELECT ms.id, ms.quantity,
               m.id as material_id, m.material_number, m.name as material_name, m.unit
        FROM material_stock ms
        JOIN materials m ON ms.material_id = m.id
        WHERE ms.warehouse_id = :wid AND ms.quantity > 0
        ORDER BY m.name
    """), {"wid": warehouse_id})
    
    materials_list = []
    for row in materials:
        d = dict(row._mapping)
        materials_list.append({
            "id": d["id"],
            "quantity": d["quantity"],
            "material": {
                "id": d["material_id"],
                "material_number": d["material_number"],
                "name": d["material_name"],
                "unit": d["unit"]
            }
        })
    
    return {
        "serial_numbers": serial_list,
        "stock": stock_list,
        "materials": materials_list
    }
