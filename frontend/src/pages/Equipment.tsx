import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  listEquipment, 
  createEquipment, 
  listSerialNumbers, 
  addSerialNumber,
  searchBySerialNumber,
  updateSerialStatus 
} from '../api/equipment';
import type { Equipment, SerialNumber } from '../types';
import { SERIAL_STATUS_LABELS, ROLE_LABELS } from '../types';

export const EquipmentPage = () => {
  const { isAdmin } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serialSearch, setSerialSearch] = useState('');
  const [foundSerial, setFoundSerial] = useState<SerialNumber | null>(null);
  
  // Модальные окна
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showAddSerial, setShowAddSerial] = useState<number | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  
  // Формы
  const [newEquipment, setNewEquipment] = useState({
    material_number: '',
    name: '',
    description: '',
    category: '',
    unit: 'шт'
  });
  const [newSerial, setNewSerial] = useState({
    serial_number: '',
    status: 'available' as const,
    notes: ''
  });

  // Загрузка оборудования
  const loadEquipment = async () => {
    setLoading(true);
    try {
      const data = await listEquipment(search);
      setEquipment(data);
    } catch (err) {
      console.error('Failed to load equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, [search]);

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

  // Показать серийные номера
  const handleShowSerials = (eq: Equipment) => {
    setSelectedEquipment(eq);
    loadSerials(eq.id);
  };

  // Добавление серийного номера
  const handleAddSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddSerial) return;
    try {
      await addSerialNumber(showAddSerial, newSerial);
      setNewSerial({ serial_number: '', status: 'available', notes: '' });
      setShowAddSerial(null);
      loadSerials(showAddSerial);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ед. изм.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipment.map((eq) => (
                <tr key={eq.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{eq.material_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{eq.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{eq.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{eq.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleShowSerials(eq)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Серийники
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setShowAddSerial(eq.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        + Добавить серийник
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

      {/* Модальное окно: Серийные номера */}
      {selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Серийные номера: {selectedEquipment.name}
              </h2>
              <button
                onClick={() => setSelectedEquipment(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Номер материала: {selectedEquipment.material_number}
            </p>
            
            {serials.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Серийные номера не добавлены</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Серийный номер</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Примечания</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {serials.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 font-mono text-sm">{s.serial_number}</td>
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
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          s.status === 'available' ? 'bg-green-100 text-green-800' :
                          s.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                          s.status === 'defective' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {SERIAL_STATUS_LABELS[s.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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