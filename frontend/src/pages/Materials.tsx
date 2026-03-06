import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  listMaterialsWithStock, 
  createMaterial, 
  addMaterialStock,
  transferMaterial,
  getMaterialHistory
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
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialWithStock | null>(null);
  const [materialHistory, setMaterialHistory] = useState<MaterialHistory[]>([]);
  
  // Формы
  const [newMaterial, setNewMaterial] = useState<MaterialCreate>({
    material_number: '',
    name: '',
    description: '',
    category: '',
    unit: 'шт',
    min_quantity: 0
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
      await createMaterial(newMaterial);
      setShowAddMaterial(false);
      setNewMaterial({ 
        material_number: '', 
        name: '', 
        description: '', 
        category: '', 
        unit: 'шt',
        min_quantity: 0 
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
    <div className="p-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            📦 Материалы
          </h1>
          <p className="text-sm text-slate-500 mt-1">Учёт материалов без серийных номеров</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddMaterial(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-200 transition-all font-medium flex items-center gap-2"
          >
            <span className="text-lg">+</span> Добавить материал
          </button>
        )}
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Поиск по названию или номеру материала..."
            className="w-full px-4 py-3 pl-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white/70 backdrop-blur"
          />
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
          <div className="text-2xl font-bold text-amber-700">{materials.length}</div>
          <div className="text-sm text-amber-600">Видов материалов</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <div className="text-2xl font-bold text-green-700">
            {materials.reduce((sum, m) => sum + m.total_quantity, 0)}
          </div>
          <div className="text-sm text-green-600">Всего единиц</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">
            {materials.filter(m => m.total_quantity > 0).length}
          </div>
          <div className="text-sm text-blue-600">В наличии</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
          <div className="text-2xl font-bold text-red-700">
            {materials.filter(m => m.total_quantity === 0).length}
          </div>
          <div className="text-sm text-red-600">Отсутствует</div>
        </div>
      </div>

      {/* Список материалов */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="mt-4 text-slate-500">Загрузка материалов...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Номер материала
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ед.
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Всего
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Склады
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((mat) => (
                  <tr 
                    key={mat.id} 
                    className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                    onClick={() => handleShowDetails(mat)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                        {mat.material_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                      {mat.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {mat.category || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">
                      {mat.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        mat.total_quantity === 0 
                          ? 'bg-red-100 text-red-700' 
                          : mat.total_quantity < 5 
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {mat.total_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-slate-500">
                        {mat.warehouses?.length || 0} склад(ов)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => setShowAddStock(mat.id)}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            + Приход
                          </button>
                        )}
                        {mat.total_quantity > 0 && isAdmin && (
                          <button
                            onClick={() => openTransfer(mat.id)}
                            className="px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
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
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📭</div>
              Материалы не найдены
            </div>
          )}
        </div>
      )}

      {/* Модальное окно: Детали материала */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedMaterial.name}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Номер материала: <span className="font-mono">{selectedMaterial.material_number}</span>
                    {selectedMaterial.category && ` • Категория: ${selectedMaterial.category}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
              
              {/* Stats */}
              <div className="flex gap-4 mt-4">
                <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
                  <div className="text-2xl font-bold text-amber-600">{selectedMaterial.total_quantity}</div>
                  <div className="text-xs text-slate-500">Всего {selectedMaterial.unit}</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Распределение по складам */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span>📍</span> Распределение по складам
                </h3>
                {selectedMaterial.warehouses?.length === 0 ? (
                  <p className="text-slate-400 text-sm">Нет остатков на складах</p>
                ) : (
                  <div className="grid gap-2">
                    {selectedMaterial.warehouses?.map((w) => (
                      <div 
                        key={w.warehouse_id}
                        className={`flex justify-between items-center p-3 rounded-xl ${
                          w.is_central ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{w.warehouse_name}</span>
                          {w.is_central && (
                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                              ⭐ Центральный
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-amber-700">{w.quantity} {selectedMaterial.unit}</span>
                          {isAdmin && w.quantity > 0 && (
                            <button
                              onClick={() => {
                                setSelectedMaterial(null);
                                openTransfer(selectedMaterial.id, w.warehouse_id);
                              }}
                              className="text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-100 px-2 py-1 rounded"
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
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span>📋</span> История движений
                </h3>
                {materialHistory.length === 0 ? (
                  <p className="text-slate-400 text-sm">История пуста</p>
                ) : (
                  <div className="space-y-2">
                    {materialHistory.slice(0, 10).map((h) => (
                      <div key={h.id} className="text-sm p-3 bg-slate-50 rounded-xl">
                        <div className="flex justify-between">
                          <span className={`font-medium ${
                            h.transaction_type === 'add' ? 'text-green-600' :
                            h.transaction_type === 'transfer' ? 'text-blue-600' :
                            'text-red-600'
                          }`}>
                            {h.transaction_type === 'add' ? '📥 Приход' :
                             h.transaction_type === 'transfer' ? '↔ Перемещение' :
                             '📤 Списание'}
                          </span>
                          <span className="text-slate-400">{formatDate(h.created_at)}</span>
                        </div>
                        <div className="text-slate-600 mt-1">
                          {h.transaction_type === 'add' && `+${h.quantity} на "${h.to_warehouse_name}"`}
                          {h.transaction_type === 'transfer' && `${h.quantity} с "${h.from_warehouse_name}" на "${h.to_warehouse_name}"`}
                          {h.transaction_type === 'write_off' && `-${h.quantity} с "${h.from_warehouse_name}"`}
                        </div>
                        {h.notes && <div className="text-slate-400 text-xs mt-1">📝 {h.notes}</div>}
                        <div className="text-slate-400 text-xs mt-1">👤 {h.created_by}</div>
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
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <h2 className="text-xl font-bold text-slate-800">📦 Новый материал</h2>
              <p className="text-sm text-slate-500 mt-1">Материал без серийных номеров</p>
            </div>
            <form onSubmit={handleCreateMaterial}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Номер материала *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMaterial.material_number}
                      onChange={(e) => setNewMaterial({...newMaterial, material_number: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-slate-50"
                      placeholder="MAT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Единица измерения
                    </label>
                    <select
                      value={newMaterial.unit}
                      onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-slate-50"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-slate-50"
                    placeholder="Название материала"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Категория
                  </label>
                  <input
                    type="text"
                    value={newMaterial.category}
                    onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-slate-50"
                    placeholder="Расходники, Инструменты и т.д."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Минимальный остаток
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMaterial.min_quantity}
                    onChange={(e) => setNewMaterial({...newMaterial, min_quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-slate-50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Описание
                  </label>
                  <textarea
                    value={newMaterial.description}
                    onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-slate-50"
                    rows={2}
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-medium text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-md transition-all font-medium"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: Добавить остаток */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <h2 className="text-xl font-bold text-slate-800">📥 Приход материала</h2>
              <p className="text-sm text-slate-500 mt-1">Добавить количество на склад</p>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Склад *
                  </label>
                  <select
                    required
                    value={stockForm.warehouse_id}
                    onChange={(e) => setStockForm({...stockForm, warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-slate-50"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Количество *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({...stockForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={stockForm.notes}
                    onChange={(e) => setStockForm({...stockForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-slate-50"
                    placeholder="Накладная №123 и т.д."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStock(null)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-medium text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 shadow-md transition-all font-medium"
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
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-slate-800">↔ Перемещение материала</h2>
              <p className="text-sm text-slate-500 mt-1">Переместить между складами</p>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    📤 Со склада (источник)
                  </label>
                  <select
                    value={transferForm.from_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, from_warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    📥 На склад (назначение) *
                  </label>
                  <select
                    required
                    value={transferForm.to_warehouse_id}
                    onChange={(e) => setTransferForm({...transferForm, to_warehouse_id: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Количество *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({...transferForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Примечание
                  </label>
                  <input
                    type="text"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
                    placeholder="Причина перемещения"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransfer(null)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-medium text-slate-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-md transition-all font-medium"
                >
                  Переместить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};