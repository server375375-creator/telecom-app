-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'technician',
  is_active BOOLEAN DEFAULT TRUE,
  warehouse_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Склады
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  is_central BOOLEAN DEFAULT FALSE,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Добавляем foreign key для users.warehouse_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_warehouse_id_fkey' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_warehouse_id_fkey 
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
  END IF;
END $$;

-- Оборудование
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  material_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'шт',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Серийные номера
CREATE TABLE IF NOT EXISTS serial_numbers (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  serial_number TEXT UNIQUE NOT NULL,
  warehouse_id INTEGER REFERENCES warehouses(id),
  status TEXT NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Остатки на складах
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(equipment_id, warehouse_id)
);

-- Транзакции инвентаря
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  serial_number_id INTEGER REFERENCES serial_numbers(id),
  from_warehouse_id INTEGER REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  transaction_type TEXT NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_serial_numbers_equipment ON serial_numbers(equipment_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_warehouse ON serial_numbers(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_equipment ON warehouse_stock(equipment_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_equipment ON inventory_transactions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON inventory_transactions(created_at DESC);