import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listWarehouses, createWarehouse } from '../api/warehouses';
import { 
  transferEquipment, 
  addStock, 
  writeOffStock, 
  getWarehouseStock,
  listTransactions,
  listEquipment
} from '../api/equipment';
import type { Equipment, Warehouse } from '../types';

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

export const Warehouses = () => {
  const { isAdmin } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Модальные окна
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [showStock, setShowStock] = useState<number | null>(null);
  const [stockData, setStockData] = useState<{serial_numbers: SerialItem[]; stock: StockItem[]} | null>(null);
  
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

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer': return 'Перемещение';
      case 'add': return 'Поступление';
      case 'write_off': return 'Списание';
      default: return type;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Склады</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowTransfer(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Переместить
            </button>
            <button
              onClick={() => setShowAddStock(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Поступление
            </button>
            <button
              onClick={() => setShowWriteOff(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Списание
            </button>
            <button
              onClick={() => setShowCreateWarehouse(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              + Создать склад
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <>
          {/* Список складов */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {warehouses.map((wh) => (
              <div 
                key={wh.id} 
                className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md ${wh.is_central ? 'border-2 border-indigo-500' : ''}`}
                onClick={() => handleShowStock(wh.id)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg">{wh.name}</h3>
                  {wh.is_central && (
                    <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                      Центральный
                    </span>
                  )}
                </div>
                {wh.location && (
                  <p className="text-gray-500 text-sm mt-1">{wh.location}</p>
                )}
                {wh.user_name && (
                  <p className="text-sm mt-2">
                    <span className="text-gray-500">Монтажник:</span> {wh.user_name}
                  </p>
                )}
                {wh.description && (
                  <p className="text-gray-400 text-sm mt-2">{wh.description}</p>
                )}
              </div>
            ))}
          </div>

          {/* История операций */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">История операций</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Нет операций</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Оборудование</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Откуда</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Куда</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Кол-во</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{new Date(tx.created_at).toLocaleString('ru')}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          tx.transaction_type === 'add' ? 'bg-green-100 text-green-800' :
                          tx.transaction_type === 'write_off' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {getTransactionTypeLabel(tx.transaction_type)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {tx.equipment_name}
                        {tx.serial_number && <span className="text-gray-400 ml-1">({tx.serial_number})</span>}
                      </td>
                      <td className="px-4 py-2 text-sm">{tx.from_warehouse || '-'}</td>
                      <td className="px-4 py-2 text-sm">{tx.to_warehouse || '-'}</td>
                      <td className="px-4 py-2 text-sm">{tx.quantity}</td>
                      <td className="px-4 py-2 text-sm">{tx.created_by_name}</td>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Остатки: {warehouses.find(w => w.id === showStock)?.name}
              </h2>
              <button onClick={() => setShowStock(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>

            {/* Серийные номера */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Серийное оборудование</h3>
              {stockData.serial_numbers.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет серийного оборудования</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Серийный номер</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Оборудование</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stockData.serial_numbers.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 font-mono text-sm">{s.serial_number}</td>
                        <td className="px-3 py-2 text-sm">{s.equipment.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            s.status === 'available' ? 'bg-green-100 text-green-800' :
                            s.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {s.status === 'available' ? 'Доступен' : s.status === 'in_use' ? 'В использовании' : 'Неисправен'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Остатки */}
            <div>
              <h3 className="font-semibold mb-2">Материалы</h3>
              {stockData.stock.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет материалов</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Материал</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Номер материала</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Количество</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ед. изм.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stockData.stock.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 text-sm">{s.equipment.name}</td>
                        <td className="px-3 py-2 font-mono text-sm">{s.equipment.material_number}</td>
                        <td className="px-3 py-2 text-sm font-medium">{s.quantity}</td>
                        <td className="px-3 py-2 text-sm">{s.equipment.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Создать склад */}
      {showCreateWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold mb-4">Новый склад</h2>
            <form onSubmit={handleCreateWarehouse}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                  <input
                    type="text"
                    required
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Расположение</label>
                  <input
                    type="text"
                    value={newWarehouse.location}
                    onChange={(e) => setNewWarehouse({...newWarehouse, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                  <textarea
                    value={newWarehouse.description}
                    onChange={(e) => setNewWarehouse({...newWarehouse, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_central"
                    checked={newWarehouse.is_central}
                    onChange={(e) => setNewWarehouse({...newWarehouse, is_central: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="is_central" className="ml-2 text-sm text-gray-700">
                    Центральный склад
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateWarehouse(false)}
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

      {/* Модальное окно: Переместить */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold mb-4">Переместить оборудование</h2>
            <form onSubmit={handleTransfer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Серийный номер *</label>
                  <input
                    type="text"
                    required
                    value={transferForm.serial_number}
                    onChange={(e) => setTransferForm({...transferForm, serial_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Введите серийный номер"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">На склад *</label>
                  <select
                    required
                    value={transferForm.to_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, to_warehouse_id: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                  <input
                    type="text"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTransfer(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Переместить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Поступление */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold mb-4">Поступление материалов</h2>
            <form onSubmit={handleAddStock}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Оборудование *</label>
                  <select
                    required
                    value={addStockForm.equipment_id}
                    onChange={(e) => setAddStockForm({...addStockForm, equipment_id: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">На склад *</label>
                  <select
                    required
                    value={addStockForm.warehouse_id}
                    onChange={(e) => setAddStockForm({...addStockForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Количество *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={addStockForm.quantity}
                    onChange={(e) => setAddStockForm({...addStockForm, quantity: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                  <input
                    type="text"
                    value={addStockForm.notes}
                    onChange={(e) => setAddStockForm({...addStockForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddStock(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold mb-4">Списание материалов</h2>
            <form onSubmit={handleWriteOff}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Серийный номер (для серийного оборудования)</label>
                  <input
                    type="text"
                    value={writeOffForm.serial_number}
                    onChange={(e) => setWriteOffForm({...writeOffForm, serial_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Оставьте пустым для несерийного"
                  />
                </div>
                {!writeOffForm.serial_number && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Оборудование *</label>
                      <select
                        required
                        value={writeOffForm.equipment_id}
                        onChange={(e) => setWriteOffForm({...writeOffForm, equipment_id: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Количество *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={writeOffForm.quantity}
                        onChange={(e) => setWriteOffForm({...writeOffForm, quantity: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Со склада *</label>
                  <select
                    required
                    value={writeOffForm.warehouse_id}
                    onChange={(e) => setWriteOffForm({...writeOffForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Причина списания</label>
                  <input
                    type="text"
                    value={writeOffForm.notes}
                    onChange={(e) => setWriteOffForm({...writeOffForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowWriteOff(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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