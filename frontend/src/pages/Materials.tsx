import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  listMaterialsWithStock, 
  createMaterial, 
  addMaterialStock,
  transferMaterial,
  getMaterialHistory,
  bulkTransferMaterials
} from '../api/materials';
import { listWarehouses } from '../api/warehouses';
import type { MaterialWithStock, MaterialCreate, Warehouse } from '../types';

interface MaterialHistory {
  id: number;
  material_id: number;
  from_warehouse_id: number | null;
  to_warehouse_id: number | null;
  from_warehouse_name: string | null;
  to_warehouse_name: string | null;
  quantity: number;
  transaction_type: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export const MaterialsPage = () => {
  const { isAdmin } = useAuth();
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Модальные окна
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddStock, setShowAddStock] = useState<number | null>(null);
  const [showTransfer, setShowTransfer] = useState<number | null>(null);
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialWithStock | null>(null);
  const [materialHistory, setMaterialHistory] = useState<MaterialHistory[]>([]);
  
  // Формы
  const [newMaterial, setNewMaterial] = useState<MaterialCreate & { initial_warehouse_id?: number; initial_quantity?: number }>({
    material_number: '',
    name: '',
    description: '',
    category: '',
    unit: 'шт',
    min_quantity: 0,
    initial_warehouse_id: 0,
    initial_quantity: 0
  });
  const [stockForm, setStockForm] = useState({
    warehouse_id: 0,
    quantity: 1,
    notes: ''
  });
  const [transferForm, setTransferForm] = useState({
    from_warehouse_id: 0,
    to_warehouse_id: 0,
    quantity: 1,
    notes: ''
  });

  // Массовое перемещение
  const [bulkFromWarehouse, setBulkFromWarehouse] = useState(0);
  const [bulkToWarehouse, setBulkToWarehouse] = useState(0);
  const [bulkNotes, setBulkNotes] = useState('');

  // Загрузка материалов
  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await listMaterialsWithStock(search);
      setMaterials(data);
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка складов
  const loadWarehouses = async () => {
    try {
      const data = await listWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  useEffect(() => {
    loadMaterials();
    loadWarehouses();
  }, [search]);

  // Создание материала
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { initial_warehouse_id, initial_quantity, ...materialData } = newMaterial;
      const created = await createMaterial(materialData);
      
      if (initial_warehouse_id && initial_quantity && initial_quantity > 0) {
        await addMaterialStock(created.id, initial_warehouse_id, initial_quantity, 'Начальный остаток');
      }
      
      setShowAddMaterial(false);
      setNewMaterial({ 
        material_number: '', 
        name: '', 
        description: '', 
        category: '', 
        unit: 'шт',
        min_quantity: 0,
        initial_warehouse_id: 0,
        initial_quantity: 0
      });
      loadMaterials();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка создания');
    }
  };

