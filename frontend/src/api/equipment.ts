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
export const listUsers = async (): Promise<{ id: number; username: string; role: string; warehouse_id: number | null; warehouse_name: string | null; is_active: boolean }[]> => {
  const response = await api.get('/users');
  return response.data as { id: number; username: string; role: string; warehouse_id: number | null; warehouse_name: string | null; is_active: boolean }[];
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

// Привязать склад к пользователю (admin only)
export const assignUserWarehouse = async (userId: number, warehouseId: number | null) => {
  const response = await api.patch(`/users/${userId}/warehouse`, null, {
    params: { warehouse_id: warehouseId }
  });
  return response.data;
};

// Изменить статус активности пользователя (admin only)
export const toggleUserActive = async (userId: number, isActive: boolean) => {
  const response = await api.patch(`/users/${userId}/active`, null, {
    params: { is_active: isActive }
  });
  return response.data;
};

// Изменить пароль пользователя (admin only)
export const changeUserPassword = async (userId: number, newPassword: string) => {
  const response = await api.patch(`/users/${userId}/password`, null, {
    params: { new_password: newPassword }
  });
  return response.data;
};

// Удалить пользователя (admin only)
export const deleteUser = async (userId: number) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

// ==================== INVENTORY ====================

// Переместить оборудование по серийному номеру
export const transferEquipment = async (serialNumber: string, toWarehouseId: number, notes?: string) => {
  const response = await api.post('/inventory/transfer', {
    serial_number: serialNumber,
    to_warehouse_id: toWarehouseId,
    notes
  });
  return response.data;
};

// Добавить материалы на склад
export const addStock = async (equipmentId: number, warehouseId: number, quantity: number, notes?: string) => {
  const response = await api.post('/inventory/add-stock', {
    equipment_id: equipmentId,
    warehouse_id: warehouseId,
    quantity,
    notes
  });
  return response.data;
};

// Списать материалы
export const writeOffStock = async (data: {
  equipment_id: number;
  warehouse_id: number;
  quantity: number;
  serial_number?: string;
  notes?: string;
}) => {
  const response = await api.post('/inventory/write-off', data);
  return response.data;
};

// История перемещений
export const listTransactions = async (limit?: number) => {
  const response = await api.get('/inventory/transactions', {
    params: { limit }
  });
  return response.data;
};

// Остатки на центральном складе
export const getCentralStock = async () => {
  const response = await api.get('/inventory/central-stock');
  return response.data;
};

// Остатки на складе
export const getWarehouseStock = async (warehouseId: number) => {
  const response = await api.get(`/warehouses/${warehouseId}/stock`);
  return response.data;
};

// ==================== EQUIPMENT WITH COUNTS ====================

// Получить список оборудования с количеством
export const listEquipmentWithCounts = async (search?: string) => {
  const params = search ? { search } : {};
  const response = await api.get('/equipment/with-counts/list', { params });
  return response.data;
};

// Получить распределение оборудования по складам
export const getEquipmentWarehouseDistribution = async (equipmentId: number) => {
  const response = await api.get(`/equipment/${equipmentId}/warehouse-distribution`);
  return response.data;
};

// ==================== ADVANCED SERIAL SEARCH ====================

// Расширенный поиск серийных номеров
export const searchSerialsAdvanced = async (params: {
  serial?: string;
  equipment_id?: number;
  warehouse_id?: number;
  status?: string;
  limit?: number;
}) => {
  const response = await api.get('/equipment/serials/search-advanced', { params });
  return response.data;
};

// ==================== BULK TRANSFER ====================

// Массовое перемещение по списку серийных номеров
export const bulkTransferEquipment = async (serialNumbers: string[], toWarehouseId: number, notes?: string) => {
  const response = await api.post('/inventory/bulk-transfer', {
    serial_numbers: serialNumbers,
    to_warehouse_id: toWarehouseId,
    notes
  });
  return response.data;
};
