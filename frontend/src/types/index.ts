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

// Регистрация
export interface RegisterData {
  username: string;
  password: string;
  role?: string;
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