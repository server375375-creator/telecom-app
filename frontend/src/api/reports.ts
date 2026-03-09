import { api } from './client';
import type {
  WorkObject,
  WorkObjectCreate,
  WorkReport,
  WorkReportCreate,
  TechnicianStock,
  ReportStats,
} from '../types';

// ==================== СПРАВОЧНИК ОБЪЕКТОВ ====================

export const getWorkObjects = async (activeOnly: boolean = true): Promise<WorkObject[]> => {
  const response = await api.get('/api/reports/objects', {
    params: { active_only: activeOnly },
  });
  return response.data;
};

export const createWorkObject = async (data: WorkObjectCreate): Promise<WorkObject> => {
  const response = await api.post('/api/reports/objects', null, { params: data });
  return response.data;
};

export const updateWorkObject = async (
  objectId: number,
  data: Partial<WorkObjectCreate> & { is_active?: boolean }
): Promise<WorkObject> => {
  const response = await api.put(`/api/reports/objects/${objectId}`, null, { params: data });
  return response.data;
};

export const deleteWorkObject = async (objectId: number): Promise<void> => {
  await api.delete(`/api/reports/objects/${objectId}`);
};

// ==================== ОСТАТКИ НА СКЛАДЕ МОНТАЖНИКА ====================

export const getMyStock = async (): Promise<TechnicianStock> => {
  const response = await api.get('/api/reports/my-stock');
  return response.data;
};

// ==================== ОТЧЕТЫ ====================

export interface ReportsFilter {
  user_id?: number;
  date_from?: string;
  date_to?: string;
  status?: string;
  work_object_id?: number;
}

export const getReports = async (filter?: ReportsFilter): Promise<WorkReport[]> => {
  const response = await api.get('/api/reports', { params: filter });
  return response.data;
};

export const getReport = async (reportId: number): Promise<WorkReport> => {
  const response = await api.get(`/api/reports/${reportId}`);
  return response.data;
};

export const createReport = async (data: WorkReportCreate): Promise<{ id: number; status: string; message: string }> => {
  const response = await api.post('/api/reports', null, { params: data });
  return response.data;
};

export const cancelReport = async (
  reportId: number,
  reason?: string
): Promise<{ id: number; status: string; message: string }> => {
  const response = await api.post(`/api/reports/${reportId}/cancel`, null, {
    params: { reason },
  });
  return response.data;
};

export const deleteReport = async (reportId: number): Promise<void> => {
  await api.delete(`/api/reports/${reportId}`);
};

// ==================== ЭКСПОРТ ====================

export const exportReportsCsv = (filter?: ReportsFilter): string => {
  const params = new URLSearchParams();
  if (filter?.user_id) params.append('user_id', String(filter.user_id));
  if (filter?.date_from) params.append('date_from', filter.date_from);
  if (filter?.date_to) params.append('date_to', filter.date_to);
  
  const token = localStorage.getItem('token');
  const baseUrl = api.defaults.baseURL || '';
  return `${baseUrl}/api/reports/export/csv?${params.toString()}&token=${token}`;
};

export const exportReportsExcel = (filter?: ReportsFilter): string => {
  const params = new URLSearchParams();
  if (filter?.user_id) params.append('user_id', String(filter.user_id));
  if (filter?.date_from) params.append('date_from', filter.date_from);
  if (filter?.date_to) params.append('date_to', filter.date_to);
  
  const token = localStorage.getItem('token');
  const baseUrl = api.defaults.baseURL || '';
  return `${baseUrl}/api/reports/export/excel?${params.toString()}&token=${token}`;
};

// ==================== СТАТИСТИКА ====================

export const getReportStats = async (
  dateFrom?: string,
  dateTo?: string
): Promise<ReportStats> => {
  const response = await api.get('/api/reports/stats/summary', {
    params: { date_from: dateFrom, date_to: dateTo },
  });
  return response.data;
};