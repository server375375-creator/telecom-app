from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default="technician", nullable=False)


class Warehouse(Base):
    __tablename__ = "warehouses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Equipment(Base):
    """Оборудование по номеру материала"""
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    material_number = Column(String(50), unique=True, index=True, nullable=False)  # Номер материала
    name = Column(String(200), nullable=False)  # Название
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # Категория
    unit = Column(String(20), default="шт")  # Единица измерения
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Связь с серийными номерами
    serial_numbers = relationship("SerialNumber", back_populates="equipment")


class SerialNumber(Base):
    """Серийные номера оборудования"""
    __tablename__ = "serial_numbers"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    status = Column(String(20), default="available")  # available, in_use, defective, written_off
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Связи
    equipment = relationship("Equipment", back_populates="serial_numbers")
    warehouse = relationship("Warehouse")