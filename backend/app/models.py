from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default="technician", nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)  # Склад монтажника
    created_at = Column(DateTime, default=datetime.utcnow)


class Warehouse(Base):
    __tablename__ = "warehouses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    is_central = Column(Boolean, default=False)  # Центральный склад
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Привязка к монтажнику (если есть)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Связь с пользователем (монтажником)
    user = relationship("User", foreign_keys=[user_id], backref="assigned_warehouse")


class Equipment(Base):
    """Оборудование по номеру материала"""
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    material_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    unit = Column(String(20), default="шт")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    serial_numbers = relationship("SerialNumber", back_populates="equipment")


class SerialNumber(Base):
    """Серийные номера оборудования"""
    __tablename__ = "serial_numbers"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    status = Column(String(20), default="available")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    equipment = relationship("Equipment", back_populates="serial_numbers")
    warehouse = relationship("Warehouse")


class InventoryTransaction(Base):
    """История перемещений материалов"""
    __tablename__ = "inventory_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    serial_number_id = Column(Integer, ForeignKey("serial_numbers.id"), nullable=True)  # Для серийных
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)  # Откуда
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)  # Куда
    quantity = Column(Integer, default=1)  # Количество
    transaction_type = Column(String(20), nullable=False)  # transfer, add, write_off
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Кто сделал
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Связи
    equipment = relationship("Equipment")
    serial_number = relationship("SerialNumber")
    from_warehouse = relationship("Warehouse", foreign_keys=[from_warehouse_id])
    to_warehouse = relationship("Warehouse", foreign_keys=[to_warehouse_id])
    user = relationship("User", foreign_keys=[created_by])


class WarehouseStock(Base):
    """Остатки на складах (для несерийных материалов)"""
    __tablename__ = "warehouse_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    quantity = Column(Integer, default=0)
    
    warehouse = relationship("Warehouse")
    equipment = relationship("Equipment")