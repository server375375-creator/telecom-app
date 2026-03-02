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