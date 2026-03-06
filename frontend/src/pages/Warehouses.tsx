import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listWarehouses, createWarehouse } from '../api/warehouses';
import { 
  transferEquipment, 
  addStock, 
  writeOffStock, 
  getWarehouseStock,
  listTransactions,
  listEquipment,
  bulkTransferEquipment
} from '../api/equipment';
import type { Equipment } from '../types';
import type { Warehouse } from '../types';

interface Transaction {
  id: number;
  equipment_name: string;
  serial_number: string | null;
  from_warehouse: string | null;
  to_warehouse: string | null;
  quantity: number;
  transaction_type: string;
  notes: string | null;
  created_by_name: string;
  created_at: string;
}

interface StockItem {
  id: number;
  quantity: number;
  equipment: {
    id: number;
    material_number: string;
    name: string;
    unit: string;
  };
}

interface SerialItem {
  id: number;
  serial_number: string;
  status: string;
  notes: string | null;
  equipment: {
    id: number;
    material_number: string;
    name: string;
    unit: string;
  };
}

interface WarehouseStockData {
  serial_numbers: SerialItem[];
  stock: StockItem[];
}

export const Warehouses = () => {
  const { isAdmin } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Модальные окна
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [showStock, setShowStock] = useState<number | null>(null);
  const [stockData, setStockData] = useState<WarehouseStockData | null>(null);
  
  // Выбранные серийники для массового перемещения
  const [selectedSerials, setSelectedSerials] = useState<Set<string>>(new Set());
  const [bulkTransferMode, setBulkTransferMode] = useState<'text' | 'select'>('select');
  const [bulkTransferWarehouse, setBulkTransferWarehouse] = useState<number>(0);
  const [bulkTransferSerials, setBulkTransferSerials] = useState<SerialItem[]>([]);
  const [loadingBulkSerials, setLoadingBulkSerials] = useState(false);
  const [targetWarehouse, setTargetWarehouse] = useState<number>(0);
  
  // Формы
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    location: '',
    description: '',
    is_central: false
  });
  const [transferForm, setTransferForm] = useState({
    serial_number: '',
    to_warehouse_id: 0,
    notes: ''
  });
  const [bulkTransferForm, setBulkTransferForm] = useState({
    serial_numbers_text: '',
    to_warehouse_id: 0,
    notes: ''
  });
  const [addStockForm, setAddStockForm] = useState({
    equipment_id: 0,
    warehouse_id: 0,
    quantity: 1,
    notes: ''
  });
  const [writeOffForm, setWriteOffForm] = useState({
    equipment_id: 0,
    warehouse_id: 0,
    quantity: 1,
    serial_number: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [whData, eqData, txData] = await Promise.all([
        listWarehouses(),
        listEquipment(),
        listTransactions(20)
      ]);
      setWarehouses(whData);
      setEquipment(eqData);
      setTransactions(txData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWarehouse(newWarehouse);
      setNewWarehouse({ name: '', location: '', description: '', is_central: false });
      setShowCreateWarehouse(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка создания склада');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transferEquipment(transferForm.serial_number, transferForm.to_warehouse_id, transferForm.notes);
      setTransferForm({ serial_number: '', to_warehouse_id: 0, notes: '' });
      setShowTransfer(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка перемещения');
    }
  };

  const handleBulkTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let serialNumbers: string[] = [];
      
      if (bulkTransferMode === 'text') {
        serialNumbers = bulkTransferForm.serial_numbers_text
          .split(/[\n,]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      } else {
        serialNumbers = Array.from(selectedSerials);
      }
      
      if (serialNumbers.length === 0) {
        alert('Выберите хотя бы один серийный номер');
        return;
      }
      
      const destinationWarehouse = bulkTransferMode === 'select' ? targetWarehouse : bulkTransferForm.to_warehouse_id;
      
      if (!destinationWarehouse) {
        alert('Выберите склад назначения');
        return;
      }
      
      const result = await bulkTransferEquipment(serialNumbers, destinationWarehouse, bulkTransferForm.notes);
      
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e: any) => `${e.serial_number}: ${e.error}`).join('\n');
        alert(`Перемещено: ${result.transferred}\nОшибки:\n${errorMessages}`);
      } else {
        alert(`Успешно перемещено ${result.transferred} единиц оборудования`);
      }
      
      setSelectedSerials(new Set());
      setBulkTransferForm({ serial_numbers_text: '', to_warehouse_id: 0, notes: '' });
      setShowBulkTransfer(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка массового перемещения');
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addStock(addStockForm.equipment_id, addStockForm.warehouse_id, addStockForm.quantity, addStockForm.notes);
      setAddStockForm({ equipment_id: 0, warehouse_id: 0, quantity: 1, notes: '' });
      setShowAddStock(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка добавления');
    }
  };

  const handleWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await writeOffStock(writeOffForm);
      setWriteOffForm({ equipment_id: 0, warehouse_id: 0, quantity: 1, serial_number: '', notes: '' });
      setShowWriteOff(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка списания');
    }
  };

  const handleShowStock = async (warehouseId: number) => {
    try {
      const data = await getWarehouseStock(warehouseId);
      setStockData(data);
      setShowStock(warehouseId);
    } catch (err) {
      alert('Ошибка загрузки остатков');
    }
  };

  const toggleSerialSelection = (serialNumber: string) => {
    const newSelected = new Set(selectedSerials);
    if (newSelected.has(serialNumber)) {
      newSelected.delete(serialNumber);
    } else {
      newSelected.add(serialNumber);
    }
    setSelectedSerials(newSelected);
  };

  const selectAllSerials = () => {
    const allSerials = new Set(bulkTransferSerials.map(s => s.serial_number));
    setSelectedSerials(allSerials);
  };

  const clearSerialSelection = () => {
    setSelectedSerials(new Set());
  };

  // Загрузка серийников для массового перемещения
  const loadBulkTransferSerials = async (warehouseId: number) => {
    if (warehouseId === 0) {
      setBulkTransferSerials([]);
      return;
    }
    setLoadingBulkSerials(true);
    try {
      const data = await getWarehouseStock(warehouseId);
      setBulkTransferSerials(data.serial_numbers || []);
    } catch (err) {
      console.error('Failed to load serials:', err);
      setBulkTransferSerials([]);
    } finally {
      setLoadingBulkSerials(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer': return 'Перемещение';
      case 'add': return 'Поступление';
      case 'write_off': return 'Списание';
      default: return type;
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Склады</h1>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedSerials(new Set());
                setBulkTransferMode('select');
                setShowBulkTransfer(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 shadow-md transition-all duration-200 font-medium"
            >
              📦 Массовое перемещение
            </button>
            <button
              onClick={() => setShowTransfer(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-emerald-700 shadow-md transition-all duration-200 font-medium"
            >
              ↗️ Переместить
            </button>
            <button
              onClick={() => setShowAddStock(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-md transition-all duration-200 font-medium"
            >
              ➕ Поступление
            </button>
            <button
              onClick={() => setShowWriteOff(true)}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 shadow-md transition-all duration-200 font-medium"
            >
              🗑️ Списание
            </button>
            <button
              onClick={() => setShowCreateWarehouse(true)}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-indigo-700 shadow-md transition-all duration-200 font-medium"
            >
              + Создать склад
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Загрузка...</p>
        </div>
      ) : (
        <>
          {/* Список складов */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {warehouses.map((wh) => (
              <div 
                key={wh.id} 
                className={`bg-white rounded-xl shadow-lg p-5 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 ${wh.is_central ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-white' : 'border-transparent hover:border-slate-200'}`}
                onClick={() => handleShowStock(wh.id)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg text-slate-800">{wh.name}</h3>
                  {wh.is_central && (
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
                      ⭐ Центральный
                    </span>
                  )}
                </div>
                {wh.location && (
                  <p className="text-slate-500 text-sm mt-2 flex items-center gap-1">
                    <span>📍</span> {wh.location}
                  </p>
                )}
                {wh.user_name && (
                  <p className="text-sm mt-2 text-slate-600">
                    <span className="text-slate-400">👤 Монтажник:</span> {wh.user_name}
                  </p>
                )}
                {wh.description && (
                  <p className="text-slate-400 text-sm mt-2">{wh.description}</p>
                )}
              </div>
            ))}
          </div>

          {/* История операций */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h2 className="text-lg font-semibold text-slate-800">📋 История операций</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Нет операций</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Дата</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Тип</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Оборудование</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Откуда</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Куда</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Кол-во</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Пользователь</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(tx.created_at).toLocaleString('ru')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          tx.transaction_type === 'add' ? 'bg-emerald-100 text-emerald-700' :
                          tx.transaction_type === 'write_off' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {getTransactionTypeLabel(tx.transaction_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {tx.equipment_name}
                        {tx.serial_number && <span className="text-slate-400 ml-1 font-mono">({tx.serial_number})</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{tx.from_warehouse || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{tx.to_warehouse || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">{tx.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{tx.created_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Модальное окно: Остатки на складе */}
      {showStock && stockData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden m-4 flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">
                📦 Остатки: {warehouses.find(w => w.id === showStock)?.name}
              </h2>
              <button onClick={() => setShowStock(null)} className="text-slate-400 hover:text-slate-600 text-2xl transition-colors">
                ✕
              </button>
            </div>

            <div className="p-5 overflow-auto flex-1">
              {/* Общая статистика */}
              <div className="mb-5 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
                <div className="flex gap-8">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔧</span>
                    <div>
                      <span className="text-slate-500 text-sm">Серийное оборудование</span>
                      <p className="font-bold text-slate-800">{stockData.serial_numbers.length} ед.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    <div>
                      <span className="text-slate-500 text-sm">Материалов на складе</span>
                      <p className="font-bold text-slate-800">{stockData.stock.reduce((sum, s) => sum + s.quantity, 0)} ед.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Серийные номера */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-slate-700 flex items-center gap-2">
                  <span>🔧</span> Серийное оборудование ({stockData.serial_numbers.length} ед.)
                </h3>
                {stockData.serial_numbers.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4 bg-slate-50 rounded-lg">Нет серийного оборудования</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Серийный номер</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Оборудование</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockData.serial_numbers.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-sm text-slate-700">{s.serial_number}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{s.equipment.name}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                s.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                                s.status === 'in_use' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {s.status === 'available' ? '✓ Доступен' : s.status === 'in_use' ? '⏳ В использовании' : '✕ Неисправен'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Остатки */}
              <div>
                <h3 className="font-semibold mb-3 text-slate-700 flex items-center gap-2">
                  <span>📋</span> Материалы
                </h3>
                {stockData.stock.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4 bg-slate-50 rounded-lg">Нет материалов</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Материал</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Номер материала</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Количество</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ед. изм.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockData.stock.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-700">{s.equipment.name}</td>
                            <td className="px-4 py-3 font-mono text-sm text-slate-500">{s.equipment.material_number}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-800">{s.quantity}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{s.equipment.unit}</td>
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

      {/* Модальное окно: Создать склад */}
      {showCreateWarehouse && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full m-4">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">🏢 Новый склад</h2>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Название *</label>
                  <input
                    type="text"
                    required
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Расположение</label>
                  <input
                    type="text"
                    value={newWarehouse.location}
                    onChange={(e) => setNewWarehouse({...newWarehouse, location: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание</label>
                  <textarea
                    value={newWarehouse.description}
                    onChange={(e) => setNewWarehouse({...newWarehouse, description: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    rows={2}
                  />
                </div>
                <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="is_central"
                    checked={newWarehouse.is_central}
                    onChange={(e) => setNewWarehouse({...newWarehouse, is_central: e.target.checked})}
                    className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_central" className="ml-3 text-sm text-slate-700">
                    ⭐ Центральный склад
                  </label>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateWarehouse(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 shadow-md transition-all font-medium"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Переместить (один) */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full m-4">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">↗️ Переместить оборудование</h2>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Серийный номер *</label>
                  <input
                    type="text"
                    required
                    value={transferForm.serial_number}
                    onChange={(e) => setTransferForm({...transferForm, serial_number: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    placeholder="Введите серийный номер"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">На склад *</label>
                  <select
                    required
                    value={transferForm.to_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, to_warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="">Выберите склад</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '(Центральный)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Примечания</label>
                  <input
                    type="text"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransfer(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 shadow-md transition-all font-medium"
                >
                  Переместить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Массовое перемещение */}
      {showBulkTransfer && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
              <h2 className="text-xl font-bold text-slate-800">📦 Массовое перемещение оборудования</h2>
            </div>
            
            {/* Переключатель режима */}
            <div className="px-5 pt-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setBulkTransferMode('select');
                    setSelectedSerials(new Set());
                    setBulkTransferSerials([]);
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${bulkTransferMode === 'select' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  🖱️ Выбор из списка
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkTransferMode('text');
                    setSelectedSerials(new Set());
                    setBulkTransferSerials([]);
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${bulkTransferMode === 'text' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  📝 Ввод вручную
                </button>
              </div>
            </div>
            
            <form onSubmit={handleBulkTransfer} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 flex-1 overflow-auto">
                {bulkTransferMode === 'text' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Серийные номера * 
                      <span className="text-slate-400 font-normal ml-1">(по одному на строку или через запятую)</span>
                    </label>
                    <textarea
                      required
                      value={bulkTransferForm.serial_numbers_text}
                      onChange={(e) => setBulkTransferForm({...bulkTransferForm, serial_numbers_text: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-sm bg-slate-50"
                      rows={8}
                      placeholder="SN001&#10;SN002&#10;SN003&#10;или SN001, SN002, SN003"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Выбор склада-источника */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        📤 Со склада (источник)
                      </label>
                      <select
                        value={bulkTransferWarehouse}
                        onChange={(e) => {
                          const warehouseId = Number(e.target.value);
                          setBulkTransferWarehouse(warehouseId);
                          setSelectedSerials(new Set());
                          loadBulkTransferSerials(warehouseId);
                        }}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50"
                      >
                        <option value={0}>Выберите склад-источник</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.is_central ? '⭐' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Список серийников */}
                    {bulkTransferWarehouse > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-slate-700">
                            🔧 Выберите серийные номера ({bulkTransferSerials.length} доступно)
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={selectAllSerials}
                              className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                            >
                              ✓ Выбрать все
                            </button>
                            <button
                              type="button"
                              onClick={clearSerialSelection}
                              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                            >
                              ✕ Очистить
                            </button>
                          </div>
                        </div>
                        
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-auto bg-slate-50">
                          {loadingBulkSerials ? (
                            <div className="p-8 text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                              <p className="mt-2 text-sm text-slate-500">Загрузка серийников...</p>
                            </div>
                          ) : bulkTransferSerials.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                              Нет серийного оборудования на этом складе
                            </div>
                          ) : (
                            <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-100 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-10">✓</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Серийный номер</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Оборудование</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Статус</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {bulkTransferSerials.map((s) => (
                                  <tr 
                                    key={s.id} 
                                    onClick={() => toggleSerialSelection(s.serial_number)}
                                    className={`cursor-pointer transition-all ${selectedSerials.has(s.serial_number) ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-slate-50'}`}
                                  >
                                    <td className="px-4 py-2">
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedSerials.has(s.serial_number) ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
                                        {selectedSerials.has(s.serial_number) && (
                                          <span className="text-white text-xs">✓</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-sm text-slate-700">{s.serial_number}</td>
                                    <td className="px-4 py-2 text-sm text-slate-600">{s.equipment.name}</td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        s.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                                        s.status === 'in_use' ? 'bg-blue-100 text-blue-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {s.status === 'available' ? 'Доступен' : s.status === 'in_use' ? 'В работе' : 'Брак'}
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
                    
                    {/* Показать выбранные */}
                    {selectedSerials.size > 0 && (
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                        <p className="text-sm text-purple-700 font-medium mb-2">
                          ✓ Выбрано: {selectedSerials.size} серийных номеров
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(selectedSerials).slice(0, 15).map(sn => (
                            <span key={sn} className="px-2 py-1 bg-white rounded text-xs font-mono text-slate-600 shadow-sm border border-slate-100">
                              {sn}
                            </span>
                          ))}
                          {selectedSerials.size > 15 && (
                            <span className="px-2 py-1 text-xs text-slate-400 bg-white rounded border border-slate-100">
                              +{selectedSerials.size - 15} ещё
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Склад назначения */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        📥 На склад (назначение)
                      </label>
                      <select
                        required
                        value={targetWarehouse}
                        onChange={(e) => setTargetWarehouse(Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50"
                      >
                        <option value={0}>Выберите склад назначения</option>
                        {warehouses.filter(w => w.id !== bulkTransferWarehouse).map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.is_central ? '⭐' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Примечания</label>
                  <input
                    type="text"
                    value={bulkTransferForm.notes}
                    onChange={(e) => setBulkTransferForm({...bulkTransferForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50"
                    placeholder="Комментарий к перемещению..."
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkTransfer(false);
                    setSelectedSerials(new Set());
                    setBulkTransferSerials([]);
                    setTargetWarehouse(0);
                  }}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-medium text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={bulkTransferMode === 'select' && selectedSerials.size === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📦 Переместить {selectedSerials.size > 0 ? `(${selectedSerials.size})` : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Поступление */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full m-4">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">➕ Поступление материалов</h2>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Оборудование *</label>
                  <select
                    required
                    value={addStockForm.equipment_id}
                    onChange={(e) => setAddStockForm({...addStockForm, equipment_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="">Выберите оборудование</option>
                    {equipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.material_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">На склад *</label>
                  <select
                    required
                    value={addStockForm.warehouse_id}
                    onChange={(e) => setAddStockForm({...addStockForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="">Выберите склад</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '(Центральный)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Количество *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={addStockForm.quantity}
                    onChange={(e) => setAddStockForm({...addStockForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Примечания</label>
                  <input
                    type="text"
                    value={addStockForm.notes}
                    onChange={(e) => setAddStockForm({...addStockForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStock(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-md transition-all font-medium"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Списание */}
      {showWriteOff && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full m-4">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">🗑️ Списание материалов</h2>
            </div>
            <form onSubmit={handleWriteOff}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Серийный номер (для серийного оборудования)</label>
                  <input
                    type="text"
                    value={writeOffForm.serial_number}
                    onChange={(e) => setWriteOffForm({...writeOffForm, serial_number: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    placeholder="Оставьте пустым для несерийного"
                  />
                </div>
                {!writeOffForm.serial_number && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Оборудование *</label>
                      <select
                        required
                        value={writeOffForm.equipment_id}
                        onChange={(e) => setWriteOffForm({...writeOffForm, equipment_id: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      >
                        <option value="">Выберите оборудование</option>
                        {equipment.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} ({eq.material_number})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Количество *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={writeOffForm.quantity}
                        onChange={(e) => setWriteOffForm({...writeOffForm, quantity: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Со склада *</label>
                  <select
                    required
                    value={writeOffForm.warehouse_id}
                    onChange={(e) => setWriteOffForm({...writeOffForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="">Выберите склад</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '(Центральный)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Причина списания</label>
                  <input
                    type="text"
                    value={writeOffForm.notes}
                    onChange={(e) => setWriteOffForm({...writeOffForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowWriteOff(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 shadow-md transition-all font-medium"
                >
                  Списать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};