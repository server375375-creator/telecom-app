import { api } from './client';
import type { Warehouse, WarehouseCreate } from '../types';

// Получить список складов
export const getWarehouses = async (): Promise<Warehouse[]> => {
  const response = await api.get('/warehouses');
  return response.data as Warehouse[];
};

// Алиас для совместимости
export const listWarehouses = getWarehouses;

// Создать склад
export const createWarehouse = async (data: WarehouseCreate): Promise<Warehouse> => {
  const response = await api.post('/warehouses', data);
  return response.data as Warehouse;
};

// Удалить склад
export const deleteWarehouse = async (
  warehouseId: number,
  options?: { targetWarehouseId?: number; force?: boolean }
): Promise<{
  status: string;
  message?: string;
  warehouse_name?: string;
  moved_to?: string;
  moved_items?: {
    serial_numbers: number;
    equipment_stock: number;
    materials: number;
  };
  has_serials?: number;
  has_equipment_stock?: number;
  has_material_stock?: number;
}> => {
  const params: Record<string, unknown> = {};
  if (options?.targetWarehouseId) {
    params.target_warehouse_id = options.targetWarehouseId;
  }
  if (options?.force) {
    params.force = true;
  }
  const response = await api.delete(`/warehouses/${warehouseId}`, { params });
  return response.data;
};

// Обновить склад
export const updateWarehouse = async (warehouseId: number, data: WarehouseCreate): Promise<Warehouse> => {
  const response = await api.put(`/warehouses/${warehouseId}`, data);
  return response.data as Warehouse;
};
