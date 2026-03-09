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

// Цвета для ролей
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  admin: { bg: 'bg-gradient-to-r from-red-100 to-rose-100', text: 'text-red-700', border: 'border-red-300', icon: '👑' },
  technician: { bg: 'bg-gradient-to-r from-blue-100 to-indigo-100', text: 'text-blue-700', border: 'border-blue-300', icon: '🔧' },
  accountant: { bg: 'bg-gradient-to-r from-emerald-100 to-green-100', text: 'text-emerald-700', border: 'border-emerald-300', icon: '📊' },
  finance_director: { bg: 'bg-gradient-to-r from-purple-100 to-violet-100', text: 'text-purple-700', border: 'border-purple-300', icon: '💼' },
  tech_director: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100', text: 'text-amber-700', border: 'border-amber-300', icon: '🏗️' },
  economist: { bg: 'bg-gradient-to-r from-cyan-100 to-teal-100', text: 'text-cyan-700', border: 'border-cyan-300', icon: '📈' },
};

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
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'technician'
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

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
      showNotification('success', 'Пользователь успешно создан');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка создания пользователя');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      showNotification('success', 'Роль успешно изменена');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка изменения роли');
    }
  };

  const handleWarehouseChange = async (userId: number, warehouseId: number | null) => {
    try {
      await assignUserWarehouse(userId, warehouseId);
      showNotification('success', 'Склад успешно привязан');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка привязки склада');
    }
  };

  const handleActiveChange = async (userId: number, isActive: boolean) => {
    try {
      await toggleUserActive(userId, isActive);
      showNotification('success', isActive ? 'Пользователь активирован' : 'Пользователь деактивирован');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка изменения статуса');
    }
  };

  const handlePasswordChange = async () => {
    if (!editingUserId || !newPassword) return;
    if (newPassword.length < 4) {
      showNotification('error', 'Пароль должен быть минимум 4 символа');
      return;
    }
    try {
      await changeUserPassword(editingUserId, newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setEditingUserId(null);
      showNotification('success', 'Пароль успешно изменён');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка изменения пароля');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Удалить пользователя "${username}"?`)) return;
    try {
      await deleteUser(userId);
      showNotification('success', 'Пользователь успешно удалён');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Ошибка удаления пользователя');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-8 text-center shadow-lg">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Доступ запрещён</h2>
            <p className="text-red-600">Только администратор может управлять пользователями.</p>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">👥 Пользователи</h1>
            <p className="text-slate-500 text-sm mt-1">Управление доступом и ролями</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRoleInfo(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center gap-2 shadow-sm"
            >
              <span>📖</span> Справка
            </button>
            <button
              onClick={() => setShowCreateUser(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 shadow-lg shadow-purple-500/30 transition-all font-medium flex items-center gap-2"
            >
              <span className="text-lg">+</span> Создать пользователя
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                <span className="text-xl text-white">👥</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{users.length}</div>
                <div className="text-sm text-slate-500">Пользователей</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                <span className="text-xl text-white">✓</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{users.filter(u => u.is_active).length}</div>
                <div className="text-sm text-slate-500">Активных</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md">
                <span className="text-xl text-white">👑</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{users.filter(u => u.role === 'admin').length}</div>
                <div className="text-sm text-slate-500">Админов</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
                <span className="text-xl text-white">🔧</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{users.filter(u => u.role === 'technician').length}</div>
                <div className="text-sm text-slate-500">Техников</div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-purple-500"></div>
            <p className="mt-4 text-slate-500 font-medium">Загрузка пользователей...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Пользователь</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Роль</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Склад</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.technician;
                    return (
                      <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleStyle.bg} border ${roleStyle.border}`}>
                              <span className="text-lg">{roleStyle.icon}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">{user.username}</div>
                              <div className="text-xs text-slate-400">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border} focus:ring-2 focus:ring-purple-500`}
                          >
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value} className="bg-white text-slate-700">{label}</option>
                            ))}
                            <option value="admin" className="bg-white text-slate-700">Администратор</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.warehouse_id || ''}
                            onChange={(e) => handleWarehouseChange(user.id, e.target.value ? Number(e.target.value) : null)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              user.is_active 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
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
                              className="px-3 py-2 text-sm font-medium text-amber-600 hover:text-white hover:bg-amber-500 bg-amber-50 rounded-lg transition-all"
                              title="Изменить пароль"
                            >
                              🔑
                            </button>
                            {currentUser?.id !== user.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-500 bg-red-50 rounded-lg transition-all"
                                title="Удалить"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">👤</div>
                <p className="text-lg font-medium text-slate-500">Пользователи не найдены</p>
              </div>
            )}
          </div>
        )}

        {/* Modal: Role Info */}
        {showRoleInfo && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
              <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">📖 Справочник ролей</h2>
                  <button onClick={() => setShowRoleInfo(false)} className="text-white/80 hover:text-white text-2xl">✕</button>
                </div>
              </div>
              <div className="p-6 overflow-auto max-h-[60vh] space-y-3">
                {Object.entries(ROLE_LABELS).map(([value, label]) => {
                  const style = ROLE_COLORS[value] || ROLE_COLORS.technician;
                  return (
                    <div key={value} className={`p-4 rounded-xl border ${style.bg} ${style.border}`}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl">{style.icon}</span>
                        <span className={`font-bold ${style.text}`}>{label}</span>
                      </div>
                      <p className="text-slate-600 text-sm ml-8">{ROLE_DESCRIPTIONS[value] || 'Стандартный доступ'}</p>
                    </div>
                  );
                })}
                <div className="p-4 rounded-xl border bg-gradient-to-r from-red-100 to-rose-100 border-red-300">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl">👑</span>
                    <span className="font-bold text-red-700">Администратор</span>
                  </div>
                  <p className="text-slate-600 text-sm ml-8">Полный доступ ко всем функциям: управление пользователями, складами, оборудованием и настройками системы</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create User */}
        {showCreateUser && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
              <div className="p-5 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                <h2 className="text-xl font-bold">👤 Новый пользователь</h2>
                <p className="text-purple-100 text-sm mt-1">Создание учётной записи</p>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Имя пользователя *</label>
                    <input
                      type="text"
                      required
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                      placeholder="Введите логин"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Пароль *</label>
                    <input
                      type="password"
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                      placeholder="Минимум 4 символа"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Роль</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                      <option value="admin">Администратор</option>
                    </select>
                  </div>
                </div>
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateUser(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600">Отмена</button>
                  <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 shadow-lg transition-all font-semibold">Создать</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Change Password */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
              <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <h2 className="text-xl font-bold">🔑 Изменить пароль</h2>
                <p className="text-amber-100 text-sm mt-1">Установка нового пароля</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Новый пароль *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
                    placeholder="Минимум 4 символа"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setEditingUserId(null); }} className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-colors font-semibold text-slate-600">Отмена</button>
                <button onClick={handlePasswordChange} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg transition-all font-semibold">Сохранить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};