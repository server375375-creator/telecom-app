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
      loadEquipment(); // Обновляем список с количеством
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Оборудование</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddEquipment(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            + Добавить оборудование
          </button>
        )}
      </div>

      {/* Поиск */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Поиск по названию или номеру материала
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Введите для поиска..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Поиск по серийному номеру
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              placeholder="Введите серийный номер..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleSerialSearch}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Найти
            </button>
          </div>
        </div>
      </div>

      {/* Результат поиска по серийнику */}
      {foundSerial && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Найдено:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Серийный номер:</span>
              <p className="font-medium">{foundSerial.serial_number}</p>
            </div>
            <div>
              <span className="text-gray-500">Оборудование:</span>
              <p className="font-medium">{foundSerial.equipment?.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Номер материала:</span>
              <p className="font-medium">{foundSerial.equipment?.material_number}</p>
            </div>
            <div>
              <span className="text-gray-500">Статус:</span>
              <p className="font-medium">{SERIAL_STATUS_LABELS[foundSerial.status]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Список оборудования */}
      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Номер материала</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Категория</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Всего</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Доступно</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">В работе</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Брак</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipment.map((eq) => (
                <tr key={eq.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleShowDetails(eq)}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{eq.material_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{eq.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{eq.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-semibold">
                      {eq.total_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                      {eq.available_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {eq.in_use_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                      {eq.defective_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && (
                      <button
                        onClick={() => setShowAddSerial(eq.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        + Серийник
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {equipment.length === 0 && (
            <div className="text-center py-8 text-gray-500">Оборудование не найдено</div>
          )}
        </div>
      )}

      {/* Модальное окно: Детали оборудования */}
      {selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[85vh] overflow-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedEquipment.name}
              </h2>
              <button
                onClick={() => setSelectedEquipment(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Номер материала: {selectedEquipment.material_number} | 
              Всего: <span className="font-semibold">{selectedEquipment.total_count}</span> | 
              Доступно: <span className="text-green-600 font-semibold">{selectedEquipment.available_count}</span> |
              В работе: <span className="text-blue-600 font-semibold">{selectedEquipment.in_use_count}</span> |
              Брак: <span className="text-red-600 font-semibold">{selectedEquipment.defective_count}</span>
            </p>

            {/* Распределение по складам */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-lg">Распределение по складам</h3>
              {warehouseDistribution.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет данных о распределении</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Склад</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Всего серийников</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Доступно</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">В работе</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Брак</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">На складе (шт)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {warehouseDistribution.map((wd) => (
                      <tr key={wd.warehouse_id} className={wd.is_central ? 'bg-indigo-50' : ''}>
                        <td className="px-4 py-2">
                          {wd.warehouse_name}
                          {wd.is_central && <span className="ml-2 text-xs bg-indigo-200 px-1 rounded">Центральный</span>}
                        </td>
                        <td className="px-4 py-2 text-center font-medium">{wd.serial_count}</td>
                        <td className="px-4 py-2 text-center text-green-600">{wd.available_count}</td>
                        <td className="px-4 py-2 text-center text-blue-600">{wd.in_use_count}</td>
                        <td className="px-4 py-2 text-center text-red-600">{wd.defective_count}</td>
                        <td className="px-4 py-2 text-center font-medium">{wd.stock_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Серийные номера */}
            <div>
              <h3 className="font-semibold mb-2 text-lg">Серийные номера</h3>
              {serials.length === 0 ? (
                <p className="text-gray-500 text-sm">Серийные номера не добавлены</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Серийный номер</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Склад</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Примечания</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {serials.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2 font-mono text-sm">{s.serial_number}</td>
                        <td className="px-4 py-2 text-sm">
                          {warehouses.find(w => w.id === s.warehouse_id)?.name || '-'}
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={s.status}
                            onChange={(e) => handleStatusChange(s.id, e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                            disabled={!isAdmin}
                          >
                            {Object.entries(SERIAL_STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-sm">{s.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Добавить оборудование */}
      {showAddEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold mb-4">Новое оборудование</h2>
            <form onSubmit={handleCreateEquipment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер материала *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEquipment.material_number}
                    onChange={(e) => setNewEquipment({...newEquipment, material_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEquipment.name}
                    onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Категория
                  </label>
                  <input
                    type="text"
                    value={newEquipment.category}
                    onChange={(e) => setNewEquipment({...newEquipment, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Единица измерения
                  </label>
                  <input
                    type="text"
                    value={newEquipment.unit}
                    onChange={(e) => setNewEquipment({...newEquipment, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={newEquipment.description}
                    onChange={(e) => setNewEquipment({...newEquipment, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddEquipment(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Добавить серийный номер */}
      {showAddSerial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold mb-4">Добавить серийный номер</h2>
            <form onSubmit={handleAddSerial}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Серийный номер *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSerial.serial_number}
                    onChange={(e) => setNewSerial({...newSerial, serial_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Склад
                  </label>
                  <select
                    value={newSerial.warehouse_id || ''}
                    onChange={(e) => setNewSerial({...newSerial, warehouse_id: e.target.value ? Number(e.target.value) : undefined})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Статус
                  </label>
                  <select
                    value={newSerial.status}
                    onChange={(e) => setNewSerial({...newSerial, status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {Object.entries(SERIAL_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Примечания
                  </label>
                  <textarea
                    value={newSerial.notes}
                    onChange={(e) => setNewSerial({...newSerial, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddSerial(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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