import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getTasks,
  getWorkTypes,
  getMyStockForTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  uploadPhoto,
  deletePhoto,
  getPhotoUrl,
  exportTasksCsv,
  exportTasksExcel,
} from '../api/tasks';
import { getUsers } from '../api/auth';
import type {
  TaskRequest,
  WorkType,
  TechnicianStock,
  TechnicianEquipmentItem,
} from '../api/tasks';
import type { User } from '../types';

type TabType = 'create' | 'list';

// Внутренний тип для вида работ в форме
interface WorkItemForm {
  id: string;
  work_type_id: number;
  notes: string;
  equipment_items: {
    id: string;
    type: 'equipment' | 'material';
    equipment_id: number;
    serial_number_id: number;
    material_id: number;
    quantity: number;
  }[];
}

// Статусы
const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

const PRIORITIES = ['Обычный', 'Повышенный', 'Срочный'];

export function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  
  const [activeTab, setActiveTab] = useState<TabType>(isTechnician ? 'create' : 'list');
  const [tasks, setTasks] = useState<TaskRequest[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [stock, setStock] = useState<TechnicianStock | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Фильтры
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterUserId, setFilterUserId] = useState<number | undefined>();
  
  // Форма создания отчета
  const [formData, setFormData] = useState({
    task_number: '',
    account_number: '',
    subscriber_name: '',
    city: '',
    address: '',
    priority: 'Обычный',
    notes: '',
  });
  
  // Виды работ в отчете
  const [workItems, setWorkItems] = useState<WorkItemForm[]>([
    { id: '1', work_type_id: 0, notes: '', equipment_items: [] }
  ]);
  
  // Модальное окно просмотра отчета
  const [viewTask, setViewTask] = useState<TaskRequest | null>(null);
  
  // Загрузка фото
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoTaskId, setPhotoTaskId] = useState<number | null>(null);
  
  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'create') {
        const [typesData, stockData] = await Promise.all([
          getWorkTypes(),
          getMyStockForTasks(),
        ]);
        setWorkTypes(typesData);
        setStock(stockData);
      } else if (activeTab === 'list') {
        const filter: any = {};
        if (filterStatus) filter.status = filterStatus;
        if (filterDateFrom) filter.date_from = filterDateFrom;
        if (filterDateTo) filter.date_to = filterDateTo;
        if (filterUserId) filter.user_id = filterUserId;
        
        const tasksData = await getTasks(Object.keys(filter).length > 0 ? filter : undefined);
        setTasks(tasksData);
        
        if (isAdmin) {
          const usersData = await getUsers();
          setUsers(usersData);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };
  
  // Группировка оборудования по наименованию
  const getGroupedEquipment = () => {
    if (!stock?.equipment) return {};
    const groups: Record<number, TechnicianEquipmentItem[]> = {};
    stock.equipment.forEach(item => {
      if (!groups[item.equipment_id]) {
        groups[item.equipment_id] = [];
      }
      groups[item.equipment_id].push(item);
    });
    return groups;
  };
  
  // Получить серийные номера для выбранного оборудования
  const getSerialNumbers = (equipmentId: number) => {
    return stock?.equipment.filter(e => e.equipment_id === equipmentId) || [];
  };
  
  // Добавить вид работ
  const addWorkItem = () => {
    setWorkItems([
      ...workItems,
      { id: Date.now().toString(), work_type_id: 0, notes: '', equipment_items: [] }
    ]);
  };
  
  // Удалить вид работ
  const removeWorkItem = (id: string) => {
    if (workItems.length > 1) {
      setWorkItems(workItems.filter(wi => wi.id !== id));
    }
  };
  
  // Обновить вид работ
  const updateWorkItem = (id: string, field: 'work_type_id' | 'notes', value: any) => {
    setWorkItems(workItems.map(wi => 
      wi.id === id ? { ...wi, [field]: value } : wi
    ));
  };
  
  // Добавить позицию в вид работ
  const addEquipmentItem = (workItemId: string, type: 'equipment' | 'material') => {
    setWorkItems(workItems.map(wi => {
      if (wi.id === workItemId) {
        return {
          ...wi,
          equipment_items: [
            ...wi.equipment_items,
            {
              id: Date.now().toString(),
              type,
              equipment_id: 0,
              serial_number_id: 0,
              material_id: 0,
              quantity: 1,
            }
          ]
        };
      }
      return wi;
    }));
  };
  
  // Удалить позицию из вида работ
  const removeEquipmentItem = (workItemId: string, itemId: string) => {
    setWorkItems(workItems.map(wi => {
      if (wi.id === workItemId) {
        return {
          ...wi,
          equipment_items: wi.equipment_items.filter(ei => ei.id !== itemId)
        };
      }
      return wi;
    }));
  };
  
  // Обновить позицию
  const updateEquipmentItem = (workItemId: string, itemId: string, field: string, value: any) => {
    setWorkItems(workItems.map(wi => {
      if (wi.id === workItemId) {
        return {
          ...wi,
          equipment_items: wi.equipment_items.map(ei => {
            if (ei.id === itemId) {
              const updated = { ...ei, [field]: value };
              if (field === 'equipment_id') {
                updated.serial_number_id = 0;
              }
              return updated;
            }
            return ei;
          })
        };
      }
      return wi;
    }));
  };
  
  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    const validWorkItems = workItems.filter(wi => wi.work_type_id > 0);
    if (validWorkItems.length === 0) {
      setError('Выберите хотя бы один вид работ');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await createTask({
        ...formData,
        work_items: validWorkItems.map(wi => ({
          work_type_id: wi.work_type_id,
          notes: wi.notes || undefined,
          equipment_items: wi.equipment_items
            .filter(ei => (ei.type === 'equipment' && ei.serial_number_id > 0) || (ei.type === 'material' && ei.material_id > 0))
            .map(ei => ({
              equipment_id: ei.type === 'equipment' ? ei.equipment_id || undefined : undefined,
              serial_number_id: ei.type === 'equipment' ? ei.serial_number_id || undefined : undefined,
              material_id: ei.type === 'material' ? ei.material_id || undefined : undefined,
              quantity: ei.type === 'material' ? ei.quantity : 1,
            })),
        })),
      });
      
      setSuccess(`Отчет #${result.id} создан успешно!`);
      
      // Сбрасываем форму
      setFormData({
        task_number: '',
        account_number: '',
        subscriber_name: '',
        city: '',
        address: '',
        priority: 'Обычный',
        notes: '',
      });
      setWorkItems([{ id: '1', work_type_id: 0, notes: '', equipment_items: [] }]);
      
      // Обновляем остатки
      const stockData = await getMyStockForTasks();
      setStock(stockData);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка создания отчета');
    } finally {
      setLoading(false);
    }
  };
  
  // Удаление отчета
  const handleDelete = async (taskId: number) => {
    if (!confirm('Удалить этот отчет?')) return;
    
    try {
      await deleteTask(taskId);
      await loadData();
      setSuccess('Отчет удален');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка удаления');
    }
  };
  
  // Изменение статуса
  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await updateTaskStatus(taskId, status);
      await loadData();
      setSuccess('Статус обновлен');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка обновления статуса');
    }
  };
  
  // Загрузка фото
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoTaskId) return;
    
    setUploadingPhoto(true);
    try {
      await uploadPhoto(photoTaskId, file);
      const updatedTask = await getTask(photoTaskId);
      setTasks(tasks.map(t => t.id === photoTaskId ? updatedTask : t));
      if (viewTask?.id === photoTaskId) {
        setViewTask(updatedTask);
      }
      setSuccess('Фото загружено');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки фото');
    } finally {
      setUploadingPhoto(false);
      setPhotoTaskId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Удаление фото
  const handlePhotoDelete = async (taskId: number, photoId: number) => {
    if (!confirm('Удалить это фото?')) return;
    
    try {
      await deletePhoto(taskId, photoId);
      const updatedTask = await getTask(taskId);
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      if (viewTask?.id === taskId) {
        setViewTask(updatedTask);
      }
      setSuccess('Фото удалено');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка удаления фото');
    }
  };
  
  // Экспорт
  const handleExportCsv = async () => {
    try {
      const filter: any = {};
      if (filterStatus) filter.status = filterStatus;
      if (filterDateFrom) filter.date_from = filterDateFrom;
      if (filterDateTo) filter.date_to = filterDateTo;
      if (filterUserId) filter.user_id = filterUserId;
      await exportTasksCsv(filter);
    } catch (err: any) {
      setError('Ошибка экспорта: ' + (err.message || 'Неизвестная ошибка'));
    }
  };
  
  const handleExportExcel = async () => {
    try {
      const filter: any = {};
      if (filterStatus) filter.status = filterStatus;
      if (filterDateFrom) filter.date_from = filterDateFrom;
      if (filterDateTo) filter.date_to = filterDateTo;
      if (filterUserId) filter.user_id = filterUserId;
      await exportTasksExcel(filter);
    } catch (err: any) {
      setError('Ошибка экспорта: ' + (err.message || 'Неизвестная ошибка'));
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Отчеты монтажников</h1>
      
      {/* Уведомления */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      
      {/* Табы */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(isTechnician || isAdmin) && (
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Создать отчет
            </button>
          )}
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {isTechnician ? 'Мои отчеты' : 'Все отчеты'}
          </button>
        </nav>
      </div>
      
      {/* Скрытый input для загрузки фото */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
      
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      )}
      
      {/* === ТАБ: Создание отчета === */}
      {activeTab === 'create' && !loading && stock && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Данные отчета</h2>
            
            {!stock.warehouse_id ? (
              <div className="text-yellow-600 bg-yellow-50 p-4 rounded-lg">
                У вас не назначен склад. Обратитесь к администратору.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">№ Таска</label>
                  <input
                    type="text"
                    value={formData.task_number}
                    onChange={e => setFormData({ ...formData, task_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Номер таска"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Лицевой счет</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Лицевой счет"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ФИО абонента</label>
                  <input
                    type="text"
                    value={formData.subscriber_name}
                    onChange={e => setFormData({ ...formData, subscriber_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="ФИО"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Город"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Адрес"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {stock.warehouse_id && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Дополнительная информация"
                />
              </div>
            )}
          </div>
          
          {/* Виды работ */}
          {stock.warehouse_id && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Виды работ</h2>
                <button
                  type="button"
                  onClick={addWorkItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  + Добавить вид работ
                </button>
              </div>
              
              {workItems.map((workItem, index) => (
                <div key={workItem.id} className="bg-white shadow rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium">Вид работ #{index + 1}</h3>
                    {workItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWorkItem(workItem.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ✕ Удалить
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Вид работ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={workItem.work_type_id}
                        onChange={e => updateWorkItem(workItem.id, 'work_type_id', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        required
                      >
                        <option value={0}>-- Выберите вид работ --</option>
                        {workTypes.map(wt => (
                          <option key={wt.id} value={wt.id}>{wt.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
                      <input
                        type="text"
                        value={workItem.notes}
                        onChange={e => updateWorkItem(workItem.id, 'notes', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Доп. информация"
                      />
                    </div>
                  </div>
                  
                  {/* Оборудование и материалы */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">Оборудование и материалы</span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => addEquipmentItem(workItem.id, 'equipment')}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                        >
                          + Оборудование
                        </button>
                        <button
                          type="button"
                          onClick={() => addEquipmentItem(workItem.id, 'material')}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                        >
                          + Материал
                        </button>
                      </div>
                    </div>
                    
                    {workItem.equipment_items.length > 0 ? (
                      <div className="space-y-2">
                        {workItem.equipment_items.map(item => (
                          <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                              {item.type === 'equipment' ? (
                                <>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Оборудование</label>
                                    <select
                                      value={item.equipment_id}
                                      onChange={e => updateEquipmentItem(workItem.id, item.id, 'equipment_id', Number(e.target.value))}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    >
                                      <option value={0}>-- Выберите --</option>
                                      {Object.entries(getGroupedEquipment()).map(([eqId, items]) => (
                                        <option key={eqId} value={eqId}>
                                          {items[0].name} ({items.length} шт.)
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Серийный номер</label>
                                    <select
                                      value={item.serial_number_id}
                                      onChange={e => updateEquipmentItem(workItem.id, item.id, 'serial_number_id', Number(e.target.value))}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                      disabled={!item.equipment_id}
                                    >
                                      <option value={0}>-- Выберите --</option>
                                      {getSerialNumbers(item.equipment_id).map(sn => (
                                        <option key={sn.serial_id} value={sn.serial_id}>
                                          {sn.serial_number}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Материал</label>
                                    <select
                                      value={item.material_id}
                                      onChange={e => updateEquipmentItem(workItem.id, item.id, 'material_id', Number(e.target.value))}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    >
                                      <option value={0}>-- Выберите --</option>
                                      {stock?.materials.map(m => (
                                        <option key={m.material_id} value={m.material_id}>
                                          {m.name} ({m.quantity} {m.unit})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Количество</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={stock?.materials.find(m => m.material_id === item.material_id)?.quantity || 1}
                                      value={item.quantity}
                                      onChange={e => updateEquipmentItem(workItem.id, item.id, 'quantity', Number(e.target.value))}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                  </div>
                                </>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => removeEquipmentItem(workItem.id, item.id)}
                                className="text-red-500 hover:text-red-700 text-sm py-1"
                              >
                                ✕ Удалить
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">Добавьте оборудование или материалы (не обязательно)</p>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Сохранение...' : 'Создать отчет'}
              </button>
            </div>
          )}
        </form>
      )}
      
      {/* === ТАБ: Список отчетов === */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Фильтры */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Монтажник</label>
                  <select
                    value={filterUserId || ''}
                    onChange={e => setFilterUserId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Все</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Все</option>
                  <option value="new">Новая</option>
                  <option value="in_progress">В работе</option>
                  <option value="completed">Завершена</option>
                  <option value="cancelled">Отменена</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата с</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата по</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              <button
                type="button"
                onClick={() => { setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterUserId(undefined); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={() => loadData()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Применить
              </button>
            </div>
          </div>
          
          {/* Экспорт */}
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Экспорт CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Экспорт Excel
            </button>
          </div>
          
          {/* Список отчетов */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
              Нет отчетов
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="bg-white shadow rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-lg">#{task.id}</span>
                        {task.task_number && (
                          <span className="text-gray-500">Таск: {task.task_number}</span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                        {task.priority !== 'Обычный' && (
                          <span className={`px-2 py-1 text-xs rounded ${
                            task.priority === 'Срочный' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        {task.subscriber_name && <span className="mr-4">👤 {task.subscriber_name}</span>}
                        {task.account_number && <span className="mr-4">📋 ЛС: {task.account_number}</span>}
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-600">
                        📍 {task.city && `${task.city}, `}{task.address || 'Адрес не указан'}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {task.work_items.map((wi) => (
                          <span key={wi.id} className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {wi.work_type_name}
                            {wi.equipment_items.length > 0 && ` (${wi.equipment_items.length} поз.)`}
                          </span>
                        ))}
                      </div>
                      
                      {task.photos.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          📷 {task.photos.length} фото
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(task.created_at).toLocaleString('ru-RU')}
                        {isAdmin && ` • ${task.username}`}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => setViewTask(task)}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm"
                      >
                        Подробнее
                      </button>
                      
                      {isAdmin && (
                        <>
                          <select
                            value={task.status}
                            onChange={e => handleStatusChange(task.id, e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="new">Новая</option>
                            <option value="in_progress">В работе</option>
                            <option value="completed">Завершена</option>
                            <option value="cancelled">Отменена</option>
                          </select>
                          
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Модальное окно просмотра отчета */}
      {viewTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Отчет #{viewTask.id}</h2>
                <button
                  onClick={() => setViewTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {/* Информация об отчете */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {viewTask.task_number && (
                  <div>
                    <span className="text-xs text-gray-500">№ Таска</span>
                    <div className="font-medium">{viewTask.task_number}</div>
                  </div>
                )}
                {viewTask.account_number && (
                  <div>
                    <span className="text-xs text-gray-500">Лицевой счет</span>
                    <div className="font-medium">{viewTask.account_number}</div>
                  </div>
                )}
                {viewTask.subscriber_name && (
                  <div>
                    <span className="text-xs text-gray-500">ФИО абонента</span>
                    <div className="font-medium">{viewTask.subscriber_name}</div>
                  </div>
                )}
                {viewTask.city && (
                  <div>
                    <span className="text-xs text-gray-500">Город</span>
                    <div className="font-medium">{viewTask.city}</div>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500">Адрес</span>
                  <div className="font-medium">{viewTask.address || '-'}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Приоритет</span>
                  <div className="font-medium">{viewTask.priority}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Статус</span>
                  <div className="font-medium">{STATUS_LABELS[viewTask.status]}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Создан</span>
                  <div className="font-medium">{new Date(viewTask.created_at).toLocaleString('ru-RU')}</div>
                </div>
                {isAdmin && (
                  <div>
                    <span className="text-xs text-gray-500">Монтажник</span>
                    <div className="font-medium">{viewTask.username}</div>
                  </div>
                )}
              </div>
              
              {viewTask.notes && (
                <div className="mb-6">
                  <span className="text-xs text-gray-500">Примечания</span>
                  <div className="bg-gray-50 p-3 rounded mt-1">{viewTask.notes}</div>
                </div>
              )}
              
              {/* Виды работ */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Виды работ</h3>
                {viewTask.work_items.map(wi => (
                  <div key={wi.id} className="bg-gray-50 p-3 rounded mb-2">
                    <div className="font-medium">{wi.work_type_name}</div>
                    {wi.notes && <div className="text-sm text-gray-500">{wi.notes}</div>}
                    
                    {wi.equipment_items.length > 0 && (
                      <div className="mt-2 text-sm">
                        <div className="text-gray-500 mb-1">Использовано:</div>
                        <ul className="list-disc list-inside">
                          {wi.equipment_items.map(ei => (
                            <li key={ei.id}>
                              {ei.equipment_name || ei.material_name}
                              {ei.serial_number && ` (S/N: ${ei.serial_number})`}
                              {ei.material_id && ` - ${ei.quantity} шт.`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Фото */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Фото ({viewTask.photos.length})</h3>
                  <button
                    onClick={() => {
                      setPhotoTaskId(viewTask.id);
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingPhoto}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploadingPhoto ? 'Загрузка...' : '+ Добавить фото'}
                  </button>
                </div>
                
                {viewTask.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {viewTask.photos.map(photo => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={getPhotoUrl(viewTask.id, photo.id)}
                          alt={photo.file_name || 'Фото'}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handlePhotoDelete(viewTask.id, photo.id)}
                            className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                        {photo.description && (
                          <div className="text-xs text-gray-500 mt-1">{photo.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Нет фото</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Функция для получения заявки по ID (добавлена для загрузки фото)
async function getTask(taskId: number): Promise<TaskRequest> {
  const { api } = await import('../api/client');
  const response = await api.get(`/api/tasks/${taskId}`);
  return response.data;
}