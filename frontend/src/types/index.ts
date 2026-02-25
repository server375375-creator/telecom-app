// Пользователь
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'technician';
}

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
  location: string | null;
  description: string | null;
  created_at: string;
}

export interface WarehouseCreate {
  name: string;
  location?: string;
  description?: string;
}

// API ошибка
export interface ApiError {
  detail: string;
}