import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listUsers, createUserWithRole, updateUserRole, assignUserWarehouse, toggleUserActive, changeUserPassword, deleteUser } from '../api/equipment';
import { listWarehouses } from '../api/warehouses';
import { ROLE_LABELS } from '../types';
import type { Warehouse } from '../types';

interface User {
  id: number;
  username: string;
  role: string;
  warehouse_id: number | null;
  warehouse_name: string | null;
  is_active: boolean;
}

// Описание ролей
const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Полный доступ ко всем функциям системы',
  technician: 'Доступ к складу и оборудованию',
  accountant: 'Просмотр финансовой отчётности',
  finance_director: 'Управление финансами и отчётностью',
  tech_director: 'Управление технической частью',
  economist: 'Анализ и планирование',
};

export const UsersPage = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'technician'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, warehousesData] = await Promise.all([
        listUsers(),
        listWarehouses()
      ]);
      setUsers(usersData);
      setWarehouses(warehousesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserWithRole(newUser.username, newUser.password, newUser.role);
      setNewUser({ username: '', password: '', role: 'technician' });
      setShowCreateUser(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка создания пользователя');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка изменения роли');
    }
  };

  const handleWarehouseChange = async (userId: number, warehouseId: number | null) => {
    try {
      await assignUserWarehouse(userId, warehouseId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка привязки склада');
    }
  };

  const handleActiveChange = async (userId: number, isActive: boolean) => {
    try {
      await toggleUserActive(userId, isActive);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка изменения статуса');
    }
  };

  const handlePasswordChange = async () => {
    if (!editingUserId || !newPassword) return;
    if (newPassword.length < 4) {
      alert('Пароль должен быть минимум 4 символа');
      return;
    }
    try {
      await changeUserPassword(editingUserId, newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setEditingUserId(null);
      alert('Пароль успешно изменён');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка изменения пароля');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Удалить пользователя "${username}"?`)) return;
    try {
      await deleteUser(userId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка удаления пользователя');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-[#14121F] border-2 border-[#14121F] rounded-2xl p-8 text-center text-white">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-bold mb-2">Доступ запрещён</h2>
          <p className="text-white/70">Только администратор может управлять пользователями.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#14121F] mb-1">Пользователи</h1>
          <p className="text-[#4A4858]">Управление доступом и ролями</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRoleInfo(true)}
            className="px-4 py-2.5 rounded-xl bg-[#F4F4FC] text-[#14121F] font-medium border border-[#DFE1EE] hover:bg-[#EBEBF5] hover:border-[#14121F] transition-all"
          >
            📖 Справка ролей
          </button>
          <button
            onClick={() => setShowCreateUser(true)}
            className="px-5 py-2.5 rounded-xl bg-[#14121F] text-white font-medium shadow-lg hover:bg-[#2A2838] transition-all"
          >
            + Создать пользователя
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{users.length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Всего пользователей</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">👥</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{users.filter(u => u.is_active).length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Активных</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{users.filter(u => u.role === 'admin').length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Администраторов</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">👑</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBF5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-[#14121F]">{users.filter(u => u.role === 'technician').length}</div>
              <div className="text-sm text-[#4A4858] font-medium">Техников</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-xl">🔧</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#DFE1EE] border-t-[#14121F]"></div>
          <p className="mt-4 text-[#4A4858] font-medium">Загрузка пользователей...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EBEBF5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#EBEBF5]">
              <thead className="bg-[#F4F4FC]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Пользователь</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Роль</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Склад</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-[#4A4858] uppercase tracking-wider">Статус</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#4A4858] uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBF5]">
                {users.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`transition-all hover:bg-[#F4F4FC] ${!user.is_active ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#14121F] flex items-center justify-center">
                          <span className="text-white font-bold">{user.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-[#14121F]">{user.username}</div>
                          <div className="text-xs text-[#4A4858]">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          user.role === 'admin' 
                            ? 'bg-[#14121F] text-white' 
                            : 'bg-[#F4F4FC] text-[#14121F] border border-[#DFE1EE]'
                        }`}
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value} className="bg-white text-[#14121F]">{label}</option>
                        ))}
                        <option value="admin" className="bg-white text-[#14121F]">Администратор</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.warehouse_id || ''}
                        onChange={(e) => handleWarehouseChange(user.id, e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-[#DFE1EE] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#14121F] focus:border-transparent"
                      >
                        <option value="">Не привязан</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.is_central ? '⭐' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleActiveChange(user.id, !user.is_active)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          user.is_active 
                            ? 'bg-[#14121F] text-white' 
                            : 'bg-[#F4F4FC] text-[#4A4858] border border-[#DFE1EE]'
                        }`}
                      >
                        {user.is_active ? '✓ Активен' : '⏸ Неактивен'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingUserId(user.id);
                            setNewPassword('');
                            setShowPasswordModal(true);
                          }}
                          className="px-3 py-2 text-sm font-medium text-[#4A4858] hover:text-white hover:bg-[#14121F] bg-[#F4F4FC] rounded-lg border border-[#DFE1EE] hover:border-[#14121F] transition-all"
                        >
                          🔑
                        </button>
                        {currentUser?.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="px-3 py-2 text-sm font-medium text-[#4A4858] hover:text-white hover:bg-[#14121F] bg-[#F4F4FC] rounded-lg border border-[#DFE1EE] hover:border-[#14121F] transition-all"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-16 text-[#4A4858]">
              <div className="text-6xl mb-4">👤</div>
              <p className="text-lg font-medium">Пользователи не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Role Info */}
      {showRoleInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">📖 Справочник ролей</h2>
                <button
                  onClick={() => setShowRoleInfo(false)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-white/70 mt-1">Описание прав доступа для каждой роли</p>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh]">
              <div className="space-y-4">
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <div 
                    key={value}
                    className="p-5 rounded-2xl bg-[#F4F4FC] border border-[#DFE1EE]"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">👤</span>
                      <span className="text-lg font-bold text-[#14121F]">{label}</span>
                    </div>
                    <p className="text-[#4A4858] text-sm ml-10">
                      {ROLE_DESCRIPTIONS[value] || 'Стандартный доступ'}
                    </p>
                  </div>
                ))}
                {/* Admin */}
                <div className="p-5 rounded-2xl bg-[#14121F] text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">👑</span>
                    <span className="text-lg font-bold">Администратор</span>
                  </div>
                  <p className="text-white/70 text-sm ml-10">
                    Полный доступ ко всем функциям: управление пользователями, складами, оборудованием и настройками системы
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">👤 Новый пользователь</h2>
              <p className="text-white/70 mt-1">Создание учётной записи</p>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Имя пользователя *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    placeholder="Введите логин"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Пароль *
                  </label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                    placeholder="Минимум 4 символа"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                    Роль
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
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

      {/* Modal: Change Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 bg-[#14121F] text-white">
              <h2 className="text-2xl font-bold">🔑 Изменить пароль</h2>
              <p className="text-white/70 mt-1">Установка нового пароля</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#14121F] mb-1.5">
                  Новый пароль *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white"
                  placeholder="Минимум 4 символа"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#EBEBF5] bg-[#F4F4FC] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setEditingUserId(null);
                }}
                className="px-5 py-2.5 border border-[#DFE1EE] rounded-xl hover:bg-white transition-colors font-semibold text-[#4A4858]"
              >
                Отмена
              </button>
              <button
                onClick={handlePasswordChange}
                className="px-6 py-2.5 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] shadow-lg transition-all font-semibold"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};