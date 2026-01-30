from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import get_db
from .auth import get_current_user
from .schemas import WarehouseCreate, WarehouseOut

router = APIRouter(prefix="/warehouses", tags=["warehouses"])

def require_admin(user: dict):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

@router.post("", response_model=WarehouseOut)
def create_warehouse(
    data: WarehouseCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    require_admin(user)

    row = db.execute(
        text("""
            INSERT INTO warehouses (name, location, description)
            VALUES (:name, :location, :description)
            RETURNING id, name, location, description, created_at
        """),
        {
            "name": data.name.strip(),
            "location": data.location,
            "description": data.description,
        },
    ).mappings().first()

    db.commit()
    return row

@router.get("", response_model=list[WarehouseOut])
def list_warehouses(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    rows = db.execute(
        text("""
            SELECT id, name, location, description, created_at
            FROM warehouses
            ORDER BY id
        """)
    ).mappings().all()

    return list(rows)
