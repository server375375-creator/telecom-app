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

  // Состояния для уведомлений
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Загрузка материалов
  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await listMaterialsWithStock(search);
      setMaterials(data);
    } catch (err) {
      console.error('Failed to load materials:', err);
      showNotification('error', 'Ошибка загрузки материалов');
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
    
    if (!newMaterial.material_number.trim()) {
      showNotification('error', 'Введите номер материала');
      return;
    }
    if (!newMaterial.name.trim()) {
      showNotification('error', 'Введите название материала');
      return;
    }
    
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
      showNotification('success', 'Материал успешно создан');
      loadMaterials();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Ошибка создания материала';
      showNotification('error', errorMsg);
    }
  };

  // Добавление остатка
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddStock) return;
    if (stockForm.warehouse_id === 0) {
      showNotification('error', 'Выберите склад');
      return;
    }
    if (stockForm.quantity <= 0) {
      showNotification('error', 'Количество должно быть больше 0');
      return;
    }
    
    try {
      await addMaterialStock(
        showAddStock, 
        stockForm.warehouse_id, 
        stockForm.quantity,
        stockForm.notes
      );
      setShowAddStock(null);
      setStockForm({ warehouse_id: 0, quantity: 1, notes: '' });
      showNotification('success', 'Приход успешно добавлен');
      loadMaterials();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка добавления');
    }
  };

  // Перемещение
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTransfer) return;
    if (transferForm.from_warehouse_id === 0) {
      showNotification('error', 'Выберите склад-источник');
      return;
    }
    if (transferForm.to_warehouse_id === 0) {
      showNotification('error', 'Выберите склад назначения');
      return;
    }
    if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
      showNotification('error', 'Склады должны быть разными');
      return;
    }
    if (transferForm.quantity <= 0) {
      showNotification('error', 'Количество должно быть больше 0');
      return;
    }
    
    try {
      await transferMaterial({
        material_id: showTransfer,
        from_warehouse_id: transferForm.from_warehouse_id,
        to_warehouse_id: transferForm.to_warehouse_id,
        quantity: transferForm.quantity,
        notes: transferForm.notes
      });
      setShowTransfer(null);
      setTransferForm({ from_warehouse_id: 0, to_warehouse_id: 0, quantity: 1, notes: '' });
      showNotification('success', 'Материал успешно перемещён');
      loadMaterials();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка перемещения');
    }
  };

  // Массовое перемещение
  const handleBulkTransfer = async () => {
    if (bulkFromWarehouse === 0 || bulkToWarehouse === 0 || bulkFromWarehouse === bulkToWarehouse) {
      showNotification('error', 'Выберите разные склады');
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
        showNotification('error', 'Нет материалов для перемещения на выбранном складе');
        return;
      }

      const result = await bulkTransferMaterials(transfers);
      showNotification('success', `Перемещено: ${result.success}, ошибок: ${result.failed}`);
      setShowBulkTransfer(false);
      setBulkFromWarehouse(0);
      setBulkToWarehouse(0);
      setBulkNotes('');
      loadMaterials();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка перемещения');
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
    <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' 
            : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
        }`}>
          <span className="text-lg">{notification.type === 'success' ? '✓' : '⚠️'}</span>
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">📦 Материалы</h1>
          <p className="text-slate-500 text-sm mt-1">Учёт материалов без серийных номеров</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && materials.some(m => m.total_quantity > 0) && (
            <button
              onClick={() => setShowBulkTransfer(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2.5 rounded-xl hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/30 transition-all duration-200 font-medium flex items-center gap-2"
            >
              <span>↔</span> Массовое перемещение
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAddMaterial(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/30 transition-all duration-200 font-medium flex items-center gap-2"
            >
              <span className="text-lg">+</span> Добавить материал
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или номеру..."
            className="w-full px-4 py-3 pl-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
              <span className="text-xl text-white">📋</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{materials.length}</div>
              <div className="text-sm text-slate-500">Видов материалов</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <span className="text-xl text-white">📊</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {materials.reduce((sum, m) => sum + m.total_quantity, 0)}
              </div>
              <div className="text-sm text-slate-500">Всего единиц</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
              <span className="text-xl text-white">✓</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {materials.filter(m => m.total_quantity > 0).length}
              </div>
              <div className="text-sm text-slate-500">В наличии</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-md">
              <span className="text-xl text-white">⚠️</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {materials.filter(m => m.total_quantity === 0).length}
              </div>
              <div className="text-sm text-slate-500">Отсутствует</div>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-amber-500"></div>
          <p className="mt-4 text-slate-500 font-medium">Загрузка материалов...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl font-semibold text-slate-700 mb-2">Материалы не найдены</p>
          <p className="text-slate-500 mb-6">Добавьте первый материал для начала работы</p>
          {isAdmin && (
            <button
              onClick={() => setShowAddMaterial(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-700 transition-all font-medium"
            >
              + Добавить материал
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => (
            <div 
              key={mat.id} 
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden cursor-pointer group"
              onClick={() => handleShowDetails(mat)}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-50 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="inline-block font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-600 mb-2">
                      {mat.material_number}
                    </span>
                    <h3 className="font-semibold text-slate-800 text-lg leading-tight">{mat.name}</h3>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ml-3 ${
                    mat.total_quantity === 0 
                      ? 'bg-slate-100 text-slate-500' 
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'
                  }`}>
                    {mat.total_quantity}
                  </div>
                </div>
                {mat.category && (
                  <span className="inline-block mt-2 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                    {mat.category}
                  </span>
                )}
              </div>
              
              {/* Card Body */}
              <div className="p-4">
                <div className="flex justify-between items-center text-sm mb-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>📦</span>
                    <span>{mat.warehouses?.length || 0} склад(ов)</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">{mat.unit}</span>
                </div>
                
                {/* Warehouses Preview */}
                {mat.warehouses && mat.warehouses.length > 0 && (
                  <div className="space-y-1 border-t border-slate-100 pt-3">
                    {mat.warehouses.slice(0, 2).map((w) => (
                      <div key={w.warehouse_id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 truncate flex-1">
                          {w.is_central ? '⭐ ' : ''}{w.warehouse_name}
                        </span>
                        <span className="font-semibold text-slate-700 ml-2">{w.quantity}</span>
                      </div>
                    ))}
                    {mat.warehouses.length > 2 && (
                      <p className="text-xs text-slate-400">+ ещё {mat.warehouses.length - 2} складов</p>
                    )}
                  </div>
                )}
                
                {/* Actions */}
                {isAdmin && (
                  <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShowAddStock(mat.id)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      + Приход
                    </button>
                    {mat.total_quantity > 0 && (
                      <button
                        onClick={() => openTransfer(mat.id)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        ↔ Переместить
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Material Details */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded-lg text-slate-600">
                    {selectedMaterial.material_number}
                  </span>
                  {selectedMaterial.category && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                      {selectedMaterial.category}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedMaterial.name}</h2>
                {selectedMaterial.description && (
                  <p className="text-slate-500 mt-1">{selectedMaterial.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
                  <div className="text-3xl font-bold">{selectedMaterial.total_quantity}</div>
                  <div className="text-sm text-emerald-100">Всего {selectedMaterial.unit}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white shadow-lg">
                  <div className="text-3xl font-bold">{selectedMaterial.warehouses?.length || 0}</div>
                  <div className="text-sm text-blue-100">Складов</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
                  <div className="text-3xl font-bold">{selectedMaterial.min_quantity || 0}</div>
                  <div className="text-sm text-amber-100">Мин. остаток</div>
                </div>
              </div>

              {/* Warehouses */}
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  📍 Распределение по складам
                </h3>
                {!selectedMaterial.warehouses || selectedMaterial.warehouses.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-500">
                    Нет остатков на складах
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMaterial.warehouses.map((w) => (
                      <div 
                        key={w.warehouse_id}
                        className={`flex justify-between items-center p-4 rounded-xl transition-all ${
                          w.is_central 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' 
                            : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            w.is_central ? 'bg-white/20' : 'bg-white border border-slate-200'
                          }`}>
                            <span className={w.is_central ? 'text-white' : 'text-amber-500'}>{w.is_central ? '⭐' : '📦'}</span>
                          </div>
                          <div>
                            <span className={`font-semibold ${w.is_central ? 'text-white' : 'text-slate-800'}`}>{w.warehouse_name}</span>
                            {w.is_central && (
                              <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                                Центральный
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-bold text-xl ${w.is_central ? 'text-white' : 'text-slate-800'}`}>
                            {w.quantity} <span className={`text-sm font-normal ${w.is_central ? 'text-amber-100' : 'text-slate-500'}`}>{selectedMaterial.unit}</span>
                          </span>
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
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  📋 История движений
                </h3>
                {materialHistory.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-500">
                    История пуста
                  </div>
                ) : (
                  <div className="space-y-2">
                    {materialHistory.slice(0, 10).map((h) => (
                      <div key={h.id} className="text-sm p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-semibold px-3 py-1 rounded-lg text-xs ${
                            h.transaction_type === 'add' ? 'bg-emerald-100 text-emerald-700' :
                            h.transaction_type === 'transfer' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {h.transaction_type === 'add' ? '📥 Приход' :
                             h.transaction_type === 'transfer' ? '↔ Перемещение' :
                             '📤 Списание'}
                          </span>
                          <span className="text-slate-500 text-xs">{formatDate(h.created_at)}</span>
                        </div>
                        <div className="text-slate-600 font-medium">
                          {h.transaction_type === 'add' && `+${h.quantity} на «${h.to_warehouse_name}»`}
                          {h.transaction_type === 'transfer' && `${h.quantity} с «${h.from_warehouse_name}» на «${h.to_warehouse_name}»`}
                          {h.transaction_type === 'write_off' && `-${h.quantity} с «${h.from_warehouse_name}»`}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              <h2 className="text-xl font-bold">📦 Новый материал</h2>
              <p className="text-amber-100 text-sm mt-1">Создание материала с начальным остатком</p>
            </div>
            <form onSubmit={handleCreateMaterial}>
              <div className="p-5 space-y-4">
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
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
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
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
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
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
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
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Initial Stock */}
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    📥 Начальный остаток (опционально)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">
                        Склад
                      </label>
                      <select
                        value={newMaterial.initial_warehouse_id}
                        onChange={(e) => setNewMaterial({...newMaterial, initial_warehouse_id: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
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
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
                    rows={2}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg transition-all font-semibold"
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <h2 className="text-xl font-bold">📥 Приход материала</h2>
              <p className="text-emerald-100 text-sm mt-1">Добавить количество на склад</p>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Склад *
                  </label>
                  <select
                    required
                    value={stockForm.warehouse_id}
                    onChange={(e) => setStockForm({...stockForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
                    placeholder="Накладная №123 и т.д."
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStock(null)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-lg transition-all font-semibold"
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="p-5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
              <h2 className="text-xl font-bold">↔ Перемещение материала</h2>
              <p className="text-blue-100 text-sm mt-1">Переместить между складами</p>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    📤 Со склада (источник) *
                  </label>
                  <select
                    required
                    value={transferForm.from_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, from_warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    placeholder="Причина перемещения"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransfer(null)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 shadow-lg transition-all font-semibold"
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="p-5 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <h2 className="text-xl font-bold">🔄 Массовое перемещение</h2>
              <p className="text-purple-100 text-sm mt-1">Переместить все материалы со склада на склад</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                <p className="font-medium flex items-center gap-2">
                  <span>⚠️</span> Внимание!
                </p>
                <p className="mt-1">Будут перемещены все материалы со склада-источника на склад назначения.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  📤 Со склада (источник) *
                </label>
                <select
                  value={bulkFromWarehouse}
                  onChange={(e) => setBulkFromWarehouse(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                  placeholder="Причина перемещения"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkTransfer(false)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600"
              >
                Отмена
              </button>
              <button
                onClick={handleBulkTransfer}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 shadow-lg transition-all font-semibold"
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