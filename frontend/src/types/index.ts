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
