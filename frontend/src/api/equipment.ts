import { api } from './client';
import type { Equipment, EquipmentCreate, SerialNumber, SerialNumberCreate } from '../types';

// ==================== EQUIPMENT ====================

// Получить список оборудования
export const listEquipment = async (search?: string): Promise<Equipment[]> => {
  const params = search ? { search } : {};
  const response = await api.get('/equipment', { params });
  return response.data;
};

// Получить оборудование по ID
export const getEquipment = async (id: number): Promise<Equipment> => {
  const response = await api.get(`/equipment/${id}`);
  return response.data;
};

// Получить оборудование по номеру материала
export const getEquipmentByMaterialNumber = async (materialNumber: string): Promise<Equipment> => {
  const response = await api.get(`/equipment/by-material/${materialNumber}`);
  return response.data;
};

// Создать оборудование
export const createEquipment = async (data: EquipmentCreate): Promise<Equipment> => {
  const response = await api.post('/equipment', data);
  return response.data;
};

// ==================== SERIAL NUMBERS ====================

// Получить серийные номера для оборудования
export const listSerialNumbers = async (equipmentId: number): Promise<SerialNumber[]> => {
  const response = await api.get(`/equipment/${equipmentId}/serials`);
  return response.data;
};

// Добавить серийный номер
export const addSerialNumber = async (equipmentId: number, data: SerialNumberCreate): Promise<SerialNumber> => {
  const response = await api.post(`/equipment/${equipmentId}/serials`, data);
  return response.data;
};

// Найти по серийному номеру
export const searchBySerialNumber = async (serial: string): Promise<SerialNumber> => {
  const response = await api.get('/equipment/serials/search', { params: { serial } });
  return response.data;
};

// Обновить статус серийного номера
export const updateSerialStatus = async (serialId: number, status: string): Promise<SerialNumber> => {
  const response = await api.patch(`/equipment/serials/${serialId}/status`, null, {
    params: { status }
  });
  return response.data.serial;
};

// ==================== ROLES ====================

// Получить список ролей
export const getRoles = async (): Promise<{ value: string; label: string }[]> => {
  const response = await api.get('/roles');
  return response.data.roles;
};

// Получить список пользователей (admin only)
export const listUsers = async (): Promise<{ id: number; username: string; role: string }[]> => {
  const response = await api.get('/users');
  return response.data;
};

// Создать пользователя с ролью (admin only)
export const createUserWithRole = async (username: string, password: string, role: string) => {
  const response = await api.post('/auth/create-user', null, {
    params: { username, password, role }
  });
  return response.data;
};

// Изменить роль пользователя (admin only)
export const updateUserRole = async (userId: number, role: string) => {
  const response = await api.patch(`/users/${userId}/role`, null, {
    params: { role }
  });
  return response.data;
};