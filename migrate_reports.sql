-- Миграция: Модуль отчетности монтажников
-- Создание таблиц для отчетов о выполненных работах

-- Таблица объектов/адресов
CREATE TABLE IF NOT EXISTS work_objects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица отчетов о выполненных работах
CREATE TABLE IF NOT EXISTS work_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  work_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  work_object_id INTEGER REFERENCES work_objects(id),
  object_name TEXT,                    -- Название объекта (если выбран из справочника или введен вручную)
  object_address TEXT,                 -- Адрес объекта
  equipment_id INTEGER REFERENCES equipment(id),
  serial_number_id INTEGER REFERENCES serial_numbers(id),
  material_id INTEGER REFERENCES materials(id),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',  -- draft, submitted, approved, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  
  -- Для истории отмены
  cancelled_at TIMESTAMPTZ,
  cancelled_by INTEGER REFERENCES users(id),
  cancel_reason TEXT
);

-- Индексы для отчетов
CREATE INDEX IF NOT EXISTS idx_work_reports_user ON work_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_date ON work_reports(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_reports_status ON work_reports(status);
CREATE INDEX IF NOT EXISTS idx_work_reports_equipment ON work_reports(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_material ON work_reports(material_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_object ON work_reports(work_object_id);

-- Индексы для объектов
CREATE INDEX IF NOT EXISTS idx_work_objects_active ON work_objects(is_active);

-- Добавляем статус 'written_off' для serial_numbers если его нет
-- (уже должен быть в init.sql, но на всякий случай)

-- Комментарий к таблице
COMMENT ON TABLE work_reports IS 'Отчеты монтажников о выполненных работах со списанием материалов/оборудования';
COMMENT ON TABLE work_objects IS 'Справочник объектов/адресов для выполнения работ';