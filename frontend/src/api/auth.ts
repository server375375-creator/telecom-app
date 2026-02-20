import { api } from './client';
import type { User, TokenResponse, RegisterData } from '../types';

// Регистрация
export const register = async (data: RegisterData) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

// Логин (использует form-data для OAuth2)
export const login = async (username: string, password: string): Promise<TokenResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

// Получить текущего пользователя
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/me');
  return response.data;
};