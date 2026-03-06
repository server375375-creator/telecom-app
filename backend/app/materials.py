from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from pydantic import BaseModel

from .db import get_db
from .auth import get_current_user

router = APIRouter(prefix="/materials", tags=["materials"])


# Pydantic схемы
class MaterialCreate(BaseModel):
    material_number: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str = "шт"
    min_quantity: Optional[int] = 0


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    min_quantity: Optional[int] = None


class AddStockRequest(BaseModel):
    warehouse_id: int
    quantity: int
    notes: Optional[str] = None


class TransferRequest(BaseModel):
    material_id: int
    from_warehouse_id: Optional[int] = None
    to_warehouse_id: int
    quantity: int
    notes: Optional[str] = None


class BulkTransferRequest(BaseModel):
    transfers: List[TransferRequest]


class WriteOffRequest(BaseModel):
    warehouse_id: int
    quantity: int
    notes: Optional[str] = None


def check_admin(user: dict):
    """Проверка прав администратора"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("")
def list_materials(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить список материалов с остатками"""
    query = """
        SELECT 
            m.id, m.material_number, m.name, m.description, m.category, m.unit, 
            m.min_quantity, m.created_at,
            COALESCE(SUM(ms.quantity), 0) as total_quantity
        FROM materials m
        LEFT JOIN material_stock ms ON m.id = ms.material_id
    """
    
    conditions = []
    params = {}
    
    if search:
        conditions.append("(m.name ILIKE :search OR m.material_number ILIKE :search)")
        params["search"] = f"%{search}%"
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    query += " GROUP BY m.id ORDER BY m.name"
    
    result = db.execute(text(query), params)
    materials = []
    
    for row in result:
        material_id = row[0]
        
        # Получаем остатки по складам
        stock_query = """
            SELECT 
                ms.warehouse_id, w.name as warehouse_name, w.is_central, ms.quantity
            FROM material_stock ms
            JOIN warehouses w ON ms.warehouse_id = w.id
            WHERE ms.material_id = :mid AND ms.quantity > 0
            ORDER BY w.is_central DESC, w.name
        """
        stock_result = db.execute(text(stock_query), {"mid": material_id})
        warehouses = [
            {
                "warehouse_id": s[0],
                "warehouse_name": s[1],
                "is_central": s[2],
                "quantity": s[3]
            }
            for s in stock_result
        ]
        
        materials.append({
            "id": row[0],
            "material_number": row[1],
            "name": row[2],
            "description": row[3],
            "category": row[4],
            "unit": row[5],
            "min_quantity": row[6],
            "created_at": row[7].isoformat() if row[7] else None,
            "total_quantity": row[8] or 0,
            "warehouses": warehouses
        })
    
    return materials


