import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  createEquipment, 
  listSerialNumbers, 
  addSerialNumber,
  searchBySerialNumber,
  updateSerialStatus,
  listEquipmentWithCounts,
  getEquipmentWarehouseDistribution
} from '../api/equipment';
import { listWarehouses } from '../api/warehouses';
import type { Equipment, SerialNumber, SerialNumberCreate, Warehouse } from '../types';
import { SERIAL_STATUS_LABELS } from '../types';

interface EquipmentWithCounts extends Equipment {
  total_count: number;
  serial_count: number;
  available_count: number;
  in_use_count: number;
  defective_count: number;
  stock_quantity: number;
}

interface WarehouseDistribution {
  warehouse_id: number;
  warehouse_name: string;
  is_central: boolean;
  serial_count: number;
  available_count: number;
  in_use_count: number;
  defective_count: number;
  stock_quantity: number;
}

export const EquipmentPage = () => {
  const { isAdmin } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serialSearch, setSerialSearch] = useState('');
  const [foundSerial, setFoundSerial] = useState<SerialNumber | null>(null);
  
  // Модальные окна
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showAddSerial, setShowAddSerial] = useState<number | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithCounts | null>(null);
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseDistribution, setWarehouseDistribution] = useState<WarehouseDistribution[]>([]);
  
  // Формы
  const [newEquipment, setNewEquipment] = useState({
    material_number: '',
    name: '',
    description: '',
    category: '',
    unit: 'шт'
  });
  const [newSerial, setNewSerial] = useState<SerialNumberCreate>({
    equipment_id: 0,
    serial_number: '',
    warehouse_id: undefined,
    status: 'available',
    notes: ''
  });

  // Загрузка оборудования с количеством
  const loadEquipment = async () => {
    setLoading(true);
    try {
      const data = await listEquipmentWithCounts(search);
      setEquipment(data);
    } catch (err) {
      console.error('Failed to load equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
    loadWarehouses();
  }, [search]);

  // Загрузка складов
  const loadWarehouses = async () => {
    try {
      const data = await listWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  // Поиск по серийному номеру
  const handleSerialSearch = async () => {
    if (!serialSearch.trim()) return;
    try {
      const result = await searchBySerialNumber(serialSearch.trim());
      setFoundSerial(result);
    } catch (err) {
      setFoundSerial(null);
      alert('Серийный номер не найден');
    }
  };

  // Создание оборудования
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEquipment(newEquipment);
      setShowAddEquipment(false);
      setNewEquipment({ material_number: '', name: '', description: '', category: '', unit: 'шт' });
      loadEquipment();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка создания');
    }
  };

  // Загрузка серийных номеров
  const loadSerials = async (equipmentId: number) => {
    try {
      const data = await listSerialNumbers(equipmentId);
      setSerials(data);
    } catch (err) {
      console.error('Failed to load serials:', err);
    }
  };

  // Загрузка распределения по складам
  const loadWarehouseDistribution = async (equipmentId: number) => {
    try {
      const data = await getEquipmentWarehouseDistribution(equipmentId);
      setWarehouseDistribution(data);
    } catch (err) {
      console.error('Failed to load warehouse distribution:', err);
    }
  };

  // Показать детали оборудования
  const handleShowDetails = (eq: EquipmentWithCounts) => {
    setSelectedEquipment(eq);
    loadSerials(eq.id);
    loadWarehouseDistribution(eq.id);
  };

  // Добавление серийного номера
  const handleAddSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddSerial) return;
    try {
      await addSerialNumber(showAddSerial, newSerial);
      setNewSerial({ equipment_id: 0, serial_number: '', status: 'available', notes: '' });
      setShowAddSerial(null);
      loadSerials(showAddSerial);
      loadEquipment();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка добавления');
    }
  };

  // Изменение статуса серийника
  const handleStatusChange = async (serialId: number, status: string) => {
    try {
      await updateSerialStatus(serialId, status);
      if (selectedEquipment) {
        loadSerials(selectedEquipment.id);
        loadWarehouseDistribution(selectedEquipment.id);
        loadEquipment();
      }
    } catch (err) {
      alert('Ошибка обновления статуса');
    }
  };

  // Статистика
  const totalEquipment = equipment.length;
  const totalItems = equipment.reduce((sum, eq) => sum + eq.total_count, 0);
  const availableItems = equipment.reduce((sum, eq) => sum + eq.available_count, 0);
  const defectiveItems = equipment.reduce((sum, eq) => sum + eq.defective_count, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-2xl">📡</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Оборудование</h1>
            <p className="text-sm text-slate-500">Учёт оборудования с серийными номерами</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddEquipment(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-indigo-200 transition-all font-medium flex items-center gap-2"
          >
            <span className="text-lg">+</span> Добавить оборудование
          </button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-indigo-700">{totalEquipment}</div>
              <div className="text-sm text-indigo-600 font-medium">Видов оборудования</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-200/50 flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-emerald-700">{totalItems}</div>
              <div className="text-sm text-emerald-600 font-medium">Всего единиц</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-200/50 flex items-center justify-center">
              <span className="text-xl">📦</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-700">{availableItems}</div>
              <div className="text-sm text-blue-600 font-medium">Доступно</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-200/50 flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-5 border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-rose-700">{defectiveItems}</div>
              <div className="text-sm text-rose-600 font-medium">Брак</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-200/50 flex items-center justify-center">
              <span className="text-xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Поиск */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или номеру материала..."
            className="w-full px-4 py-3 pl-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔢</span>
            <input
              type="text"
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSerialSearch()}
              placeholder="Поиск по серийному номеру..."
              className="w-full px-4 py-3 pl-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white shadow-sm"
            />
          </div>
          <button
            onClick={handleSerialSearch}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-green-200 transition-all font-medium"
          >
            Найти
          </button>
        </div>
      </div>

      {/* Результат поиска по серийнику */}
      {foundSerial && (
        <div className="mb-6 p-5 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✅</span>
            <h3 className="font-bold text-emerald-800">Серийный номер найден</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 rounded-xl p-3">
              <span className="text-xs text-slate-500 block mb-1">Серийный номер</span>
              <p className="font-bold text-slate-800 font-mono">{foundSerial.serial_number}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <span className="text-xs text-slate-500 block mb-1">Оборудование</span>
              <p className="font-semibold text-slate-800">{foundSerial.equipment?.name}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <span className="text-xs text-slate-500 block mb-1">Номер материала</span>
              <p className="font-semibold text-slate-800 font-mono">{foundSerial.equipment?.material_number}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <span className="text-xs text-slate-500 block mb-1">Статус</span>
              <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold ${
                foundSerial.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                foundSerial.status === 'in_use' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {SERIAL_STATUS_LABELS[foundSerial.status]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Список оборудования */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-4 text-slate-500 font-medium">Загрузка оборудования...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Номер материала
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Всего
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Доступно
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    В работе
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Брак
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipment.map((eq, idx) => (
                  <tr 
                    key={eq.id} 
                    className={`hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/50 cursor-pointer transition-all ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                    onClick={() => handleShowDetails(eq)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                        {eq.material_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{eq.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {eq.category ? (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm">
                          {eq.category}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-200">
                        {eq.total_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200">
                        {eq.available_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-xl text-sm font-bold border border-blue-200">
                        {eq.in_use_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                        eq.defective_count > 0 
                          ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {eq.defective_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <button
                          onClick={() => setShowAddSerial(eq.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-gradient-to-r hover:from-emerald-500 hover:to-green-500 bg-emerald-50 rounded-lg transition-all shadow-sm hover:shadow-md"
                        >
                          + Серийник
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {equipment.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-6xl mb-4">📡</div>
              <p className="text-lg font-medium">Оборудование не найдено</p>
              <p className="text-sm mt-1">Добавьте первое оборудование для начала работы</p>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно: Детали оборудования */}
      {selectedEquipment && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedEquipment.name}</h2>
                  <p className="text-blue-100 mt-1">
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{selectedEquipment.material_number}</span>
                    {selectedEquipment.category && <span className="ml-2">• {selectedEquipment.category}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEquipment(null)}
                  className="text-white/80 hover:text-white text-2xl leading-none hover:bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Stats */}
              <div className="flex gap-4 mt-6">
                <div className="bg-white/20 backdrop-blur rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold">{selectedEquipment.total_count}</div>
                  <div className="text-sm text-blue-100">Всего</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold text-green-300">{selectedEquipment.available_count}</div>
                  <div className="text-sm text-blue-100">Доступно</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold text-cyan-300">{selectedEquipment.in_use_count}</div>
                  <div className="text-sm text-blue-100">В работе</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold text-red-300">{selectedEquipment.defective_count}</div>
                  <div className="text-sm text-blue-100">Брак</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Распределение по складам */}
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">🏭</span>
                  Распределение по складам
                </h3>
                {warehouseDistribution.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400">
                    Нет данных о распределении
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Склад</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Серийников</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Доступно</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">В работе</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Брак</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {warehouseDistribution.map((wd) => (
                          <tr key={wd.warehouse_id} className={wd.is_central ? 'bg-indigo-50' : 'bg-white'}>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-800">{wd.warehouse_name}</span>
                              {wd.is_central && (
                                <span className="ml-2 text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-medium">
                                  Центральный
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{wd.serial_count}</td>
                            <td className="px-4 py-3 text-center text-emerald-600 font-semibold">{wd.available_count}</td>
                            <td className="px-4 py-3 text-center text-blue-600 font-semibold">{wd.in_use_count}</td>
                            <td className="px-4 py-3 text-center text-red-600 font-semibold">{wd.defective_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Серийные номера */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">🔢</span>
                  Серийные номера
                </h3>
                {serials.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400">
                    Серийные номера не добавлены
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Серийный номер</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Склад</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Статус</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Примечания</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {serials.map((s) => (
                          <tr key={s.id} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-sm font-medium text-slate-800">{s.serial_number}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {warehouses.find(w => w.id === s.warehouse_id)?.name || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={s.status}
                                onChange={(e) => handleStatusChange(s.id, e.target.value)}
                                className={`text-sm border rounded-lg px-3 py-1.5 font-medium ${
                                  s.status === 'available' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                  s.status === 'in_use' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-red-50 border-red-200 text-red-700'
                                }`}
                                disabled={!isAdmin}
                              >
                                {Object.entries(SERIAL_STATUS_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">{s.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Добавить оборудование */}
      {showAddEquipment && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white">
              <h2 className="text-2xl font-bold">📡 Новое оборудование</h2>
              <p className="text-blue-100 mt-1">Создание типа оборудования</p>
            </div>
            <form onSubmit={handleCreateEquipment}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Номер материала *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEquipment.material_number}
                      onChange={(e) => setNewEquipment({...newEquipment, material_number: e.target.value})}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50"
                      placeholder="MAT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Ед. измерения
                    </label>
                    <input
                      type="text"
                      value={newEquipment.unit}
                      onChange={(e) => setNewEquipment({...newEquipment, unit: e.target.value})}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEquipment.name}
                    onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50"
                    placeholder="Название оборудования"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Категория
                  </label>
                  <input
                    type="text"
                    value={newEquipment.category}
                    onChange={(e) => setNewEquipment({...newEquipment, category: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50"
                    placeholder="Роутеры, Коммутаторы..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Описание
                  </label>
                  <textarea
                    value={newEquipment.description}
                    onChange={(e) => setNewEquipment({...newEquipment, description: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50"
                    rows={3}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddEquipment(false)}
                  className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg transition-all font-semibold"
                >
                  Создать оборудование
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Добавить серийный номер */}
      {showAddSerial && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white">
              <h2 className="text-2xl font-bold">🔢 Добавить серийный номер</h2>
              <p className="text-emerald-100 mt-1">Регистрация нового серийного номера</p>
            </div>
            <form onSubmit={handleAddSerial}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Серийный номер *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSerial.serial_number}
                    onChange={(e) => setNewSerial({...newSerial, serial_number: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50 font-mono"
                    placeholder="SN123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Склад
                  </label>
                  <select
                    value={newSerial.warehouse_id || ''}
                    onChange={(e) => setNewSerial({...newSerial, warehouse_id: e.target.value ? Number(e.target.value) : undefined})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50"
                  >
                    <option value="">Не выбран</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '(Центральный)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Статус
                  </label>
                  <select
                    value={newSerial.status}
                    onChange={(e) => setNewSerial({...newSerial, status: e.target.value as any})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50"
                  >
                    {Object.entries(SERIAL_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Примечания
                  </label>
                  <textarea
                    value={newSerial.notes}
                    onChange={(e) => setNewSerial({...newSerial, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50"
                    rows={2}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddSerial(null)}
                  className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 shadow-lg transition-all font-semibold"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};