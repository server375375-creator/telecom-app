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
      
      // Если выбран склад и количество - добавляем приход
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

  // Массовое перемещение всех материалов со склада на склад
  const handleBulkTransfer = async () => {
    if (bulkFromWarehouse === 0 || bulkToWarehouse === 0 || bulkFromWarehouse === bulkToWarehouse) {
      alert('Выберите разные склады');
      return;
    }
    
    try {
      // Собираем все материалы со склада-источника
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

  // Проверка есть ли материалы для массового перемещения
  const hasMaterialsToTransfer = materials.some(m => m.total_quantity > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок с кнопками */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
            <span className="text-2xl">📦</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Материалы</h1>
            <p className="text-sm text-slate-500">Учёт материалов без серийных номеров</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && hasMaterialsToTransfer && (
            <button
              onClick={() => setShowBulkTransfer(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-md transition-all font-medium flex items-center gap-2"
            >
              <span>↔</span> Массовое перемещение
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAddMaterial(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-200 transition-all font-medium flex items-center gap-2"
            >
              <span className="text-lg">+</span> Добавить материал
            </button>
          )}
        </div>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или номеру материала..."
            className="w-full px-4 py-3 pl-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-amber-700">{materials.length}</div>
              <div className="text-sm text-amber-600 font-medium">Видов материалов</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-200/50 flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-emerald-700">
                {materials.reduce((sum, m) => sum + m.total_quantity, 0)}
              </div>
              <div className="text-sm text-emerald-600 font-medium">Всего единиц</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-200/50 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-700">
                {materials.filter(m => m.total_quantity > 0).length}
              </div>
              <div className="text-sm text-blue-600 font-medium">В наличии</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-200/50 flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-5 border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-rose-700">
                {materials.filter(m => m.total_quantity === 0).length}
              </div>
              <div className="text-sm text-rose-600 font-medium">Отсутствует</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-200/50 flex items-center justify-center">
              <span className="text-xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Список материалов */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
          <p className="mt-4 text-slate-500 font-medium">Загрузка материалов...</p>
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
                    Ед.
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Всего
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Склады
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((mat, idx) => (
                  <tr 
                    key={mat.id} 
                    className={`hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/50 cursor-pointer transition-all ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                    onClick={() => handleShowDetails(mat)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                        {mat.material_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{mat.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mat.category ? (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm">
                          {mat.category}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600 font-medium">
                      {mat.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1.5 rounded-xl text-sm font-bold inline-flex items-center gap-1 ${
                        mat.total_quantity === 0 
                          ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200' 
                          : mat.total_quantity < 5 
                            ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200'
                            : 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {mat.total_quantity === 0 && <span>⚠️</span>}
                        {mat.total_quantity > 0 && mat.total_quantity < 5 && <span>⚡</span>}
                        {mat.total_quantity >= 5 && <span>✓</span>}
                        {mat.total_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                        {mat.warehouses?.length || 0} склад(ов)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => setShowAddStock(mat.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-gradient-to-r hover:from-emerald-500 hover:to-green-500 bg-emerald-50 rounded-lg transition-all shadow-sm hover:shadow-md"
                          >
                            + Приход
                          </button>
                        )}
                        {mat.total_quantity > 0 && isAdmin && (
                          <button
                            onClick={() => openTransfer(mat.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-500 bg-blue-50 rounded-lg transition-all shadow-sm hover:shadow-md"
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
            <div className="text-center py-16 text-slate-400">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg font-medium">Материалы не найдены</p>
              <p className="text-sm mt-1">Добавьте первый материал для начала работы</p>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно: Детали материала */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedMaterial.name}</h2>
                  <p className="text-amber-100 mt-1">
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{selectedMaterial.material_number}</span>
                    {selectedMaterial.category && <span className="ml-2">• {selectedMaterial.category}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="text-white/80 hover:text-white text-2xl leading-none hover:bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Stats */}
              <div className="flex gap-4 mt-6">
                <div className="bg-white/20 backdrop-blur rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold">{selectedMaterial.total_quantity}</div>
                  <div className="text-sm text-amber-100">Всего {selectedMaterial.unit}</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-xl px-5 py-3">
                  <div className="text-3xl font-bold">{selectedMaterial.warehouses?.length || 0}</div>
                  <div className="text-sm text-amber-100">Складов</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Распределение по складам */}
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">📍</span>
                  Распределение по складам
                </h3>
                {selectedMaterial.warehouses?.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400">
                    Нет остатков на складах
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {selectedMaterial.warehouses?.map((w) => (
                      <div 
                        key={w.warehouse_id}
                        className={`flex justify-between items-center p-4 rounded-xl transition-all ${
                          w.is_central 
                            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200' 
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            w.is_central ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {w.is_central ? '⭐' : '📦'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">{w.warehouse_name}</span>
                            {w.is_central && (
                              <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                                Центральный
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-xl text-amber-700">{w.quantity} <span className="text-sm font-normal text-slate-500">{selectedMaterial.unit}</span></span>
                          {isAdmin && w.quantity > 0 && (
                            <button
                              onClick={() => {
                                const matId = selectedMaterial.id;
                                const whId = w.warehouse_id;
                                setSelectedMaterial(null);
                                setTimeout(() => openTransfer(matId, whId), 100);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-500 bg-blue-50 rounded-lg transition-all"
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

              {/* История движений */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">📋</span>
                  История движений
                </h3>
                {materialHistory.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400">
                    История пуста
                  </div>
                ) : (
                  <div className="space-y-2">
                    {materialHistory.slice(0, 10).map((h) => (
                      <div key={h.id} className="text-sm p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold px-3 py-1 rounded-lg ${
                            h.transaction_type === 'add' ? 'bg-emerald-100 text-emerald-700' :
                            h.transaction_type === 'transfer' ? 'bg-blue-100 text-blue-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {h.transaction_type === 'add' ? '📥 Приход' :
                             h.transaction_type === 'transfer' ? '↔ Перемещение' :
                             '📤 Списание'}
                          </span>
                          <span className="text-slate-400 text-xs">{formatDate(h.created_at)}</span>
                        </div>
                        <div className="text-slate-600 mt-2 font-medium">
                          {h.transaction_type === 'add' && `+${h.quantity} на «${h.to_warehouse_name}»`}
                          {h.transaction_type === 'transfer' && `${h.quantity} с «${h.from_warehouse_name}» на «${h.to_warehouse_name}»`}
                          {h.transaction_type === 'write_off' && `-${h.quantity} с «${h.from_warehouse_name}»`}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-slate-400">
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

      {/* Модальное окно: Добавить материал */}
      {showAddMaterial && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white">
              <h2 className="text-2xl font-bold">📦 Новый материал</h2>
              <p className="text-amber-100 mt-1">Создание материала с начальным остатком</p>
            </div>
            <form onSubmit={handleCreateMaterial}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Номер материала *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMaterial.material_number}
                      onChange={(e) => setNewMaterial({...newMaterial, material_number: e.target.value})}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50"
                      placeholder="MAT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Единица измерения
                    </label>
                    <select
                      value={newMaterial.unit}
                      onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50"
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50"
                    placeholder="Название материала"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Категория
                    </label>
                    <input
                      type="text"
                      value={newMaterial.category}
                      onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50"
                      placeholder="Расходники"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Мин. остаток
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newMaterial.min_quantity}
                      onChange={(e) => setNewMaterial({...newMaterial, min_quantity: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Начальный остаток */}
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-green-100 flex items-center justify-center text-sm">📥</span>
                    Начальный остаток (опционально)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">
                        Склад
                      </label>
                      <select
                        value={newMaterial.initial_warehouse_id}
                        onChange={(e) => setNewMaterial({...newMaterial, initial_warehouse_id: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-slate-50"
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
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">
                        Количество
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newMaterial.initial_quantity}
                        onChange={(e) => setNewMaterial({...newMaterial, initial_quantity: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-slate-50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Описание
                  </label>
                  <textarea
                    value={newMaterial.description}
                    onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50"
                    rows={2}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-lg transition-all font-semibold"
                >
                  Создать материал
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Добавить остаток */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white">
              <h2 className="text-2xl font-bold">📥 Приход материала</h2>
              <p className="text-emerald-100 mt-1">Добавить количество на склад</p>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Склад *
                  </label>
                  <select
                    required
                    value={stockForm.warehouse_id}
                    onChange={(e) => setStockForm({...stockForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50"
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Количество *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({...stockForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={stockForm.notes}
                    onChange={(e) => setStockForm({...stockForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50"
                    placeholder="Накладная №123 и т.д."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStock(null)}
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

      {/* Модальное окно: Перемещение */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <h2 className="text-2xl font-bold">↔ Перемещение материала</h2>
              <p className="text-blue-100 mt-1">Переместить между складами</p>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    📤 Со склада (источник) *
                  </label>
                  <select
                    required
                    value={transferForm.from_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, from_warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50"
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    📥 На склад (назначение) *
                  </label>
                  <select
                    required
                    value={transferForm.to_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, to_warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50"
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Количество *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({...transferForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50"
                    placeholder="Причина перемещения"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransfer(null)}
                  className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg transition-all font-semibold"
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-violet-500 to-purple-500 text-white">
              <h2 className="text-2xl font-bold">🔄 Массовое перемещение</h2>
              <p className="text-violet-100 mt-1">Переместить все материалы со склада на склад</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-700">
                <p className="font-medium">⚠️ Будут перемещены все материалы со склада-источника на склад назначения.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  📤 Со склада (источник) *
                </label>
                <select
                  value={bulkFromWarehouse}
                  onChange={(e) => setBulkFromWarehouse(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50"
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  📥 На склад (назначение) *
                </label>
                <select
                  value={bulkToWarehouse}
                  onChange={(e) => setBulkToWarehouse(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50"
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Примечание
                </label>
                <input
                  type="text"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50"
                  placeholder="Причина перемещения"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkTransfer(false)}
                className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
              >
                Отмена
              </button>
              <button
                onClick={handleBulkTransfer}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 shadow-lg transition-all font-semibold"
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