@router.post("")
def create_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Создать новый материал"""
    check_admin(user)
    
    # Проверяем уникальность номера материала
    existing = db.execute(
        text("SELECT id FROM materials WHERE material_number = :mn"),
        {"mn": data.material_number}
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Материал с таким номером уже существует")
    
    result = db.execute(
        text("""
            INSERT INTO materials (material_number, name, description, category, unit, min_quantity)
            VALUES (:mn, :name, :desc, :cat, :unit, :min_q)
            RETURNING id, material_number, name, description, category, unit, min_quantity, created_at
        """),
        {
            "mn": data.material_number,
            "name": data.name,
            "desc": data.description,
            "cat": data.category,
            "unit": data.unit,
            "min_q": data.min_quantity or 0
        }
    ).first()
    
    db.commit()
    
    return {
        "id": result[0],
        "material_number": result[1],
        "name": result[2],
        "description": result[3],
        "category": result[4],
        "unit": result[5],
        "min_quantity": result[6],
        "created_at": result[7].isoformat() if result[7] else None,
        "total_quantity": 0,
        "warehouses": []
    }


@router.get("/{material_id}")
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить материал по ID"""
    result = db.execute(
        text("""
            SELECT id, material_number, name, description, category, unit, min_quantity, created_at
            FROM materials WHERE id = :id
        """),
        {"id": material_id}
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Материал не найден")
    
    return {
        "id": result[0],
        "material_number": result[1],
        "name": result[2],
        "description": result[3],
        "category": result[4],
        "unit": result[5],
        "min_quantity": result[6],
        "created_at": result[7].isoformat() if result[7] else None
    }


@router.patch("/{material_id}")
def update_material(
    material_id: int,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Обновить материал"""
    check_admin(user)
    
    # Строим динамический UPDATE
    updates = []
    params = {"id": material_id}
    
    if data.name is not None:
        updates.append("name = :name")
        params["name"] = data.name
    if data.description is not None:
        updates.append("description = :desc")
        params["desc"] = data.description
    if data.category is not None:
        updates.append("category = :cat")
        params["cat"] = data.category
    if data.unit is not None:
        updates.append("unit = :unit")
        params["unit"] = data.unit
    if data.min_quantity is not None:
        updates.append("min_quantity = :min_q")
        params["min_q"] = data.min_quantity
    
    if not updates:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")
    
    query = f"UPDATE materials SET {', '.join(updates)} WHERE id = :id RETURNING id"
    result = db.execute(text(query), params).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Материал не найден")
    
    db.commit()
    
    return {"status": "updated", "id": material_id}


@router.delete("/{material_id}")
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Удалить материал"""
    check_admin(user)
    
    # Проверяем остатки
    stock = db.execute(
        text("SELECT SUM(quantity) FROM material_stock WHERE material_id = :id"),
        {"id": material_id}
    ).scalar()
    
    if stock and stock > 0:
        raise HTTPException(status_code=400, detail="Нельзя удалить материал с остатками на складах")
    
    result = db.execute(
        text("DELETE FROM materials WHERE id = :id RETURNING id"),
        {"id": material_id}
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Материал не найден")
    
    db.commit()
    
    return {"status": "deleted", "id": material_id}


@router.get("/{material_id}/stock")
def get_material_stock(
    material_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить остатки материала по складам"""
    material = db.execute(
        text("SELECT id, material_number, name, unit FROM materials WHERE id = :id"),
        {"id": material_id}
    ).first()
    
    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")
    
    stock = db.execute(
        text("""
            SELECT 
                ms.warehouse_id, w.name as warehouse_name, w.is_central, ms.quantity
            FROM material_stock ms
            JOIN warehouses w ON ms.warehouse_id = w.id
            WHERE ms.material_id = :mid
            ORDER BY w.is_central DESC, w.name
        """),
        {"mid": material_id}
    ).fetchall()
    
    total = sum(s[3] for s in stock) if stock else 0
    
    return {
        "id": material[0],
        "material_number": material[1],
        "name": material[2],
        "unit": material[3],
        "total_quantity": total,
        "warehouses": [
            {
                "warehouse_id": s[0],
                "warehouse_name": s[1],
                "is_central": s[2],
                "quantity": s[3]
            }
            for s in stock
        ]
    }


@router.post("/{material_id}/add-stock")
def add_stock(
    material_id: int,
    data: AddStockRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Добавить количество материала на склад"""
    check_admin(user)
    
    # Проверяем материал
    material = db.execute(
        text("SELECT id FROM materials WHERE id = :id"),
        {"id": material_id}
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")
    
    # Проверяем склад
    warehouse = db.execute(
        text("SELECT id FROM warehouses WHERE id = :id"),
        {"id": data.warehouse_id}
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Склад не найден")
    
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Количество должно быть больше 0")
    
    # Создаём или обновляем остаток
    existing = db.execute(
        text("SELECT id FROM material_stock WHERE material_id = :mid AND warehouse_id = :wid"),
        {"mid": material_id, "wid": data.warehouse_id}
    ).first()
    
    if existing:
        db.execute(
            text("UPDATE material_stock SET quantity = quantity + :q WHERE id = :id"),
            {"q": data.quantity, "id": existing[0]}
        )
    else:
        db.execute(
            text("INSERT INTO material_stock (material_id, warehouse_id, quantity) VALUES (:mid, :wid, :q)"),
            {"mid": material_id, "wid": data.warehouse_id, "q": data.quantity}
        )
    
    # Записываем транзакцию
    db.execute(
        text("""
            INSERT INTO material_transactions 
            (material_id, from_warehouse_id, to_warehouse_id, quantity, transaction_type, notes, created_by)
            VALUES (:mid, NULL, :wid, :q, 'add', :notes, :uid)
        """),
        {"mid": material_id, "wid": data.warehouse_id, "q": data.quantity, "notes": data.notes, "uid": user["id"]}
    )
    
    db.commit()
    
    return {"status": "added", "quantity": data.quantity}


@router.post("/transfer")
def transfer_material(
    data: TransferRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Переместить материал между складами"""
    check_admin(user)
    
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Количество должно быть больше 0")
    
    if data.from_warehouse_id == data.to_warehouse_id:
        raise HTTPException(status_code=400, detail="Склады должны быть разными")
    
    # Проверяем наличие на исходном складе
    if data.from_warehouse_id:
        stock = db.execute(
            text("SELECT quantity FROM material_stock WHERE material_id = :mid AND warehouse_id = :wid"),
            {"mid": data.material_id, "wid": data.from_warehouse_id}
        ).first()
        
        if not stock or stock[0] < data.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Недостаточно материала на складе. Доступно: {stock[0] if stock else 0}"
            )
        
        # Уменьшаем на исходном
        db.execute(
            text("UPDATE material_stock SET quantity = quantity - :q WHERE material_id = :mid AND warehouse_id = :wid"),
            {"q": data.quantity, "mid": data.material_id, "wid": data.from_warehouse_id}
        )
    
    # Увеличиваем на целевом
    existing = db.execute(
        text("SELECT id FROM material_stock WHERE material_id = :mid AND warehouse_id = :wid"),
        {"mid": data.material_id, "wid": data.to_warehouse_id}
    ).first()
    
    if existing:
        db.execute(
            text("UPDATE material_stock SET quantity = quantity + :q WHERE id = :id"),
            {"q": data.quantity, "id": existing[0]}
        )
    else:
        db.execute(
            text("INSERT INTO material_stock (material_id, warehouse_id, quantity) VALUES (:mid, :wid, :q)"),
            {"mid": data.material_id, "wid": data.to_warehouse_id, "q": data.quantity}
        )
    
    # Записываем транзакцию
    db.execute(
        text("""
            INSERT INTO material_transactions 
            (material_id, from_warehouse_id, to_warehouse_id, quantity, transaction_type, notes, created_by)
            VALUES (:mid, :fwid, :twid, :q, 'transfer', :notes, :uid)
        """),
        {
            "mid": data.material_id,
            "fwid": data.from_warehouse_id,
            "twid": data.to_warehouse_id,
            "q": data.quantity,
            "notes": data.notes,
            "uid": user["id"]
        }
    )
    
    db.commit()
    
    return {"status": "transferred", "quantity": data.quantity}


@router.post("/bulk-transfer")
def bulk_transfer(
    data: BulkTransferRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Массовое перемещение материалов"""
    check_admin(user)
    
    success = 0
    failed = 0
    
    for transfer in data.transfers:
        try:
            # Аналогично одиночному transfer
            if transfer.quantity <= 0:
                failed += 1
                continue
            
            if transfer.from_warehouse_id:
                stock = db.execute(
                    text("SELECT quantity FROM material_stock WHERE material_id = :mid AND warehouse_id = :wid"),
                    {"mid": transfer.material_id, "wid": transfer.from_warehouse_id}
                ).first()
                
                if not stock or stock[0] < transfer.quantity:
                    failed += 1
                    continue
                
                db.execute(
                    text("UPDATE material_stock SET quantity = quantity - :q WHERE material_id = :mid AND warehouse_id = :wid"),
                    {"q": transfer.quantity, "mid": transfer.material_id, "wid": transfer.from_warehouse_id}
                )
            
            existing = db.execute(
                text("SELECT id FROM material_stock WHERE material_id = :mid AND warehouse_id = :wid"),
                {"mid": transfer.material_id, "wid": transfer.to_warehouse_id}
            ).first()
            
            if existing:
                db.execute(
                    text("UPDATE material_stock SET quantity = quantity + :q WHERE id = :id"),
                    {"q": transfer.quantity, "id": existing[0]}
                )
            else:
                db.execute(
                    text("INSERT INTO material_stock (material_id, warehouse_id, quantity) VALUES (:mid, :wid, :q)"),
                    {"mid": transfer.material_id, "wid": transfer.to_warehouse_id, "q": transfer.quantity}
                )
            
            db.execute(
                text("""
                    INSERT INTO material_transactions 
                    (material_id, from_warehouse_id, to_warehouse_id, quantity, transaction_type, notes, created_by)
                    VALUES (:mid, :fwid, :twid, :q, 'transfer', :notes, :uid)
                """),
                {
                    "mid": transfer.material_id,
                    "fwid": transfer.from_warehouse_id,
                    "twid": transfer.to_warehouse_id,
                    "q": transfer.quantity,
                    "notes": transfer.notes,
                    "uid": user["id"]
                }
            )
            
            success += 1
        except Exception as e:
            failed += 1
    
    db.commit()
    
    return {"success": success, "failed": failed}


@router.post("/{material_id}/write-off")
def write_off(
    material_id: int,
    data: WriteOffRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Списать материал"""
    check_admin(user)
    
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Количество должно быть больше 0")
    
    # Проверяем наличие
    stock = db.execute(
        text("SELECT quantity FROM material_stock WHERE material_id = :mid AND warehouse_id = :wid"),
        {"mid": material_id, "wid": data.warehouse_id}
    ).first()
    
    if not stock or stock[0] < data.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Недостаточно материала на складе. Доступно: {stock[0] if stock else 0}"
        )
    
    # Уменьшаем остаток
    db.execute(
        text("UPDATE material_stock SET quantity = quantity - :q WHERE material_id = :mid AND warehouse_id = :wid"),
        {"q": data.quantity, "mid": material_id, "wid": data.warehouse_id}
    )
    
    # Записываем транзакцию
    db.execute(
        text("""
            INSERT INTO material_transactions 
            (material_id, from_warehouse_id, to_warehouse_id, quantity, transaction_type, notes, created_by)
            VALUES (:mid, :wid, NULL, :q, 'write_off', :notes, :uid)
        """),
        {"mid": material_id, "wid": data.warehouse_id, "q": data.quantity, "notes": data.notes, "uid": user["id"]}
    )
    
    db.commit()
    
    return {"status": "written_off", "quantity": data.quantity}


@router.get("/{material_id}/history")
def get_history(
    material_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Получить историю движений материала"""
    result = db.execute(
        text("""
            SELECT 
                mt.id, mt.material_id, mt.from_warehouse_id, mt.to_warehouse_id,
                fw.name as from_warehouse_name,
                tw.name as to_warehouse_name,
                mt.quantity, mt.transaction_type, mt.notes, mt.created_at,
                u.username as created_by
            FROM material_transactions mt
            LEFT JOIN warehouses fw ON mt.from_warehouse_id = fw.id
            LEFT JOIN warehouses tw ON mt.to_warehouse_id = tw.id
            JOIN users u ON mt.created_by = u.id
            WHERE mt.material_id = :mid
            ORDER BY mt.created_at DESC
            LIMIT 50
        """),
        {"mid": material_id}
    ).fetchall()
    
    return [
        {
            "id": row[0],
            "material_id": row[1],
            "from_warehouse_id": row[2],
            "to_warehouse_id": row[3],
            "from_warehouse_name": row[4],
            "to_warehouse_name": row[5],
            "quantity": row[6],
            "transaction_type": row[7],
            "notes": row[8],
            "created_at": row[9].isoformat() if row[9] else None,
            "created_by": row[10]
        }
        for row in result
    ]