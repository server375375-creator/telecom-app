import { api } from './client';
import type { Warehouse, WarehouseCreate } from '../types';

// Получить список складов
export const getWarehouses = async (): Promise<Warehouse[]> => {
  const response = await api.get('/warehouses');
  return response.data;
};

// Создать склад
export const createWarehouse = async (data: WarehouseCreate): Promise<Warehouse> => {
  const response = await api.post('/warehouses', data);
  return response.data;
};