  // Добавление остатка
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddStock || stockForm.warehouse_id === 0) return;
    try {
      await addMaterialStock(
        showAddStock, 
        stockForm.warehouse_id, 
        stockForm.quantity,
        stockForm.notes
      );
      setShowAddStock(null);
      setStockForm({ warehouse_id: 0, quantity: 1, notes: '' });
      loadMaterials();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка добавления');
    }
  };

  // Перемещение
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTransfer || transferForm.to_warehouse_id === 0) return;
    try {
      await transferMaterial({
        material_id: showTransfer,
        from_warehouse_id: transferForm.from_warehouse_id || null,
        to_warehouse_id: transferForm.to_warehouse_id,
        quantity: transferForm.quantity,
        notes: transferForm.notes
      });
      setShowTransfer(null);
      setTransferForm({ from_warehouse_id: 0, to_warehouse_id: 0, quantity: 1, notes: '' });
      loadMaterials();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка перемещения');
    }
  };

  // Массовое перемещение
  const handleBulkTransfer = async () => {
    if (bulkFromWarehouse === 0 || bulkToWarehouse === 0 || bulkFromWarehouse === bulkToWarehouse) {
      alert('Выберите разные склады');
      return;
    }
    
    try {
      const transfers = materials
        .filter(m => m.warehouses?.some(w => w.warehouse_id === bulkFromWarehouse && w.quantity > 0))
        .map(m => {
          const warehouseStock = m.warehouses?.find(w => w.warehouse_id === bulkFromWarehouse);
          return {
            material_id: m.id,
            from_warehouse_id: bulkFromWarehouse,
            to_warehouse_id: bulkToWarehouse,
            quantity: warehouseStock?.quantity || 0,
            notes: bulkNotes
          };
        })
        .filter(t => t.quantity > 0);

      if (transfers.length === 0) {
        alert('Нет материалов для перемещения на выбранном складе');
        return;
      }

      const result = await bulkTransferMaterials(transfers);
      alert(`Перемещено: ${result.success}, ошибок: ${result.failed}`);
      setShowBulkTransfer(false);
      setBulkFromWarehouse(0);
      setBulkToWarehouse(0);
      setBulkNotes('');
      loadMaterials();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка перемещения');
    }
  };

  // Показать детали материала
  const handleShowDetails = async (mat: MaterialWithStock) => {
    setSelectedMaterial(mat);
    try {
      const history = await getMaterialHistory(mat.id);
      setMaterialHistory(history);
    } catch (err) {
      setMaterialHistory([]);
    }
  };

  // Открыть форму перемещения
  const openTransfer = (materialId: number, fromWarehouseId?: number) => {
    setShowTransfer(materialId);
    setTransferForm({
      from_warehouse_id: fromWarehouseId || 0,
      to_warehouse_id: 0,
      quantity: 1,
      notes: ''
    });
  };

  // Формат даты
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
          <h1 className="text-3xl font-bold text-[#14121F] mb-1">Материалы</h1>
          <p className="text-[#4A4858]">Учёт материалов без серийных номеров</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && materials.some(m => m.total_quantity > 0) && (
            <button
              onClick={() => setShowBulkTransfer(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F4F4FC] text-[#14121F] font-medium border border-[#DFE1EE] hover:bg-[#EBEBF5] hover:border-[#14121F] transition-all"
            >
              <span>↔</span> Массовое перемещение
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAddMaterial(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14121F] text-white font-medium shadow-lg hover:bg-[#2A2838] transition-all"
            >
              <span className="text-lg">+</span> Добавить материал
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{materials.length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Видов материалов</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">📋</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">
                {materials.reduce((sum, m) => sum + m.total_quantity, 0)}
              </div>
              <div className="text-sm text-[#4A4858] font-medium">Всего единиц</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">📊</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">
                {materials.filter(m => m.total_quantity > 0).length}
              </div>
              <div className="text-sm text-[#4A4858] font-medium">В наличии</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">
                {materials.filter(m => m.total_quantity === 0).length}
              </div>
              <div className="text-sm text-[#4A4858] font-medium">Отсутствует</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#DFE1EE] border-t-[#14121F]"></div>
          <p className="mt-4 text-[#4A4858] font-medium">Загрузка материалов...</p>
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
                    Ед.
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Всего
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Склады
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBF5]">
                {materials.map((mat) => (
                  <tr 
                    key={mat.id} 
                    className="hover:bg-[#F4F4FC] cursor-pointer transition-all"
                    onClick={() => handleShowDetails(mat)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm bg-[#F4F4FC] px-3 py-1.5 rounded-lg border border-[#DFE1EE] text-[#14121F]">
                        {mat.material_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-[#14121F]">{mat.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mat.category ? (
                        <span className="px-2.5 py-1 bg-[#F4F4FC] text-[#4A4858] rounded-lg text-sm border border-[#DFE1EE]">
                          {mat.category}
                        </span>
                      ) : (
                        <span className="text-[#4A4858]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-[#4A4858] font-medium">
                      {mat.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                        mat.total_quantity === 0 
                          ? 'bg-[#14121F] text-white' 
                          : 'bg-[#F4F4FC] text-[#14121F] border border-[#DFE1EE]'
                      }`}>
                        {mat.total_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-[#4A4858] bg-[#F4F4FC] px-2 py-1 rounded-lg border border-[#DFE1EE]">
                        {mat.warehouses?.length || 0} склад(ов)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => setShowAddStock(mat.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#4A4858] hover:text-white hover:bg-[#14121F] bg-[#F4F4FC] rounded-lg border border-[#DFE1EE] hover:border-[#14121F] transition-all"
                          >
                            + Приход
                          </button>
                        )}
                        {mat.total_quantity > 0 && isAdmin && (
                          <button
                            onClick={() => openTransfer(mat.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#4A4858] hover:text-white hover:bg-[#14121F] bg-[#F4F4FC] rounded-lg border border-[#DFE1EE] hover:border-[#14121F] transition-all"
                          >
                            ↔ Переместить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {materials.length === 0 && (
            <div className="text-center py-16 text-[#4A4858]">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg font-medium">Материалы не найдены</p>
              <p className="text-sm mt-1">Добавьте первый материал для начала работы</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Material Details */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[#EBEBF5]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-[#14121F]">{selectedMaterial.name}</h2>
                  <p className="text-[#4A4858] mt-1">
                    <span className="font-mono bg-[#F4F4FC] px-2 py-0.5 rounded">{selectedMaterial.material_number}</span>
                    {selectedMaterial.category && <span className="ml-2">• {selectedMaterial.category}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="text-[#4A4858] hover:text-[#14121F] text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex gap-4 mt-6">
                <div className="bg-[#F4F4FC] rounded-xl px-5 py-3 border border-[#DFE1EE]">
                  <div className="text-3xl font-bold text-[#14121F]">{selectedMaterial.total_quantity}</div>
                  <div className="text-sm text-[#4A4858]">Всего {selectedMaterial.unit}</div>
                </div>
                <div className="bg-[#F4F4FC] rounded-xl px-5 py-3 border border-[#DFE1EE]">
                  <div className="text-3xl font-bold text-[#14121F]">{selectedMaterial.warehouses?.length || 0}</div>
                  <div className="text-sm text-[#4A4858]">Складов</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {/* Warehouses */}
              <div className="mb-6">
                <h3 className="font-bold text-[#14121F] mb-3 flex items-center gap-2">
                  📍 Распределение по складам
                </h3>
                {selectedMaterial.warehouses?.length === 0 ? (
                  <div className="text-center py-8 bg-[#F4F4FC] rounded-xl text-[#4A4858]">
                    Нет остатков на складах
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMaterial.warehouses?.map((w) => (
                      <div 
                        key={w.warehouse_id}
                        className={`flex justify-between items-center p-4 rounded-xl ${
                          w.is_central 
                            ? 'bg-[#14121F] text-white' 
                            : 'bg-[#F4F4FC] border border-[#DFE1EE]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            w.is_central ? 'bg-white/20' : 'bg-white border border-[#DFE1EE]'
                          }`}>
                            <span className={w.is_central ? 'text-white' : 'text-[#4A4858]'}>{w.is_central ? '⭐' : '📦'}</span>
                          </div>
                          <div>
                            <span className={`font-semibold ${w.is_central ? 'text-white' : 'text-[#14121F]'}`}>{w.warehouse_name}</span>
                            {w.is_central && (
                              <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                                Центральный
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-bold text-xl ${w.is_central ? 'text-white' : 'text-[#14121F]'}`}>{w.quantity} <span className="text-sm font-normal text-[#4A4858]">{selectedMaterial.unit}</span></span>
                          {isAdmin && w.quantity > 0 && (
                            <button
                              onClick={() => {
                                const matId = selectedMaterial.id;
                                const whId = w.warehouse_id;
                                setSelectedMaterial(null);
                                setTimeout(() => openTransfer(matId, whId), 100);
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                w.is_central 
                                  ? 'bg-white/20 text-white hover:bg-white/30' 
                                  : 'bg-white text-[#4A4858] hover:bg-[#EBEBF5] border border-[#DFE1EE]'
                              }`}
                            >
                              Переместить
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History */}
              <div>
                <h3 className="font-bold text-[#14121F] mb-3 flex items-center gap-2">
                  📋 История движений
                </h3>
                {materialHistory.length === 0 ? (
                  <div className="text-center py-8 bg-[#F4F4FC] rounded-xl text-[#4A4858]">
                    История пуста
                  </div>
                ) : (
                  <div className="space-y-2">
                    {materialHistory.slice(0, 10).map((h) => (
                      <div key={h.id} className="text-sm p-4 bg-[#F4F4FC] rounded-xl border border-[#DFE1EE]">
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold px-3 py-1 rounded-lg ${
                            h.transaction_type === 'add' ? 'bg-[#14121F] text-white' :
                            h.transaction_type === 'transfer' ? 'bg-[#EBEBF5] text-[#14121F] border border-[#DFE1EE]' :
                            'bg-[#14121F] text-white'
                          }`}>
                            {h.transaction_type === 'add' ? '📥 Приход' :
                             h.transaction_type === 'transfer' ? '↔ Перемещение' :
                             '📤 Списание'}
                          </span>
                          <span className="text-[#4A4858] text-xs">{formatDate(h.created_at)}</span>
                        </div>
                        <div className="text-[#4A4858] mt-2 font-medium">
                          {h.transaction_type === 'add' && `+${h.quantity} на «${h.to_warehouse_name}»`}
                          {h.transaction_type === 'transfer' && `${h.quantity} с «${h.from_warehouse_name}» на «${h.to_warehouse_name}»`}
                          {h.transaction_type === 'write_off' && `-${h.quantity} с «${h.from_warehouse_name}»`}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-[#4A4858]">
                          {h.notes && <span>📝 {h.notes}</span>}
                          <span>👤 {h.created_by}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Material */}
      {showAddMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">📦 Новый материал</h2>
              <p className="text-white/70 mt-1">Создание материала с начальным остатком</p>
            </div>
            <form onSubmit={handleCreateMaterial}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                      Номер материала *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMaterial.material_number}
                      onChange={(e) => setNewMaterial({...newMaterial, material_number: e.target.value})}
                      className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                      placeholder="MAT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                      Единица измерения
                    </label>
                    <select
                      value={newMaterial.unit}
                      onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                      className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    >
                      <option value="шт">Штук</option>
                      <option value="м">Метров</option>
                      <option value="кг">Килограмм</option>
                      <option value="л">Литров</option>
                      <option value="упак">Упаковок</option>
                      <option value="компл">Комплектов</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    placeholder="Название материала"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                      Категория
                    </label>
                    <input
                      type="text"
                      value={newMaterial.category}
                      onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                      className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                      placeholder="Расходники"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                      Мин. остаток
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newMaterial.min_quantity}
                      onChange={(e) => setNewMaterial({...newMaterial, min_quantity: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Initial Stock */}
                <div className="border-t border-[#EBEBF5] pt-4 mt-4">
                  <h4 className="font-semibold text-[#14121F] mb-3 flex items-center gap-2">
                    📥 Начальный остаток (опционально)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#4A4858] mb-1.5">
                        Склад
                      </label>
                      <select
                        value={newMaterial.initial_warehouse_id}
                        onChange={(e) => setNewMaterial({...newMaterial, initial_warehouse_id: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                      >
                        <option value={0}>Не выбран</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.is_central ? '⭐' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#4A4858] mb-1.5">
                        Количество
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newMaterial.initial_quantity}
                        onChange={(e) => setNewMaterial({...newMaterial, initial_quantity: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Описание
                  </label>
                  <textarea
                    value={newMaterial.description}
                    onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    rows={2}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold"
                >
                  Создать материал
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
              <h2 className="text-2xl font-bold">📥 Приход материала</h2>
              <p className="text-white/70 mt-1">Добавить количество на склад</p>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Склад *
                  </label>
                  <select
                    required
                    value={stockForm.warehouse_id}
                    onChange={(e) => setStockForm({...stockForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  >
                    <option value={0}>Выберите склад</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Количество *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({...stockForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={stockForm.notes}
                    onChange={(e) => setStockForm({...stockForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    placeholder="Накладная №123 и т.д."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStock(null)}
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

      {/* Modal: Transfer */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">↔ Перемещение материала</h2>
              <p className="text-white/70 mt-1">Переместить между складами</p>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    📤 Со склада (источник) *
                  </label>
                  <select
                    required
                    value={transferForm.from_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, from_warehouse_id: Number(e.target.value)})}
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
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    📥 На склад (назначение) *
                  </label>
                  <select
                    required
                    value={transferForm.to_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, to_warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  >
                    <option value={0}>Выберите склад назначения</option>
                    {warehouses.filter(w => w.id !== transferForm.from_warehouse_id).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.is_central ? '⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Количество *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({...transferForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    placeholder="Причина перемещения"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransfer(null)}
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
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">🔄 Массовое перемещение</h2>
              <p className="text-white/70 mt-1">Переместить все материалы со склада на склад</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#F4F4FC] border border-[#DFE1EE] rounded-xl p-4 text-sm text-[#4A4858]">
                <p className="font-medium">⚠️ Будут перемещены все материалы со склада-источника на склад назначения.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                  📤 Со склада (источник) *
                </label>
                <select
                  value={bulkFromWarehouse}
                  onChange={(e) => setBulkFromWarehouse(Number(e.target.value))}
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
              <div>
                <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                  📥 На склад (назначение) *
                </label>
                <select
                  value={bulkToWarehouse}
                  onChange={(e) => setBulkToWarehouse(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                >
                  <option value={0}>Выберите склад назначения</option>
                  {warehouses.filter(w => w.id !== bulkFromWarehouse).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.is_central ? '⭐' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                  Примечание
                </label>
                <input
                  type="text"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  placeholder="Причина перемещения"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkTransfer(false)}
                className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
              >
                Отмена
              </button>
              <button
                onClick={handleBulkTransfer}
                className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold"
              >
                Переместить всё
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};