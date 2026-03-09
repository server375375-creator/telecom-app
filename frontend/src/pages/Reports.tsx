import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getReports,
  getMyStock,
  getWorkObjects,
  createReport,
  cancelReport,
  deleteReport,
  getReportStats,
  exportReportsCsv,
  exportReportsExcel,
} from '../api/reports';
import type { ReportsFilter } from '../api/reports';
import { getUsers } from '../api/auth';
import type {
  WorkReport,
  WorkObject,
  TechnicianStock,
  TechnicianEquipmentItem,
  ReportStats,
  User,
} from '../types';
import { REPORT_STATUS_LABELS } from '../types';

type TabType = 'create' | 'list' | 'stats' | 'objects';

export function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  
  const [activeTab, setActiveTab] = useState<TabType>(isTechnician ? 'create' : 'list');
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [stock, setStock] = useState<TechnicianStock | null>(null);
  const [workObjects, setWorkObjects] = useState<WorkObject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Фильтры
  const [filterUserId, setFilterUserId] = useState<number | undefined>();
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // Форма создания отчета
  const [formData, setFormData] = useState({
    work_date: new Date().toISOString().slice(0, 16),
    work_object_id: 0,
    object_name: '',
    object_address: '',
    item_type: 'equipment' as 'equipment' | 'material',
    equipment_id: 0,
    serial_number_id: 0,
    material_id: 0,
    quantity: 1,
    notes: '',
  });
  
  // Выбранное оборудование (для фильтрации серийных номеров)
  const [selectedEquipment, setSelectedEquipment] = useState<TechnicianEquipmentItem | null>(null);
  
  // Модальное окно отмены
  const [cancelModal, setCancelModal] = useState<{ show: boolean; reportId: number; reason: string }>({
    show: false,
    reportId: 0,
    reason: '',
  });

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'create') {
        const [stockData, objectsData] = await Promise.all([
          getMyStock(),
          getWorkObjects(),
        ]);
        setStock(stockData);
        setWorkObjects(objectsData);
      } else if (activeTab === 'list') {
        await loadReports();
        if (isAdmin) {
          const usersData = await getUsers();
          setUsers(usersData);
        }
        const objectsData = await getWorkObjects();
        setWorkObjects(objectsData);
      } else if (activeTab === 'stats') {
        const statsData = await getReportStats(filterDateFrom, filterDateTo);
        setStats(statsData);
      } else if (activeTab === 'objects') {
        const objectsData = await getWorkObjects(false);
        setWorkObjects(objectsData);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    const filter: ReportsFilter = {};
    if (filterUserId) filter.user_id = filterUserId;
    if (filterDateFrom) filter.date_from = filterDateFrom;
    if (filterDateTo) filter.date_to = filterDateTo;
    if (filterStatus) filter.status = filterStatus;
    
    const reportsData = await getReports(Object.keys(filter).length > 0 ? filter : undefined);
    setReports(reportsData);
  };

  // Обработка выбора оборудования
  useEffect(() => {
    if (formData.equipment_id && stock) {
      const equip = stock.equipment.find(e => e.equipment_id === formData.equipment_id);
      setSelectedEquipment(equip || null);
      if (equip) {
        setFormData(prev => ({ ...prev, serial_number_id: equip.serial_id }));
      } else {
        setFormData(prev => ({ ...prev, serial_number_id: 0 }));
      }
    } else {
      setSelectedEquipment(null);
    }
  }, [formData.equipment_id, stock]);

  // Создание отчета
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (formData.item_type === 'equipment') {
      if (!formData.equipment_id || !formData.serial_number_id) {
        setError('Выберите оборудование и серийный номер');
        return;
      }
    } else {
      if (!formData.material_id) {
        setError('Выберите материал');
        return;
      }
      if (formData.quantity < 1) {
        setError('Количество должно быть не менее 1');
        return;
      }
    }
    
    setLoading(true);
    try {
      await createReport({
        work_date: formData.work_date,
        work_object_id: formData.work_object_id || undefined,
        object_name: formData.object_name || undefined,
        object_address: formData.object_address || undefined,
        equipment_id: formData.item_type === 'equipment' ? formData.equipment_id : undefined,
        serial_number_id: formData.item_type === 'equipment' ? formData.serial_number_id : undefined,
        material_id: formData.item_type === 'material' ? formData.material_id : undefined,
        quantity: formData.item_type === 'material' ? formData.quantity : 1,
        notes: formData.notes || undefined,
      });
      
      setSuccess('Отчет создан и материалы списаны со склада');
      
      // Обновляем остатки
      const stockData = await getMyStock();
      setStock(stockData);
      
      // Сбрасываем форму
      setFormData({
        work_date: new Date().toISOString().slice(0, 16),
        work_object_id: 0,
        object_name: '',
        object_address: '',
        item_type: 'equipment',
        equipment_id: 0,
        serial_number_id: 0,
        material_id: 0,
        quantity: 1,
        notes: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка создания отчета');
    } finally {
      setLoading(false);
    }
  };

  // Отмена отчета
  const handleCancel = async () => {
    setLoading(true);
    try {
      await cancelReport(cancelModal.reportId, cancelModal.reason || undefined);
      setCancelModal({ show: false, reportId: 0, reason: '' });
      await loadReports();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка отмены отчета');
    } finally {
      setLoading(false);
    }
  };

  // Удаление отчета
  const handleDelete = async (reportId: number) => {
    if (!confirm('Удалить этот отчет?')) return;
    setLoading(true);
    try {
      await deleteReport(reportId);
      await loadReports();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка удаления отчета');
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
          {isTechnician && (
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
          {isAdmin && (
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Статистика
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('objects')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'objects'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Объекты
            </button>
          )}
        </nav>
      </div>

      {loading && activeTab !== 'list' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      )}

      {/* === ТАБ: Создание отчета === */}
      {activeTab === 'create' && stock && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Новый отчет о выполненной работе</h2>
          
          {!stock.warehouse_id ? (
            <div className="text-yellow-600 bg-yellow-50 p-4 rounded-lg">
              У вас не назначен склад. Обратитесь к администратору для привязки склада.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Дата и время */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата и время работы
                </label>
                <input
                  type="datetime-local"
                  value={formData.work_date}
                  onChange={e => setFormData({ ...formData, work_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              {/* Объект */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Объект (из справочника)
                  </label>
                  <select
                    value={formData.work_object_id}
                    onChange={e => {
                      const objId = Number(e.target.value);
                      const obj = workObjects.find(o => o.id === objId);
                      setFormData({
                        ...formData,
                        work_object_id: objId,
                        object_name: obj?.name || '',
                        object_address: obj?.address || '',
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={0}>-- Выберите объект --</option>
                    {workObjects.map(obj => (
                      <option key={obj.id} value={obj.id}>
                        {obj.name} {obj.address ? `(${obj.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Или введите название объекта
                  </label>
                  <input
                    type="text"
                    value={formData.object_name}
                    onChange={e => setFormData({ ...formData, object_name: e.target.value, work_object_id: 0 })}
                    placeholder="Название объекта"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Адрес объекта
                </label>
                <input
                  type="text"
                  value={formData.object_address}
                  onChange={e => setFormData({ ...formData, object_address: e.target.value })}
                  placeholder="Адрес"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              {/* Тип ТМЦ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="equipment"
                      checked={formData.item_type === 'equipment'}
                      onChange={() => setFormData({ ...formData, item_type: 'equipment', equipment_id: 0, material_id: 0 })}
                      className="mr-2"
                    />
                    Оборудование (по серийному номеру)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="material"
                      checked={formData.item_type === 'material'}
                      onChange={() => setFormData({ ...formData, item_type: 'material', equipment_id: 0, material_id: 0 })}
                      className="mr-2"
                    />
                    Материал
                  </label>
                </div>
              </div>
              
              {/* Оборудование */}
              {formData.item_type === 'equipment' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Оборудование *
                    </label>
                    <select
                      value={formData.equipment_id}
                      onChange={e => setFormData({ ...formData, equipment_id: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value={0}>-- Выберите оборудование --</option>
                      {Object.entries(getGroupedEquipment()).map(([equipId, items]) => (
                        <option key={equipId} value={equipId}>
                          {items[0].name} ({items.length} шт. доступно)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedEquipment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Серийный номер *
                      </label>
                      <select
                        value={formData.serial_number_id}
                        onChange={e => setFormData({ ...formData, serial_number_id: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value={0}>-- Выберите серийный номер --</option>
                        {getGroupedEquipment()[formData.equipment_id]?.map(item => (
                          <option key={item.serial_id} value={item.serial_id}>
                            {item.serial_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {stock.equipment.length === 0 && (
                    <div className="text-yellow-600 bg-yellow-50 p-4 rounded-lg">
                      На вашем складе нет доступного оборудования
                    </div>
                  )}
                </>
              )}
              
              {/* Материалы */}
              {formData.item_type === 'material' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Материал *
                    </label>
                    <select
                      value={formData.material_id}
                      onChange={e => setFormData({ ...formData, material_id: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value={0}>-- Выберите материал --</option>
                      {stock.materials.map(mat => (
                        <option key={mat.material_id} value={mat.material_id}>
                          {mat.name} (доступно: {mat.quantity} {mat.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Количество *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={stock.materials.find(m => m.material_id === formData.material_id)?.quantity || 1}
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  
                  {stock.materials.length === 0 && (
                    <div className="text-yellow-600 bg-yellow-50 p-4 rounded-lg">
                      На вашем складе нет доступных материалов
                    </div>
                  )}
                </>
              )}
              
              {/* Примечание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Примечание
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Дополнительная информация"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Сохранение...' : 'Сохранить отчет'}
              </button>
            </form>
          )}
        </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Все</option>
                  <option value="submitted">Отправлен</option>
                  <option value="approved">Утвержден</option>
                  <option value="cancelled">Отменен</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={() => { setFilterUserId(undefined); setFilterDateFrom(''); setFilterDateTo(''); setFilterStatus(''); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Сбросить
              </button>
              <button
                onClick={() => loadReports()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Применить
              </button>
            </div>
          </div>
          
          {/* Экспорт */}
          <div className="flex justify-end space-x-2">
            <a
              href={exportReportsCsv({ user_id: filterUserId, date_from: filterDateFrom, date_to: filterDateTo })}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Экспорт CSV
            </a>
            <a
              href={exportReportsExcel({ user_id: filterUserId, date_from: filterDateFrom, date_to: filterDateTo })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Экспорт Excel
            </a>
          </div>
          
          {/* Таблица отчетов */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Монтажник</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Объект</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ТМЦ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Серийный номер</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Кол-во</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map(report => (
                  <tr key={report.id} className={report.status === 'cancelled' ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 text-sm text-gray-900">{report.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(report.work_date).toLocaleDateString('ru-RU')}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm text-gray-900">{report.username}</td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {report.object_name || '-'}
                      {report.object_address && (
                        <div className="text-xs text-gray-500">{report.object_address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {report.equipment_id ? (
                        <div>
                          <div>{report.equipment_name}</div>
                          <div className="text-xs text-gray-500">{report.equipment_material_number}</div>
                        </div>
                      ) : (
                        <div>
                          <div>{report.material_name}</div>
                          <div className="text-xs text-gray-500">{report.material_material_number}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{report.serial_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{report.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        report.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        report.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {REPORT_STATUS_LABELS[report.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      {isAdmin && report.status !== 'cancelled' && (
                        <button
                          onClick={() => setCancelModal({ show: true, reportId: report.id, reason: '' })}
                          className="text-yellow-600 hover:text-yellow-800"
                        >
                          Отменить
                        </button>
                      )}
                      {isAdmin && report.status === 'cancelled' && (
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Удалить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                      Нет отчетов
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === ТАБ: Статистика === */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Сводная статистика</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-indigo-600">{stats.total_reports}</div>
                <div className="text-sm text-gray-600">Всего отчетов</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.by_type.find(t => t.type === 'equipment')?.count || 0}
                </div>
                <div className="text-sm text-gray-600">Оборудования списано</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600">
                  {stats.by_type.find(t => t.type === 'material')?.count || 0}
                </div>
                <div className="text-sm text-gray-600">Материалов списано</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">По монтажникам</h3>
              {stats.by_user.length > 0 ? (
                <ul className="space-y-2">
                  {stats.by_user.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{item.username}</span>
                      <span className="font-semibold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Нет данных</p>
              )}
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">По объектам (топ-10)</h3>
              {stats.by_object.length > 0 ? (
                <ul className="space-y-2">
                  {stats.by_object.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate mr-2">{item.object_name}</span>
                      <span className="font-semibold whitespace-nowrap">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Нет данных</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === ТАБ: Объекты === */}
      {activeTab === 'objects' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Справочник объектов</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Адрес</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workObjects.map(obj => (
                <tr key={obj.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{obj.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{obj.address || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      obj.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {obj.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                </tr>
              ))}
              {workObjects.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    Нет объектов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно отмены */}
      {cancelModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Отмена отчета</h3>
            <p className="text-gray-600 mb-4">
              Отмена отчета вернет списанные материалы/оборудование на склад монтажника.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Причина отмены</label>
              <textarea
                value={cancelModal.reason}
                onChange={e => setCancelModal({ ...cancelModal, reason: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Укажите причину отмены"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCancelModal({ show: false, reportId: 0, reason: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Подтвердить отмену
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}