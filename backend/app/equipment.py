from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from .db import get_db
from .schemas import EquipmentCreate, EquipmentOut, SerialNumberCreate, SerialNumberOut
from .auth import get_current_user

router = APIRouter(prefix="/equipment", tags=["equipment"])


# ==================== EQUIPMENT ====================

@router.get("", response_model=List[EquipmentOut])
def list_equipment(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить список оборудования"""
    query = "SELECT * FROM equipment"
    params = {}
    
    if search:
        query += " WHERE material_number ILIKE :search OR name ILIKE :search"
        params["search"] = f"%{search}%"
    
    query += " ORDER BY created_at DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]


@router.get("/{equipment_id}", response_model=EquipmentOut)
def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить оборудование по ID"""
    result = db.execute(
        text("SELECT * FROM equipment WHERE id = :id"),
        {"id": equipment_id}
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    return dict(result._mapping)


@router.get("/by-material/{material_number}", response_model=EquipmentOut)
def get_by_material_number(
    material_number: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить оборудование по номеру материала"""
    result = db.execute(
        text("SELECT * FROM equipment WHERE material_number = :mn"),
        {"mn": material_number}
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    return dict(result._mapping)


@router.post("", response_model=EquipmentOut)
def create_equipment(
    data: EquipmentCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Создать новое оборудование"""
    # Проверяем уникальность номера материала
    existing = db.execute(
        text("SELECT id FROM equipment WHERE material_number = :mn"),
        {"mn": data.material_number}
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Material number already exists")
    
    result = db.execute(
        text("""
            INSERT INTO equipment (material_number, name, description, category, unit)
            VALUES (:mn, :name, :desc, :cat, :unit)
            RETURNING *
        """),
        {
            "mn": data.material_number,
            "name": data.name,
            "desc": data.description,
            "cat": data.category,
            "unit": data.unit
        }
    ).first()
    
    db.commit()
    return dict(result._mapping)


# ==================== SERIAL NUMBERS ====================

@router.get("/{equipment_id}/serials", response_model=List[SerialNumberOut])
def list_serial_numbers(
    equipment_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить серийные номера для оборудования"""
    result = db.execute(
        text("""
            SELECT sn.*, e.material_number, e.name as equip_name, e.description as equip_desc,
                   e.category as equip_cat, e.unit as equip_unit, e.created_at as equip_created
            FROM serial_numbers sn
            JOIN equipment e ON sn.equipment_id = e.id
            WHERE sn.equipment_id = :eid
            ORDER BY sn.created_at DESC
        """),
        {"eid": equipment_id}
    )
    
    serials = []
    for row in result:
        d = dict(row._mapping)
        serials.append({
            "id": d["id"],
            "equipment_id": d["equipment_id"],
            "serial_number": d["serial_number"],
            "warehouse_id": d["warehouse_id"],
            "status": d["status"],
            "notes": d["notes"],
            "created_at": d["created_at"],
            "equipment": {
                "id": d["equipment_id"],
                "material_number": d["material_number"],
                "name": d["equip_name"],
                "description": d["equip_desc"],
                "category": d["equip_cat"],
                "unit": d["equip_unit"],
                "created_at": d["equip_created"]
            }
        })
    
    return serials


@router.post("/{equipment_id}/serials", response_model=SerialNumberOut)
def add_serial_number(
    equipment_id: int,
    data: SerialNumberCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Добавить серийный номер к оборудованию"""
    # Проверяем существование оборудования
    equip = db.execute(
        text("SELECT id FROM equipment WHERE id = :id"),
        {"id": equipment_id}
    ).first()
    
    if not equip:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Проверяем уникальность серийного номера
    existing = db.execute(
        text("SELECT id FROM serial_numbers WHERE serial_number = :sn"),
        {"sn": data.serial_number}
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Serial number already exists")
    
    result = db.execute(
        text("""
            INSERT INTO serial_numbers (equipment_id, serial_number, warehouse_id, status, notes)
            VALUES (:eid, :sn, :wh, :status, :notes)
            RETURNING *
        """),
        {
            "eid": equipment_id,
            "sn": data.serial_number,
            "wh": data.warehouse_id,
            "status": data.status or "available",
            "notes": data.notes
        }
    ).first()
    
    db.commit()
    return dict(result._mapping)


@router.get("/serials/search", response_model=SerialNumberOut)
def search_by_serial(
    serial: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Найти оборудование по серийному номеру"""
    result = db.execute(
        text("""
            SELECT sn.*, e.material_number, e.name as equip_name, e.description as equip_desc,
                   e.category as equip_cat, e.unit as equip_unit, e.created_at as equip_created
            FROM serial_numbers sn
            JOIN equipment e ON sn.equipment_id = e.id
            WHERE sn.serial_number = :serial
        """),
        {"serial": serial}
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Serial number not found")
    
    d = dict(result._mapping)
    return {
        "id": d["id"],
        "equipment_id": d["equipment_id"],
        "serial_number": d["serial_number"],
        "warehouse_id": d["warehouse_id"],
        "status": d["status"],
        "notes": d["notes"],
        "created_at": d["created_at"],
        "equipment": {
            "id": d["equipment_id"],
            "material_number": d["material_number"],
            "name": d["equip_name"],
            "description": d["equip_desc"],
            "category": d["equip_cat"],
            "unit": d["equip_unit"],
            "created_at": d["equip_created"]
        }
    }


@router.patch("/serials/{serial_id}/status")
def update_serial_status(
    serial_id: int,
    status: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Обновить статус серийного номера"""
    valid_statuses = ["available", "in_use", "defective", "written_off"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")
    
    result = db.execute(
        text("UPDATE serial_numbers SET status = :status WHERE id = :id RETURNING *"),
        {"status": status, "id": serial_id}
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Serial number not found")
    
    db.commit()
    return {"status": "updated", "serial": dict(result._mapping)}


# ==================== EQUIPMENT WITH COUNTS ====================

@router.get("/with-counts/list")
def list_equipment_with_counts(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить список оборудования с общим количеством по каждому типу"""
    query = """
        SELECT 
            e.id, e.material_number, e.name, e.description, e.category, e.unit, e.created_at,
            COUNT(sn.id) as total_serial_count,
            COUNT(sn.id) FILTER (WHERE sn.status = 'available') as available_count,
            COUNT(sn.id) FILTER (WHERE sn.status = 'in_use') as in_use_count,
            COUNT(sn.id) FILTER (WHERE sn.status = 'defective') as defective_count,
            COALESCE(ws.total_stock, 0) as stock_quantity
        FROM equipment e
        LEFT JOIN serial_numbers sn ON sn.equipment_id = e.id AND sn.status != 'written_off'
        LEFT JOIN (
            SELECT equipment_id, SUM(quantity) as total_stock 
            FROM warehouse_stock 
            GROUP BY equipment_id
        ) ws ON ws.equipment_id = e.id
    """
    params = {}
    
    if search:
        query += " WHERE e.material_number ILIKE :search OR e.name ILIKE :search"
        params["search"] = f"%{search}%"
    
    query += " GROUP BY e.id, ws.total_stock ORDER BY e.created_at DESC"
    
    result = db.execute(text(query), params)
    
    items = []
    for row in result:
        d = dict(row._mapping)
        items.append({
            "id": d["id"],
            "material_number": d["material_number"],
            "name": d["name"],
            "description": d["description"],
            "category": d["category"],
            "unit": d["unit"],
            "created_at": d["created_at"],
            "total_count": (d["total_serial_count"] or 0) + (d["stock_quantity"] or 0),
            "serial_count": d["total_serial_count"] or 0,
            "available_count": d["available_count"] or 0,
            "in_use_count": d["in_use_count"] or 0,
            "defective_count": d["defective_count"] or 0,
            "stock_quantity": d["stock_quantity"] or 0
        })
    
    return items


@router.get("/{equipment_id}/warehouse-distribution")
def get_equipment_warehouse_distribution(
    equipment_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить распределение оборудования по складам"""
    # Серийные номера по складам
    serials_by_warehouse = db.execute(text("""
        SELECT w.id as warehouse_id, w.name as warehouse_name, w.is_central,
               COUNT(sn.id) as serial_count,
               COUNT(sn.id) FILTER (WHERE sn.status = 'available') as available_count,
               COUNT(sn.id) FILTER (WHERE sn.status = 'in_use') as in_use_count,
               COUNT(sn.id) FILTER (WHERE sn.status = 'defective') as defective_count
        FROM warehouses w
        LEFT JOIN serial_numbers sn ON sn.warehouse_id = w.id 
            AND sn.equipment_id = :eid AND sn.status != 'written_off'
        GROUP BY w.id, w.name, w.is_central
        HAVING COUNT(sn.id) > 0
        ORDER BY w.is_central DESC, w.name
    """), {"eid": equipment_id})
    
    # Остатки по складам (несерийное)
    stock_by_warehouse = db.execute(text("""
        SELECT w.id as warehouse_id, w.name as warehouse_name, w.is_central,
               ws.quantity
        FROM warehouse_stock ws
        JOIN warehouses w ON w.id = ws.warehouse_id
        WHERE ws.equipment_id = :eid AND ws.quantity > 0
        ORDER BY w.is_central DESC, w.name
    """), {"eid": equipment_id})
    
    distribution = {}
    
    # Добавляем серийные
    for row in serials_by_warehouse:
        d = dict(row._mapping)
        wid = d["warehouse_id"]
        distribution[wid] = {
            "warehouse_id": wid,
            "warehouse_name": d["warehouse_name"],
            "is_central": d["is_central"],
            "serial_count": d["serial_count"],
            "available_count": d["available_count"],
            "in_use_count": d["in_use_count"],
            "defective_count": d["defective_count"],
            "stock_quantity": 0
        }
    
    # Добавляем остатки
    for row in stock_by_warehouse:
        d = dict(row._mapping)
        wid = d["warehouse_id"]
        if wid in distribution:
            distribution[wid]["stock_quantity"] = d["quantity"]
        else:
            distribution[wid] = {
                "warehouse_id": wid,
                "warehouse_name": d["warehouse_name"],
                "is_central": d["is_central"],
                "serial_count": 0,
                "available_count": 0,
                "in_use_count": 0,
                "defective_count": 0,
                "stock_quantity": d["quantity"]
            }
    
    return list(distribution.values())


# ==================== SERIAL SEARCH IMPROVED ====================

@router.get("/serials/search-advanced")
def search_serials_advanced(
    serial: Optional[str] = None,
    equipment_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Расширенный поиск серийных номеров"""
    query = """
        SELECT sn.*, e.material_number, e.name as equip_name, e.description as equip_desc,
               e.category as equip_cat, e.unit as equip_unit, e.created_at as equip_created,
               w.name as warehouse_name
        FROM serial_numbers sn
        JOIN equipment e ON sn.equipment_id = e.id
        LEFT JOIN warehouses w ON sn.warehouse_id = w.id
        WHERE 1=1
    """
    params = {"limit": limit}
    
    if serial:
        query += " AND sn.serial_number ILIKE :serial"
        params["serial"] = f"%{serial}%"
    
    if equipment_id:
        query += " AND sn.equipment_id = :eid"
        params["eid"] = equipment_id
    
    if warehouse_id:
        query += " AND sn.warehouse_id = :wid"
        params["wid"] = warehouse_id
    
    if status:
        query += " AND sn.status = :status"
        params["status"] = status
    
    query += " ORDER BY sn.created_at DESC LIMIT :limit"
    
    result = db.execute(text(query), params)
    
    serials = []
    for row in result:
        d = dict(row._mapping)
        serials.append({
            "id": d["id"],
            "equipment_id": d["equipment_id"],
            "serial_number": d["serial_number"],
            "warehouse_id": d["warehouse_id"],
            "warehouse_name": d["warehouse_name"],
            "status": d["status"],
            "notes": d["notes"],
            "created_at": d["created_at"],
            "equipment": {
                "id": d["equipment_id"],
                "material_number": d["material_number"],
                "name": d["equip_name"],
                "description": d["equip_desc"],
                "category": d["equip_cat"],
                "unit": d["equip_unit"],
                "created_at": d["equip_created"]
            }
        })
    
    return serials
