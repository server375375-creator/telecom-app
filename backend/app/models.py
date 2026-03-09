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
    is_active = Column(Boolean, default=True, nullable=False)  # Активная учетная запись
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


class Material(Base):
    """Материалы (без серийных номеров)"""
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    material_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    unit = Column(String(20), default="шт")
    min_quantity = Column(Integer, default=0)  # Минимальный остаток для уведомлений
    created_at = Column(DateTime, default=datetime.utcnow)


class MaterialStock(Base):
    """Остатки материалов на складах"""
    __tablename__ = "material_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, default=0)
    
    material = relationship("Material", backref="stock_entries")
    warehouse = relationship("Warehouse")


class MaterialTransaction(Base):
    """История движений материалов"""
    __tablename__ = "material_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    transaction_type = Column(String(20), nullable=False)  # add, transfer, write_off
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    material = relationship("Material")
    from_warehouse = relationship("Warehouse", foreign_keys=[from_warehouse_id])
    to_warehouse = relationship("Warehouse", foreign_keys=[to_warehouse_id])
    user = relationship("User", foreign_keys=[created_by])


class WorkObject(Base):
    """Объекты/адреса для выполнения работ"""
    __tablename__ = "work_objects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    address = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkReport(Base):
    """Отчеты о выполненных работах (старая таблица, оставлена для совместимости)"""
    __tablename__ = "work_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    work_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    work_object_id = Column(Integer, ForeignKey("work_objects.id"), nullable=True)
    object_name = Column(String(200), nullable=True)
    object_address = Column(String(500), nullable=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    serial_number_id = Column(Integer, ForeignKey("serial_numbers.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    quantity = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="submitted", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancelled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancel_reason = Column(Text, nullable=True)
    
    user = relationship("User", foreign_keys=[user_id])
    work_object = relationship("WorkObject")
    equipment = relationship("Equipment")
    serial_number = relationship("SerialNumber")
    material = relationship("Material")
    canceller = relationship("User", foreign_keys=[cancelled_by])


# ============ НОВАЯ СТРУКТУРА ЗАЯВОК ============

class WorkType(Base):
    """Справочник видов работ"""
    __tablename__ = "work_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class TaskRequest(Base):
    """Заявки на выполнение работ"""
    __tablename__ = "task_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_number = Column(String(50), nullable=True)  # № Таска
    account_number = Column(String(50), nullable=True)  # Лицевой счет
    subscriber_name = Column(String(200), nullable=True)  # ФИО абонента
    city = Column(String(100), nullable=True)  # Город
    address = Column(String(500), nullable=True)  # Адрес
    priority = Column(String(50), default='Обычный')  # Приоритет
    status = Column(String(20), default='new', nullable=False)  # new, in_progress, completed, cancelled
    notes = Column(Text, nullable=True)  # Примечания
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    user = relationship("User", foreign_keys=[user_id])
    work_items = relationship("TaskWorkItem", back_populates="task_request", cascade="all, delete-orphan")
    photos = relationship("TaskPhoto", back_populates="task_request", cascade="all, delete-orphan")


class TaskWorkItem(Base):
    """Виды работ в заявке (одна заявка - несколько видов работ)"""
    __tablename__ = "task_work_items"
    
    id = Column(Integer, primary_key=True, index=True)
    task_request_id = Column(Integer, ForeignKey("task_requests.id"), nullable=False)
    work_type_id = Column(Integer, ForeignKey("work_types.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    task_request = relationship("TaskRequest", back_populates="work_items")
    work_type = relationship("WorkType")
    equipment_items = relationship("TaskEquipmentItem", back_populates="work_item", cascade="all, delete-orphan")


class TaskEquipmentItem(Base):
    """Позиции оборудования/материалов в виде работ"""
    __tablename__ = "task_equipment_items"
    
    id = Column(Integer, primary_key=True, index=True)
    task_work_item_id = Column(Integer, ForeignKey("task_work_items.id"), nullable=False)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    serial_number_id = Column(Integer, ForeignKey("serial_numbers.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    work_item = relationship("TaskWorkItem", back_populates="equipment_items")
    equipment = relationship("Equipment")
    serial_number = relationship("SerialNumber")
    material = relationship("Material")


class TaskPhoto(Base):
    """Фото к заявке"""
    __tablename__ = "task_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    task_request_id = Column(Integer, ForeignKey("task_requests.id"), nullable=False)
    work_type_id = Column(Integer, ForeignKey("work_types.id"), nullable=True)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    task_request = relationship("TaskRequest", back_populates="photos")
    work_type = relationship("WorkType")
    uploader = relationship("User", foreign_keys=[uploaded_by])
