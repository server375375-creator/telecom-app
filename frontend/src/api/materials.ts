import { api } from './client';
import type { Material, MaterialCreate, MaterialWithStock, MaterialTransfer } from '../types';

// Получить все материалы с остатками
export const listMaterialsWithStock = async (search?: string): Promise<MaterialWithStock[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  const response = await api.get(`/materials?${params.toString()}`);
  return response.data;
};

// Получить один материал
export const getMaterial = async (id: number): Promise<Material> => {
  const response = await api.get(`/materials/${id}`);
  return response.data;
};

// Создать материал
export const createMaterial = async (data: MaterialCreate): Promise<Material> => {
  const response = await api.post('/materials', data);
  return response.data;
};

// Обновить материал
export const updateMaterial = async (id: number, data: Partial<MaterialCreate>): Promise<Material> => {
  const response = await api.patch(`/materials/${id}`, data);
  return response.data;
};

// Удалить материал
export const deleteMaterial = async (id: number): Promise<void> => {
  await api.delete(`/materials/${id}`);
};

// Получить остатки материала по складам
export const getMaterialStock = async (materialId: number): Promise<MaterialWithStock> => {
  const response = await api.get(`/materials/${materialId}/stock`);
  return response.data;
};

// Добавить количество на склад
export const addMaterialStock = async (
  materialId: number,
  warehouseId: number,
  quantity: number,
  notes?: string
): Promise<void> => {
  await api.post(`/materials/${materialId}/add-stock`, {
    warehouse_id: warehouseId,
    quantity,
    notes
  });
};

// Переместить материал между складами
export const transferMaterial = async (data: MaterialTransfer): Promise<void> => {
  await api.post('/materials/transfer', data);
};

// Массовое перемещение материалов
export const bulkTransferMaterials = async (
  transfers: MaterialTransfer[]
): Promise<{ success: number; failed: number }> => {
  const response = await api.post('/materials/bulk-transfer', { transfers });
  return response.data;
};

// Списать материал
export const writeOffMaterial = async (
  materialId: number,
  warehouseId: number,
  quantity: number,
  notes?: string
): Promise<void> => {
  await api.post(`/materials/${materialId}/write-off`, {
    warehouse_id: warehouseId,
    quantity,
    notes
  });
};

// История движений материала
export const getMaterialHistory = async (materialId: number): Promise<any[]> => {
  const response = await api.get(`/materials/${materialId}/history`);
  return response.data;
};
