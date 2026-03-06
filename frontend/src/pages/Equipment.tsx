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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#14121F] mb-1">Оборудование</h1>
          <p className="text-[#4A4858]">Учёт оборудования с серийными номерами</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddEquipment(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14121F] text-white font-medium shadow-lg hover:bg-[#2A2838] transition-all"
          >
            <span className="text-lg">+</span> Добавить оборудование
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{totalEquipment}</div>
              <div className="text-sm text-[#4A4858] font-medium">Видов оборудования</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">📋</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{totalItems}</div>
              <div className="text-sm text-[#4A4858] font-medium">Всего единиц</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">📦</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{availableItems}</div>
              <div className="text-sm text-[#4A4858] font-medium">Доступно</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{defectiveItems}</div>
              <div className="text-sm text-[#4A4858] font-medium">Брак</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A4858]">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или номеру материала..."
            className="w-full px-4 py-3 pl-11 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A4858]">🔢</span>
            <input
              type="text"
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSerialSearch()}
              placeholder="Поиск по серийному номеру..."
              className="w-full px-4 py-3 pl-11 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
            />
          </div>
          <button
            onClick={handleSerialSearch}
            className="px-5 py-3 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-medium"
          >
            Найти
          </button>
        </div>
      </div>

      {/* Serial search result */}
      {foundSerial && (
        <div className="mb-6 p-5 bg-white border-2 border-[#14121F] rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✅</span>
            <h3 className="font-bold text-[#14121F]">Серийный номер найден</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#F4F4FC] rounded-xl p-3 border border-[#DFE1EE]">
              <span className="text-xs text-[#4A4858] block mb-1">Серийный номер</span>
              <p className="font-bold text-[#14121F] font-mono">{foundSerial.serial_number}</p>
            </div>
            <div className="bg-[#F4F4FC] rounded-xl p-3 border border-[#DFE1EE]">
              <span className="text-xs text-[#4A4858] block mb-1">Оборудование</span>
              <p className="font-semibold text-[#14121F]">{foundSerial.equipment?.name}</p>
            </div>
            <div className="bg-[#F4F4FC] rounded-xl p-3 border border-[#DFE1EE]">
              <span className="text-xs text-[#4A4858] block mb-1">Номер материала</span>
              <p className="font-semibold text-[#14121F] font-mono">{foundSerial.equipment?.material_number}</p>
            </div>
            <div className="bg-[#F4F4FC] rounded-xl p-3 border border-[#DFE1EE]">
              <span className="text-xs text-[#4A4858] block mb-1">Статус</span>
              <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold ${
                foundSerial.status === 'available' ? 'bg-[#14121F] text-white' :
                foundSerial.status === 'in_use' ? 'bg-[#EBEBF5] text-[#14121F] border border-[#DFE1EE]' :
                'bg-[#14121F] text-white'
              }`}>
                {SERIAL_STATUS_LABELS[foundSerial.status]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#DFE1EE] border-t-[#14121F]"></div>
          <p className="mt-4 text-[#4A4858] font-medium">Загрузка оборудования...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EBEBF5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#EBEBF5]">
              <thead className="bg-[#F4F4FC]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Номер материала
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Всего
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Доступно
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    В работе
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Брак
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBF5]">
                {equipment.map((eq) => (
                  <tr 
                    key={eq.id} 
                    className="hover:bg-[#F4F4FC] cursor-pointer transition-all"
                    onClick={() => handleShowDetails(eq)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm bg-[#F4F4FC] px-3 py-1.5 rounded-lg border border-[#DFE1EE] text-[#14121F]">
                        {eq.material_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-[#14121F]">{eq.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {eq.category ? (
                        <span className="px-2.5 py-1 bg-[#F4F4FC] text-[#4A4858] rounded-lg text-sm border border-[#DFE1EE]">
                          {eq.category}
                        </span>
                      ) : (
                        <span className="text-[#4A4858]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1.5 bg-[#F4F4FC] text-[#14121F] rounded-xl text-sm font-bold border border-[#DFE1EE]">
                        {eq.total_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1.5 bg-[#F4F4FC] text-[#14121F] rounded-xl text-sm font-bold border border-[#DFE1EE]">
                        {eq.available_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1.5 bg-[#F4F4FC] text-[#14121F] rounded-xl text-sm font-bold border border-[#DFE1EE]">
                        {eq.in_use_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                        eq.defective_count > 0 
                          ? 'bg-[#14121F] text-white' 
                          : 'bg-[#F4F4FC] text-[#4A4858] border border-[#DFE1EE]'
                      }`}>
                        {eq.defective_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <button
                          onClick={() => setShowAddSerial(eq.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#4A4858] hover:text-white hover:bg-[#14121F] bg-[#F4F4FC] rounded-lg border border-[#DFE1EE] hover:border-[#14121F] transition-all"
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
            <div className="text-center py-16 text-[#4A4858]">
              <div className="text-6xl mb-4">📡</div>
              <p className="text-lg font-medium">Оборудование не найдено</p>
              <p className="text-sm mt-1">Добавьте первое оборудование для начала работы</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Equipment Details */}
      {selectedEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-[#14121F] text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedEquipment.name}</h2>
                  <p className="text-white/70 mt-1">
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{selectedEquipment.material_number}</span>
                    {selectedEquipment.category && <span className="ml-2">• {selectedEquipment.category}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEquipment(null)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Stats */}
              <div className="flex gap-4 mt-6">
                <div className="bg-white/10 rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold">{selectedEquipment.total_count}</div>
                  <div className="text-sm text-white/70">Всего</div>
                </div>
                <div className="bg-white/10 rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold">{selectedEquipment.available_count}</div>
                  <div className="text-sm text-white/70">Доступно</div>
                </div>
                <div className="bg-white/10 rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold">{selectedEquipment.in_use_count}</div>
                  <div className="text-sm text-white/70">В работе</div>
                </div>
                <div className="bg-white/10 rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold">{selectedEquipment.defective_count}</div>
                  <div className="text-sm text-white/70">Брак</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Warehouse Distribution */}
              <div className="mb-6">
                <h3 className="font-bold text-[#14121F] mb-3 flex items-center gap-2">
                  📍 Распределение по складам
                </h3>
                {warehouseDistribution.length === 0 ? (
                  <div className="text-center py-8 bg-[#F4F4FC] rounded-xl text-[#4A4858]">
                    Нет данных о распределении
                  </div>
                ) : (
                  <div className="bg-[#F4F4FC] rounded-xl overflow-hidden border border-[#DFE1EE]">
                    <table className="min-w-full divide-y divide-[#DFE1EE]">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Склад</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-[#4A4858] uppercase">Серийников</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-[#4A4858] uppercase">Доступно</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-[#4A4858] uppercase">В работе</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-[#4A4858] uppercase">Брак</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DFE1EE]">
                        {warehouseDistribution.map((wd) => (
                          <tr key={wd.warehouse_id} className={wd.is_central ? 'bg-[#14121F] text-white' : 'bg-white'}>
                            <td className="px-4 py-3">
                              <span className="font-medium">{wd.warehouse_name}</span>
                              {wd.is_central && (
                                <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                                  Центральный
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{wd.serial_count}</td>
                            <td className="px-4 py-3 text-center font-semibold">{wd.available_count}</td>
                            <td className="px-4 py-3 text-center font-semibold">{wd.in_use_count}</td>
                            <td className="px-4 py-3 text-center font-semibold">{wd.defective_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Serial Numbers */}
              <div>
                <h3 className="font-bold text-[#14121F] mb-3 flex items-center gap-2">
                  🔢 Серийные номера
                </h3>
                {serials.length === 0 ? (
                  <div className="text-center py-8 bg-[#F4F4FC] rounded-xl text-[#4A4858]">
                    Серийные номера не добавлены
                  </div>
                ) : (
                  <div className="bg-[#F4F4FC] rounded-xl overflow-hidden border border-[#DFE1EE]">
                    <table className="min-w-full divide-y divide-[#DFE1EE]">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Серийный номер</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Склад</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Статус</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Примечания</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DFE1EE]">
                        {serials.map((s) => (
                          <tr key={s.id} className="bg-white hover:bg-[#F4F4FC]">
                            <td className="px-4 py-3 font-mono text-sm font-medium text-[#14121F]">{s.serial_number}</td>
                            <td className="px-4 py-3 text-sm text-[#4A4858]">
                              {warehouses.find(w => w.id === s.warehouse_id)?.name || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={s.status}
                                onChange={(e) => handleStatusChange(s.id, e.target.value)}
                                className={`text-sm border rounded-lg px-3 py-1.5 font-medium ${
                                  s.status === 'available' ? 'bg-[#14121F] text-white border-[#14121F]' :
                                  s.status === 'in_use' ? 'bg-[#F4F4FC] text-[#14121F] border-[#DFE1EE]' :
                                  'bg-[#14121F] text-white border-[#14121F]'
                                }`}
                                disabled={!isAdmin}
                              >
                                {Object.entries(SERIAL_STATUS_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#4A4858]">{s.notes || '—'}</td>
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

      {/* Modal: Add Equipment */}
      {showAddEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">📡 Новое оборудование</h2>
              <p className="text-white/70 mt-1">Создание типа оборудования</p>
            </div>
            <form onSubmit={handleCreateEquipment}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                      Номер материала *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEquipment.material_number}
                      onChange={(e) => setNewEquipment({...newEquipment, material_number: e.target.value})}
                      className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                      placeholder="MAT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                      Ед. измерения
                    </label>
                    <input
                      type="text"
                      value={newEquipment.unit}
                      onChange={(e) => setNewEquipment({...newEquipment, unit: e.target.value})}
                      className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEquipment.name}
                    onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    placeholder="Название оборудования"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Категория
                  </label>
                  <input
                    type="text"
                    value={newEquipment.category}
                    onChange={(e) => setNewEquipment({...newEquipment, category: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    placeholder="Роутеры, Коммутаторы..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Описание
                  </label>
                  <textarea
                    value={newEquipment.description}
                    onChange={(e) => setNewEquipment({...newEquipment, description: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    rows={3}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddEquipment(false)}
                  className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold"
                >
                  Создать оборудование
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Serial */}
      {showAddSerial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">🔢 Добавить серийный номер</h2>
              <p className="text-white/70 mt-1">Регистрация нового серийного номера</p>
            </div>
            <form onSubmit={handleAddSerial}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Серийный номер *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSerial.serial_number}
                    onChange={(e) => setNewSerial({...newSerial, serial_number: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white font-mono"
                    placeholder="SN123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Склад
                  </label>
                  <select
                    value={newSerial.warehouse_id || ''}
                    onChange={(e) => setNewSerial({...newSerial, warehouse_id: e.target.value ? Number(e.target.value) : undefined})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  >
                    <option value="">Не выбран</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Статус
                  </label>
                  <select
                    value={newSerial.status}
                    onChange={(e) => setNewSerial({...newSerial, status: e.target.value as any})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  >
                    {Object.entries(SERIAL_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Примечания
                  </label>
                  <textarea
                    value={newSerial.notes}
                    onChange={(e) => setNewSerial({...newSerial, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    rows={2}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddSerial(null)}
                  className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold"
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