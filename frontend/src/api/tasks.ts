/**
 * API для работы с заявками (новая структура)
 */
import { api } from './client';

// Типы
export interface WorkType {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EquipmentItem {
  id: number;
  equipment_id: number | null;
  equipment_name: string | null;
  equipment_material_number: string | null;
  serial_number_id: number | null;
  serial_number: string | null;
  material_id: number | null;
  material_name: string | null;
  material_material_number: string | null;
  quantity: number;
}

export interface WorkItem {
  id: number;
  work_type_id: number;
  work_type_name: string;
  notes: string | null;
  equipment_items: EquipmentItem[];
}

export interface TaskPhoto {
  id: number;
  file_name: string;
  description: string | null;
  work_type_id: number | null;
  created_at: string;
}

export interface TaskRequest {
  id: number;
  user_id: number;
  username: string;
  task_number: string | null;
  account_number: string | null;
  subscriber_name: string | null;
  city: string | null;
  address: string | null;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  work_items: WorkItem[];
  photos: TaskPhoto[];
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

export interface TechnicianStock {
  warehouse_id: number | null;
  equipment: TechnicianEquipmentItem[];
  materials: TechnicianMaterialItem[];
}

export interface TaskFilter {
  status?: string;
  date_from?: string;
  date_to?: string;
  user_id?: number;
}

// API функции

// Виды работ
export async function getWorkTypes(activeOnly: boolean = true): Promise<WorkType[]> {
  const response = await api.get('/api/tasks/work-types', {
    params: { active_only: activeOnly }
  });
  return response.data;
}

// Остатки на складе
export async function getMyStockForTasks(): Promise<TechnicianStock> {
  const response = await api.get('/api/tasks/my-stock');
  return response.data;
}

// Список заявок
export async function getTasks(filter?: TaskFilter): Promise<TaskRequest[]> {
  const response = await api.get('/api/tasks', { params: filter });
  return response.data;
}

// Получить заявку
export async function getTask(taskId: number): Promise<TaskRequest> {
  const response = await api.get(`/api/tasks/${taskId}`);
  return response.data;
}

// Создать заявку
export interface CreateTaskData {
  task_number?: string;
  account_number?: string;
  subscriber_name?: string;
  city?: string;
  address?: string;
  priority?: string;
  notes?: string;
  work_items: {
    work_type_id: number;
    notes?: string;
    equipment_items?: {
      equipment_id?: number;
      serial_number_id?: number;
      material_id?: number;
      quantity?: number;
    }[];
  }[];
}

export async function createTask(data: CreateTaskData): Promise<{ id: number; status: string; message: string }> {
  const formData = new FormData();
  
  if (data.task_number) formData.append('task_number', data.task_number);
  if (data.account_number) formData.append('account_number', data.account_number);
  if (data.subscriber_name) formData.append('subscriber_name', data.subscriber_name);
  if (data.city) formData.append('city', data.city);
  if (data.address) formData.append('address', data.address);
  formData.append('priority', data.priority || 'Обычный');
  if (data.notes) formData.append('notes', data.notes);
  formData.append('work_items', JSON.stringify(data.work_items));
  
  const response = await api.post('/api/tasks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

// Обновить статус заявки
export async function updateTaskStatus(taskId: number, status: string, notes?: string): Promise<{ updated: boolean }> {
  const formData = new FormData();
  formData.append('status', status);
  if (notes) formData.append('notes', notes);
  
  const response = await api.put(`/api/tasks/${taskId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

// Удалить заявку
export async function deleteTask(taskId: number): Promise<{ deleted: boolean }> {
  const response = await api.delete(`/api/tasks/${taskId}`);
  return response.data;
}

// Загрузить фото
export async function uploadPhoto(
  taskId: number,
  file: File,
  workTypeId?: number,
  description?: string
): Promise<{ id: number; file_name: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (workTypeId) formData.append('work_type_id', String(workTypeId));
  if (description) formData.append('description', description);
  
  const response = await api.post(`/api/tasks/${taskId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

// Получить URL фото
export function getPhotoUrl(taskId: number, photoId: number): string {
  return `/api/tasks/${taskId}/photos/${photoId}`;
}

// Удалить фото
export async function deletePhoto(taskId: number, photoId: number): Promise<{ deleted: boolean }> {
  const response = await api.delete(`/api/tasks/${taskId}/photos/${photoId}`);
  return response.data;
}

// Экспорт
export async function exportTasksCsv(filter?: TaskFilter): Promise<void> {
  const response = await api.get('/api/tasks/export/csv', {
    params: filter,
    responseType: 'blob'
  });
  
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'tasks.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportTasksExcel(filter?: TaskFilter): Promise<void> {
  const response = await api.get('/api/tasks/export/excel', {
    params: filter,
    responseType: 'blob'
  });
  
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'tasks.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}