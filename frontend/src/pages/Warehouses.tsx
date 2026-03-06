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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#14121F] mb-1">Склады</h1>
          <p className="text-[#4A4858]">Управление складами и перемещениями</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedSerials(new Set());
                setBulkTransferMode('select');
                setShowBulkTransfer(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#F4F4FC] text-[#14121F] font-medium border border-[#DFE1EE] hover:bg-[#EBEBF5] hover:border-[#14121F] transition-all"
            >
              📦 Массовое перемещение
            </button>
            <button
              onClick={() => setShowTransfer(true)}
              className="px-4 py-2.5 rounded-xl bg-[#14121F] text-white font-medium shadow-lg hover:bg-[#2A2838] transition-all"
            >
              ↗️ Переместить
            </button>
            <button
              onClick={() => setShowAddStock(true)}
              className="px-4 py-2.5 rounded-xl bg-[#14121F] text-white font-medium shadow-lg hover:bg-[#2A2838] transition-all"
            >
              ➕ Поступление
            </button>
            <button
              onClick={() => setShowWriteOff(true)}
              className="px-4 py-2.5 rounded-xl bg-[#F4F4FC] text-[#14121F] font-medium border border-[#DFE1EE] hover:bg-[#EBEBF5] hover:border-[#14121F] transition-all"
            >
              🗑️ Списание
            </button>
            <button
              onClick={() => setShowCreateWarehouse(true)}
              className="px-4 py-2.5 rounded-xl bg-[#14121F] text-white font-medium shadow-lg hover:bg-[#2A2838] transition-all"
            >
              + Создать склад
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{warehouses.length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Складов</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">🏭</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{warehouses.filter(w => w.is_central).length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Центральных</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">⭐</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{equipment.length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Видов оборудования</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">📡</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{transactions.length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Операций</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">📋</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#DFE1EE] border-t-[#14121F]"></div>
          <p className="mt-4 text-[#4A4858] font-medium">Загрузка...</p>
        </div>
      ) : (
        <>
          {/* Warehouses grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {warehouses.map((wh) => (
              <div 
                key={wh.id} 
                className={`bg-white rounded-2xl p-6 cursor-pointer transition-all border-2 hover:shadow-md ${
                  wh.is_central 
                    ? 'border-[#14121F] bg-[#14121F] text-white' 
                    : 'border-[#EBEBF5] hover:border-[#14121F]'
                }`}
                onClick={() => handleShowStock(wh.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{wh.name}</h3>
                  {wh.is_central && (
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-medium">
                      ⭐ Центральный
                    </span>
                  )}
                </div>
                {wh.location && (
                  <p className={`text-sm mb-2 flex items-center gap-1 ${wh.is_central ? 'text-white/70' : 'text-[#4A4858]'}`}>
                    <span>📍</span> {wh.location}
                  </p>
                )}
                {wh.user_name && (
                  <p className={`text-sm mb-2 ${wh.is_central ? 'text-white/70' : 'text-[#4A4858]'}`}>
                    <span className={wh.is_central ? 'text-white/50' : 'text-[#4A4858]/50'}>👤 Монтажник:</span> {wh.user_name}
                  </p>
                )}
                {wh.description && (
                  <p className={`text-sm ${wh.is_central ? 'text-white/60' : 'text-[#4A4858]/70'}`}>{wh.description}</p>
                )}
              </div>
            ))}
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-2xl border border-[#EBEBF5] overflow-hidden">
            <div className="p-4 border-b border-[#EBEBF5] bg-[#F4F4FC]">
              <h2 className="text-lg font-bold text-[#14121F]">📋 История операций</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-[#4A4858]">Нет операций</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#EBEBF5]">
                  <thead className="bg-[#F4F4FC]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Дата</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Тип</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Оборудование</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Откуда</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Куда</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Кол-во</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Пользователь</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBEBF5]">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F4F4FC] transition-colors">
                        <td className="px-4 py-3 text-sm text-[#4A4858]">{formatDate(tx.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            tx.transaction_type === 'add' ? 'bg-[#14121F] text-white' :
                            tx.transaction_type === 'write_off' ? 'bg-[#14121F] text-white' :
                            'bg-[#F4F4FC] text-[#14121F] border border-[#DFE1EE]'
                          }`}>
                            {getTransactionTypeLabel(tx.transaction_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#14121F]">
                          {tx.equipment_name}
                          {tx.serial_number && <span className="text-[#4A4858] ml-1 font-mono text-xs">({tx.serial_number})</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#4A4858]">{tx.from_warehouse || '—'}</td>
                        <td className="px-4 py-3 text-sm text-[#4A4858]">{tx.to_warehouse || '—'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#14121F]">{tx.quantity}</td>
                        <td className="px-4 py-3 text-sm text-[#4A4858]">{tx.created_by_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Stock */}
      {showStock && stockData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b border-[#EBEBF5] bg-[#14121F] text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  📦 Остатки: {warehouses.find(w => w.id === showStock)?.name}
                </h2>
                <button onClick={() => setShowStock(null)} className="text-white/70 hover:text-white text-2xl">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(85vh-80px)]">
              {/* Stats */}
              <div className="mb-6 p-4 bg-[#F4F4FC] rounded-xl border border-[#DFE1EE]">
                <div className="flex gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#14121F] flex items-center justify-center">
                      <span className="text-2xl">🔧</span>
                    </div>
                    <div>
                      <span className="text-[#4A4858] text-sm">Серийное оборудование</span>
                      <p className="font-bold text-[#14121F] text-xl">{stockData.serial_numbers.length} ед.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
                      <span className="text-2xl">📋</span>
                    </div>
                    <div>
                      <span className="text-[#4A4858] text-sm">Материалов на складе</span>
                      <p className="font-bold text-[#14121F] text-xl">{stockData.stock.reduce((sum, s) => sum + s.quantity, 0)} ед.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Serial numbers */}
              <div className="mb-6">
                <h3 className="font-bold text-[#14121F] mb-3 flex items-center gap-2">
                  🔧 Серийное оборудование ({stockData.serial_numbers.length} ед.)
                </h3>
                {stockData.serial_numbers.length === 0 ? (
                  <div className="text-center py-8 bg-[#F4F4FC] rounded-xl text-[#4A4858]">
                    Нет серийного оборудования
                  </div>
                ) : (
                  <div className="bg-[#F4F4FC] rounded-xl overflow-hidden border border-[#DFE1EE]">
                    <table className="min-w-full divide-y divide-[#DFE1EE]">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Серийный номер</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Оборудование</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DFE1EE]">
                        {stockData.serial_numbers.map((s) => (
                          <tr key={s.id} className="bg-white hover:bg-[#F4F4FC] transition-colors">
                            <td className="px-4 py-3 font-mono text-sm text-[#14121F]">{s.serial_number}</td>
                            <td className="px-4 py-3 text-sm text-[#4A4858]">{s.equipment.name}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                s.status === 'available' ? 'bg-[#14121F] text-white' :
                                s.status === 'in_use' ? 'bg-[#F4F4FC] text-[#14121F] border border-[#DFE1EE]' :
                                'bg-[#14121F] text-white'
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

              {/* Stock */}
              <div>
                <h3 className="font-bold text-[#14121F] mb-3 flex items-center gap-2">
                  📋 Материалы
                </h3>
                {stockData.stock.length === 0 ? (
                  <div className="text-center py-8 bg-[#F4F4FC] rounded-xl text-[#4A4858]">
                    Нет материалов
                  </div>
                ) : (
                  <div className="bg-[#F4F4FC] rounded-xl overflow-hidden border border-[#DFE1EE]">
                    <table className="min-w-full divide-y divide-[#DFE1EE]">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Материал</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Номер материала</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-[#4A4858] uppercase">Количество</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#4A4858] uppercase">Ед. изм.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DFE1EE]">
                        {stockData.stock.map((s) => (
                          <tr key={s.id} className="bg-white hover:bg-[#F4F4FC] transition-colors">
                            <td className="px-4 py-3 text-sm text-[#14121F]">{s.equipment.name}</td>
                            <td className="px-4 py-3 font-mono text-sm text-[#4A4858]">{s.equipment.material_number}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-3 py-1 bg-[#14121F] text-white rounded-lg text-sm font-bold">
                                {s.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#4A4858]">{s.equipment.unit}</td>
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

      {/* Modal: Create Warehouse */}
      {showCreateWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">🏢 Новый склад</h2>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Название *</label>
                  <input
                    type="text"
                    required
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Расположение</label>
                  <input
                    type="text"
                    value={newWarehouse.location}
                    onChange={(e) => setNewWarehouse({...newWarehouse, location: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Описание</label>
                  <textarea
                    value={newWarehouse.description}
                    onChange={(e) => setNewWarehouse({...newWarehouse, description: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    rows={2}
                  />
                </div>
                <div className="flex items-center p-3 bg-[#F4F4FC] rounded-xl border border-[#DFE1EE]">
                  <input
                    type="checkbox"
                    id="is_central"
                    checked={newWarehouse.is_central}
                    onChange={(e) => setNewWarehouse({...newWarehouse, is_central: e.target.checked})}
                    className="h-5 w-5 text-[#14121F] rounded focus:ring-[#14121F]"
                  />
                  <label htmlFor="is_central" className="ml-3 text-sm text-[#14121F] font-medium">
                    ⭐ Центральный склад
                  </label>
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateWarehouse(false)}
                  className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">↗️ Переместить оборудование</h2>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Серийный номер *</label>
                  <input
                    type="text"
                    required
                    value={transferForm.serial_number}
                    onChange={(e) => setTransferForm({...transferForm, serial_number: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white font-mono"
                    placeholder="Введите серийный номер"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">На склад *</label>
                  <select
                    required
                    value={transferForm.to_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, to_warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  >
                    <option value="">Выберите склад</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Примечания</label>
                  <input
                    type="text"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransfer(false)}
                  className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold"
                >
                  Переместить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Transfer */}
      {showBulkTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">📦 Массовое перемещение оборудования</h2>
            </div>
            
            {/* Mode toggle */}
            <div className="px-6 pt-4">
              <div className="flex gap-2 p-1 bg-[#F4F4FC] rounded-xl border border-[#DFE1EE]">
                <button
                  type="button"
                  onClick={() => {
                    setBulkTransferMode('select');
                    setSelectedSerials(new Set());
                    setBulkTransferSerials([]);
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${bulkTransferMode === 'select' ? 'bg-[#14121F] text-white' : 'text-[#4A4858] hover:text-[#14121F]'}`}
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
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${bulkTransferMode === 'text' ? 'bg-[#14121F] text-white' : 'text-[#4A4858] hover:text-[#14121F]'}`}
                >
                  📝 Ввод вручную
                </button>
              </div>
            </div>
            
            <form onSubmit={handleBulkTransfer} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-auto">
                {bulkTransferMode === 'text' ? (
                  <div>
                    <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                      Серийные номера * 
                      <span className="text-[#4A4858] font-normal ml-1">(по одному на строку или через запятую)</span>
                    </label>
                    <textarea
                      required
                      value={bulkTransferForm.serial_numbers_text}
                      onChange={(e) => setBulkTransferForm({...bulkTransferForm, serial_numbers_text: e.target.value})}
                      className="w-full px-4 py-3 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all font-mono text-sm bg-white"
                      rows={8}
                      placeholder="SN001&#10;SN002&#10;SN003&#10;или SN001, SN002, SN003"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Source warehouse */}
                    <div>
                      <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
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
                        className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                      >
                        <option value={0}>Выберите склад-источник</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.is_central ? '⭐' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Serials list */}
                    {bulkTransferWarehouse > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-semibold text-[#14121F]">
                            🔧 Выберите серийные номера ({bulkTransferSerials.length} доступно)
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={selectAllSerials}
                              className="text-xs text-[#14121F] hover:text-[#4A4858] font-medium px-2 py-1 rounded hover:bg-[#F4F4FC] transition-colors"
                            >
                              ✓ Выбрать все
                            </button>
                            <button
                              type="button"
                              onClick={clearSerialSelection}
                              className="text-xs text-[#4A4858] hover:text-[#14121F] px-2 py-1 rounded hover:bg-[#F4F4FC] transition-colors"
                            >
                              ✕ Очистить
                            </button>
                          </div>
                        </div>
                        
                        <div className="border border-[#DFE1EE] rounded-xl overflow-hidden max-h-64 overflow-auto bg-[#F4F4FC]">
                          {loadingBulkSerials ? (
                            <div className="p-8 text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#DFE1EE] border-t-[#14121F] mx-auto"></div>
                              <p className="mt-2 text-sm text-[#4A4858]">Загрузка серийников...</p>
                            </div>
                          ) : bulkTransferSerials.length === 0 ? (
                            <div className="p-8 text-center text-[#4A4858] text-sm">
                              Нет серийного оборудования на этом складе
                            </div>
                          ) : (
                            <table className="min-w-full divide-y divide-[#DFE1EE]">
                              <thead className="bg-white sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-[#4A4858] uppercase w-10">✓</th>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-[#4A4858] uppercase">Серийный номер</th>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-[#4A4858] uppercase">Оборудование</th>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-[#4A4858] uppercase">Статус</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#DFE1EE] bg-white">
                                {bulkTransferSerials.map((s) => (
                                  <tr 
                                    key={s.id} 
                                    onClick={() => toggleSerialSelection(s.serial_number)}
                                    className={`cursor-pointer transition-all ${selectedSerials.has(s.serial_number) ? 'bg-[#14121F] text-white' : 'hover:bg-[#F4F4FC]'}`}
                                  >
                                    <td className="px-4 py-2">
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedSerials.has(s.serial_number) ? 'bg-white border-white' : 'border-[#DFE1EE]'}`}>
                                        {selectedSerials.has(s.serial_number) && (
                                          <span className="text-[#14121F] text-xs">✓</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-sm">{s.serial_number}</td>
                                    <td className="px-4 py-2 text-sm">{s.equipment.name}</td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                                        s.status === 'available' ? 'bg-white/20' :
                                        s.status === 'in_use' ? 'bg-white/20' :
                                        'bg-white/20'
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
                    
                    {/* Selected count */}
                    {selectedSerials.size > 0 && (
                      <div className="p-3 bg-[#14121F] rounded-xl text-white">
                        <p className="text-sm font-medium mb-2">
                          ✓ Выбрано: {selectedSerials.size} серийных номеров
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(selectedSerials).slice(0, 15).map(sn => (
                            <span key={sn} className="px-2 py-1 bg-white/20 rounded text-xs font-mono">
                              {sn}
                            </span>
                          ))}
                          {selectedSerials.size > 15 && (
                            <span className="px-2 py-1 text-xs bg-white/20 rounded">
                              +{selectedSerials.size - 15} ещё
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Target warehouse */}
                    <div>
                      <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                        📥 На склад (назначение)
                      </label>
                      <select
                        required
                        value={targetWarehouse}
                        onChange={(e) => setTargetWarehouse(Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
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
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Примечания</label>
                  <input
                    type="text"
                    value={bulkTransferForm.notes}
                    onChange={(e) => setBulkTransferForm({...bulkTransferForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    placeholder="Комментарий к перемещению..."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkTransfer(false);
                    setSelectedSerials(new Set());
                    setBulkTransferSerials([]);
                    setTargetWarehouse(0);
                  }}
                  className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={bulkTransferMode === 'select' && selectedSerials.size === 0}
                  className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📦 Переместить {selectedSerials.size > 0 ? `(${selectedSerials.size})` : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Stock */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">➕ Поступление материалов</h2>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Оборудование *</label>
                  <select
                    required
                    value={addStockForm.equipment_id}
                    onChange={(e) => setAddStockForm({...addStockForm, equipment_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
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
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">На склад *</label>
                  <select
                    required
                    value={addStockForm.warehouse_id}
                    onChange={(e) => setAddStockForm({...addStockForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  >
                    <option value="">Выберите склад</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Количество *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={addStockForm.quantity}
                    onChange={(e) => setAddStockForm({...addStockForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Примечания</label>
                  <input
                    type="text"
                    value={addStockForm.notes}
                    onChange={(e) => setAddStockForm({...addStockForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStock(false)}
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

      {/* Modal: Write Off */}
      {showWriteOff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">🗑️ Списание материалов</h2>
            </div>
            <form onSubmit={handleWriteOff}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Серийный номер (для серийного оборудования)</label>
                  <input
                    type="text"
                    value={writeOffForm.serial_number}
                    onChange={(e) => setWriteOffForm({...writeOffForm, serial_number: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white font-mono"
                    placeholder="Оставьте пустым для несерийного"
                  />
                </div>
                {!writeOffForm.serial_number && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Оборудование *</label>
                      <select
                        required
                        value={writeOffForm.equipment_id}
                        onChange={(e) => setWriteOffForm({...writeOffForm, equipment_id: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
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
                      <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Количество *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={writeOffForm.quantity}
                        onChange={(e) => setWriteOffForm({...writeOffForm, quantity: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Со склада *</label>
                  <select
                    required
                    value={writeOffForm.warehouse_id}
                    onChange={(e) => setWriteOffForm({...writeOffForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  >
                    <option value="">Выберите склад</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">Причина списания</label>
                  <input
                    type="text"
                    value={writeOffForm.notes}
                    onChange={(e) => setWriteOffForm({...writeOffForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowWriteOff(false)}
                  className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold"
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