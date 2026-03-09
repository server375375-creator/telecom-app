-- Миграция на новую структуру отчетов v2
-- Выполнить после существующих таблиц

-- 1. Справочник видов работ
CREATE TABLE IF NOT EXISTS work_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Заполняем начальными видами работ
INSERT INTO work_types (name, description) VALUES
('Подключение PON', 'Подключение нового абонента по технологии PON'),
('Подключение Ethernet', 'Подключение нового абонента по Ethernet'),
('PON переезд', 'Переезд абонента с сохранением услуги PON'),
('Сварка оптического волокна', 'Сварка оптического волокна'),
('Активация SIM-карты', 'Активация SIM-карты абонента'),
('Ремонт', 'Ремонтные работы'),
('Обследование', 'Обследование объекта'),
('Другое', 'Другие виды работ')
ON CONFLICT (name) DO NOTHING;

-- 2. Заявки (основная таблица)
CREATE TABLE IF NOT EXISTS task_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    task_number VARCHAR(50),  -- № Таска
    account_number VARCHAR(50),  -- Лицевой счет
    subscriber_name VARCHAR(200),  -- ФИО абонента
    city VARCHAR(100),  -- Город
    address VARCHAR(500),  -- Адрес
    priority VARCHAR(50),  -- Приоритет (Обычный, Повышенный, Срочный)
    status VARCHAR(20) DEFAULT 'new',  -- new, in_progress, completed, cancelled
    notes TEXT,  -- Примечания
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 3. Виды работ в заявке (одна заявка может иметь несколько видов работ)
CREATE TABLE IF NOT EXISTS task_work_items (
    id SERIAL PRIMARY KEY,
    task_request_id INTEGER NOT NULL REFERENCES task_requests(id) ON DELETE CASCADE,
    work_type_id INTEGER NOT NULL REFERENCES work_types(id),
    notes TEXT,  -- Примечания к конкретному виду работ
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Позиции в виде работ (оборудование/материалы)
CREATE TABLE IF NOT EXISTS task_equipment_items (
    id SERIAL PRIMARY KEY,
    task_work_item_id INTEGER NOT NULL REFERENCES task_work_items(id) ON DELETE CASCADE,
    equipment_id INTEGER REFERENCES equipment(id),
    serial_number_id INTEGER REFERENCES serial_numbers(id),
    material_id INTEGER REFERENCES materials(id),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Фото к заявке
CREATE TABLE IF NOT EXISTS task_photos (
    id SERIAL PRIMARY KEY,
    task_request_id INTEGER NOT NULL REFERENCES task_requests(id) ON DELETE CASCADE,
    work_type_id INTEGER REFERENCES work_types(id),  -- К какому виду работ относится (опционально)
    file_path VARCHAR(500) NOT NULL,  -- Путь к файлу
    file_name VARCHAR(200),  -- Оригинальное имя файла
    description TEXT,  -- Описание фото
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_task_requests_user ON task_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_task_requests_status ON task_requests(status);
CREATE INDEX IF NOT EXISTS idx_task_requests_account ON task_requests(account_number);
CREATE INDEX IF NOT EXISTS idx_task_work_items_task ON task_work_items(task_request_id);
CREATE INDEX IF NOT EXISTS idx_task_equipment_work ON task_equipment_items(task_work_item_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_task ON task_photos(task_request_id);