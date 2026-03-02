import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listUsers, getRoles, createUserWithRole, updateUserRole, assignUserWarehouse } from '../api/equipment';
import { listWarehouses } from '../api/warehouses';
import { ROLE_LABELS } from '../types';
import type { Warehouse } from '../types';

interface User {
  id: number;
  username: string;
  role: string;
  warehouse_id: number | null;
  warehouse_name: string | null;
}

interface RoleOption {
  value: string;
  label: string;
}

export const UsersPage = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  
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
      const [usersData, rolesData, warehousesData] = await Promise.all([
        listUsers(),
        getRoles(),
        listWarehouses()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
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

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Доступ запрещён. Только администратор может управлять пользователями.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление пользователями</h1>
        <button
          onClick={() => setShowCreateUser(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + Создать пользователя
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя пользователя</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Склад</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{user.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{user.username}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {roles.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                      <option value="admin">Администратор</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={user.warehouse_id || ''}
                      onChange={(e) => handleWarehouseChange(user.id, e.target.value ? Number(e.target.value) : null)}
                      className="border rounded px-2 py-1 text-sm min-w-[200px]"
                    >
                      <option value="">Не привязан</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.is_central ? '(Центральный)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">Пользователи не найдены</div>
          )}
        </div>
      )}

      {/* Справочник ролей */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Справочник ролей</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <div key={value} className="p-3 bg-gray-50 rounded">
              <span className="font-medium">{label}</span>
              <span className="text-gray-400 text-sm ml-2">({value})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно: Создать пользователя */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold mb-4">Создать пользователя</h2>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Имя пользователя *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Пароль *
                  </label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Роль
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
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
    </div>
  );
};