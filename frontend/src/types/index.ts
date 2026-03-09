// Роли пользователей
export type UserRole = 
  | 'admin' 
  | 'technician' 
  | 'accountant'           // Бухгалтер
  | 'finance_director'     // Директор по финансам
  | 'tech_director'        // Директор по техническим вопросам
  | 'economist';           // Экономист

// Пользователь
export interface User {
  id: number;
  username: string;
  role: UserRole;
  warehouse_id?: number | null;
  warehouse_name?: string | null;
  is_active?: boolean;
}

// Названия ролей на русском
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Администратор',
  technician: 'Техник',
  accountant: 'Бухгалтер',
  finance_director: 'Директор по финансам',
  tech_director: 'Директор по техническим вопросам',
  economist: 'Экономист',
};

// Токен
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Регистрация (role убран - все новые пользователи = technician)
export interface RegisterData {
  username: string;
  password: string;
}

// Данные для создания админа (требуется секретный ключ)
export interface CreateAdminData {
  username: string;
  password: string;
  adminSecretKey: string;
}

// Логин
export interface LoginData {
  username: string;
  password: string;
}

// Склад
export interface Warehouse {
  id: number;
  name: string;
  location?: string | null;
  description?: string | null;
  is_central?: boolean;
  user_id?: number | null;
  user_name?: string | null;
  created_at?: string;
}

export interface WarehouseCreate {
  name: string;
  location?: string;
  description?: string;
  is_central?: boolean;
  user_id?: number | null;
}

// Оборудование
export interface Equipment {
  id: number;
  material_number: string;      // Номер материала
  name: string;                 // Название оборудования
  description: string | null;
  category: string | null;      // Категория
  unit: string;                 // Единица измерения
  created_at: string;
}

export interface EquipmentCreate {
  material_number: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
}

// Серийный номер
export interface SerialNumber {
  id: number;
  equipment_id: number;
  serial_number: string;        // Серийный номер
  warehouse_id: number | null;  // Склад
  status: 'available' | 'in_use' | 'defective' | 'written_off';
  notes: string | null;
  created_at: string;
  // Связанные данные
  equipment?: Equipment;
  warehouse?: Warehouse;
}

export interface SerialNumberCreate {
  equipment_id: number;
  serial_number: string;
  warehouse_id?: number;
  status?: 'available' | 'in_use' | 'defective' | 'written_off';
  notes?: string;
}

// Статусы серийников
export const SERIAL_STATUS_LABELS: Record<SerialNumber['status'], string> = {
  available: 'Доступен',
  in_use: 'В использовании',
  defective: 'Неисправен',
  written_off: 'Списан',
};

// API ошибка
export interface ApiError {
  detail: string;
}

// ============ МАТЕРИАЛЫ (без серийных номеров) ============

// Материал
export interface Material {
  id: number;
  material_number: string;      // Номер материала
  name: string;                 // Название материала
  description: string | null;
  category: string | null;      // Категория
  unit: string;                 // Единица измерения
  min_quantity?: number;        // Минимальный остаток
  created_at: string;
}

export interface MaterialCreate {
  material_number: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  min_quantity?: number;
}

// Остаток материала на складе
export interface MaterialStock {
  id: number;
  material_id: number;
  warehouse_id: number;
  quantity: number;
  material?: Material;
  warehouse?: Warehouse;
}

// Материал с остатками
export interface MaterialWithStock extends Material {
  total_quantity: number;
  warehouses: MaterialWarehouseStock[];
}

export interface MaterialWarehouseStock {
  warehouse_id: number;
  warehouse_name: string;
  is_central: boolean;
  quantity: number;
}

// Перемещение материала
export interface MaterialTransfer {
  material_id: number;
  from_warehouse_id: number | null;
  to_warehouse_id: number;
  quantity: number;
  notes?: string;
}

// ============ ОТЧЕТЫ МОНТАЖНИКОВ ============

// Объект для выполнения работ
export interface WorkObject {
  id: number;
  name: string;
  address: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkObjectCreate {
  name: string;
  address?: string;
  description?: string;
}

// Отчет о выполненной работе
export interface WorkReport {
  id: number;
  user_id: number;
  username: string;
  work_date: string;
  work_object_id: number | null;
  object_name: string | null;
  object_address: string | null;
  equipment_id: number | null;
  equipment_name: string | null;
  equipment_material_number: string | null;
  serial_number_id: number | null;
  serial_number: string | null;
  material_id: number | null;
  material_name: string | null;
  material_material_number: string | null;
  quantity: number;
  notes: string | null;
  status: 'submitted' | 'approved' | 'cancelled';
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancelled_by_name: string | null;
}

// Создание отчета
export interface WorkReportCreate {
  work_date: string;
  work_object_id?: number;
  object_name?: string;
  object_address?: string;
  equipment_id?: number;
  serial_number_id?: number;
  material_id?: number;
  quantity: number;
  notes?: string;
}

// Статусы отчета
export const REPORT_STATUS_LABELS: Record<WorkReport['status'], string> = {
  submitted: 'Отправлен',
  approved: 'Утвержден',
  cancelled: 'Отменен',
};

// Остатки на складе монтажника
export interface TechnicianStock {
  warehouse_id: number | null;
  equipment: TechnicianEquipmentItem[];
  materials: TechnicianMaterialItem[];
}

export interface TechnicianEquipmentItem {
  equipment_id: number;
  material_number: string;
  name: string;
  category: string | null;
  unit: string;
  serial_id: number;
  serial_number: string;
  status: string;
}

export interface TechnicianMaterialItem {
  material_id: number;
  material_number: string;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
}

// Статистика по отчетам
export interface ReportStats {
  total_reports: number;
  by_user: Array<{ username: string; count: number }>;
  by_type: Array<{ type: string; count: number }>;
  by_object: Array<{ object_name: string; count: number }>;
}
