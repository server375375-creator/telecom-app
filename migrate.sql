-- Миграция: добавление таблиц для материалов
-- Выполнять если таблицы не существуют

-- Таблица материалов
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  material_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'шт',
  min_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Остатки материалов на складах
CREATE TABLE IF NOT EXISTS material_stock (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(material_id, warehouse_id)
);

-- Транзакции материалов
CREATE TABLE IF NOT EXISTS material_transactions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  from_warehouse_id INTEGER REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  transaction_type TEXT NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для материалов
CREATE INDEX IF NOT EXISTS idx_material_stock_material ON material_stock(material_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_warehouse ON material_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_material_transactions_material ON material_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_transactions_created ON material_transactions(created_at DESC);