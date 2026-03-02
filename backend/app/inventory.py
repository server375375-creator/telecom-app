from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from .db import get_db
from .schemas import TransferRequest, AddStockRequest, WriteOffRequest, TransactionOut
from .auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/transfer")
def transfer_equipment(
    data: TransferRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Переместить оборудование по серийному номеру.
    Только админ может перемещать оборудование.
    """
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can transfer equipment")
    
    # Находим серийный номер
    serial = db.execute(
        text("SELECT id, equipment_id, warehouse_id, status FROM serial_numbers WHERE serial_number = :sn"),
        {"sn": data.serial_number}
    ).first()
    
    if not serial:
        raise HTTPException(status_code=404, detail="Serial number not found")
    
    serial_id, equipment_id, from_warehouse_id, status = serial
    
    if status == "written_off":
        raise HTTPException(status_code=400, detail="Cannot transfer written off equipment")
    
    # Проверяем целевой склад
    to_warehouse = db.execute(
        text("SELECT id FROM warehouses WHERE id = :id"),
        {"id": data.to_warehouse_id}
    ).first()
    
    if not to_warehouse:
        raise HTTPException(status_code=404, detail="Target warehouse not found")
    
    # Создаём запись о перемещении
    db.execute(
        text("""
            INSERT INTO inventory_transactions 
            (equipment_id, serial_number_id, from_warehouse_id, to_warehouse_id, quantity, transaction_type, notes, created_by)
            VALUES (:eid, :snid, :from_wh, :to_wh, 1, 'transfer', :notes, :created_by)
        """),
        {
            "eid": equipment_id,
            "snid": serial_id,
            "from_wh": from_warehouse_id,
            "to_wh": data.to_warehouse_id,
            "notes": data.notes,
            "created_by": user["id"]
        }
    )
    
    # Обновляем склад для серийного номера
    db.execute(
        text("UPDATE serial_numbers SET warehouse_id = :wid WHERE id = :id"),
        {"wid": data.to_warehouse_id, "id": serial_id}
    )
    
    db.commit()
    
    return {
        "status": "transferred",
        "serial_number": data.serial_number,
        "from_warehouse_id": from_warehouse_id,
        "to_warehouse_id": data.to_warehouse_id
    }


@router.post("/add-stock")
def add_stock(
    data: AddStockRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Добавить материалы на склад (для несерийных материалов).
    Только админ может добавлять материалы.
    """
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can add stock")
    
    # Проверяем оборудование
    equipment = db.execute(
        text("SELECT id FROM equipment WHERE id = :id"),
        {"id": data.equipment_id}
    ).first()
    
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Проверяем склад
    warehouse = db.execute(
        text("SELECT id FROM warehouses WHERE id = :id"),
        {"id": data.warehouse_id}
    ).first()
    
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Проверяем есть ли уже запись
    existing = db.execute(
        text("SELECT id, quantity FROM warehouse_stock WHERE warehouse_id = :wid AND equipment_id = :eid"),
        {"wid": data.warehouse_id, "eid": data.equipment_id}
    ).first()
    
    if existing:
        # Обновляем количество
        db.execute(
            text("UPDATE warehouse_stock SET quantity = quantity + :qty WHERE id = :id"),
            {"qty": data.quantity, "id": existing[0]}
        )
    else:
        # Создаём новую запись
        db.execute(
            text("INSERT INTO warehouse_stock (warehouse_id, equipment_id, quantity) VALUES (:wid, :eid, :qty)"),
            {"wid": data.warehouse_id, "eid": data.equipment_id, "qty": data.quantity}
        )
    
    # Создаём запись о транзакции
    db.execute(
        text("""
            INSERT INTO inventory_transactions 
            (equipment_id, to_warehouse_id, quantity, transaction_type, notes, created_by)
            VALUES (:eid, :to_wh, :qty, 'add', :notes, :created_by)
        """),
        {
            "eid": data.equipment_id,
            "to_wh": data.warehouse_id,
            "qty": data.quantity,
            "notes": data.notes,
            "created_by": user["id"]
        }
    )
    
    db.commit()
    
    return {
        "status": "added",
        "equipment_id": data.equipment_id,
        "warehouse_id": data.warehouse_id,
        "quantity": data.quantity
    }


@router.post("/write-off")
def write_off_stock(
    data: WriteOffRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Списать материалы со склада.
    Только админ может списывать материалы.
    """
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can write off stock")
    
    # Если указан серийный номер - списываем его
    if data.serial_number:
        serial = db.execute(
            text("SELECT id, equipment_id, warehouse_id, status FROM serial_numbers WHERE serial_number = :sn"),
            {"sn": data.serial_number}
        ).first()
        
        if not serial:
            raise HTTPException(status_code=404, detail="Serial number not found")
        
        serial_id, equipment_id, warehouse_id, status = serial
        
        if status == "written_off":
            raise HTTPException(status_code=400, detail="Already written off")
        
        # Обновляем статус
        db.execute(
            text("UPDATE serial_numbers SET status = 'written_off' WHERE id = :id"),
            {"id": serial_id}
        )
        
        # Создаём запись о транзакции
        db.execute(
            text("""
                INSERT INTO inventory_transactions 
                (equipment_id, serial_number_id, from_warehouse_id, quantity, transaction_type, notes, created_by)
                VALUES (:eid, :snid, :from_wh, 1, 'write_off', :notes, :created_by)
            """),
            {
                "eid": equipment_id,
                "snid": serial_id,
                "from_wh": warehouse_id,
                "notes": data.notes,
                "created_by": user["id"]
            }
        )
        
        db.commit()
        
        return {
            "status": "written_off",
            "serial_number": data.serial_number
        }
    
    # Иначе списываем количество
    else:
        # Проверяем наличие
        stock = db.execute(
            text("SELECT id, quantity FROM warehouse_stock WHERE warehouse_id = :wid AND equipment_id = :eid"),
            {"wid": data.warehouse_id, "eid": data.equipment_id}
        ).first()
        
        if not stock or stock[1] < data.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")
        
        # Обновляем количество
        db.execute(
            text("UPDATE warehouse_stock SET quantity = quantity - :qty WHERE id = :id"),
            {"qty": data.quantity, "id": stock[0]}
        )
        
        # Создаём запись о транзакции
        db.execute(
            text("""
                INSERT INTO inventory_transactions 
                (equipment_id, from_warehouse_id, quantity, transaction_type, notes, created_by)
                VALUES (:eid, :from_wh, :qty, 'write_off', :notes, :created_by)
            """),
            {
                "eid": data.equipment_id,
                "from_wh": data.warehouse_id,
                "qty": data.quantity,
                "notes": data.notes,
                "created_by": user["id"]
            }
        )
        
        db.commit()
        
        return {
            "status": "written_off",
            "equipment_id": data.equipment_id,
            "warehouse_id": data.warehouse_id,
            "quantity": data.quantity
        }


@router.get("/transactions", response_model=List[TransactionOut])
def list_transactions(
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить историю перемещений"""
    result = db.execute(text("""
        SELECT t.id, t.quantity, t.transaction_type, t.notes, t.created_at,
               e.name as equipment_name,
               sn.serial_number,
               w1.name as from_warehouse,
               w2.name as to_warehouse,
               u.username as created_by_name
        FROM inventory_transactions t
        JOIN equipment e ON t.equipment_id = e.id
        LEFT JOIN serial_numbers sn ON t.serial_number_id = sn.id
        LEFT JOIN warehouses w1 ON t.from_warehouse_id = w1.id
        LEFT JOIN warehouses w2 ON t.to_warehouse_id = w2.id
        JOIN users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
        LIMIT :limit
    """), {"limit": limit})
    
    transactions = []
    for row in result:
        d = dict(row._mapping)
        transactions.append({
            "id": d["id"],
            "equipment_name": d["equipment_name"],
            "serial_number": d["serial_number"],
            "from_warehouse": d["from_warehouse"],
            "to_warehouse": d["to_warehouse"],
            "quantity": d["quantity"],
            "transaction_type": d["transaction_type"],
            "notes": d["notes"],
            "created_by_name": d["created_by_name"],
            "created_at": d["created_at"]
        })
    
    return transactions


@router.get("/central-stock")
def get_central_stock(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить остатки на центральном складе"""
    # Находим центральный склад
    central = db.execute(
        text("SELECT id FROM warehouses WHERE is_central = true LIMIT 1")
    ).first()
    
    if not central:
        return {"serial_numbers": [], "stock": [], "central_warehouse_id": None}
    
    # Получаем остатки
    return get_warehouse_stock_internal(central[0], db)


def get_warehouse_stock_internal(warehouse_id: int, db: Session):
    """Внутренняя функция для получения остатков"""
    # Серийные номера
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
    
    # Остатки
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
        "stock": stock_list,
        "central_warehouse_id": warehouse_id
    }