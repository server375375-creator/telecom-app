import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Добро пожаловать, {user?.username}!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Карточка роли */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ваша роль</h3>
          <p className="text-3xl font-bold text-indigo-600">
            {user?.role === 'admin' ? 'Администратор' : 'Техник'}
          </p>
        </div>

        {/* Карточка прав */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Права доступа</h3>
          <ul className="text-gray-600 space-y-1">
            <li>✓ Просмотр складов</li>
            {isAdmin && <li>✓ Создание складов</li>}
            {isAdmin && <li>✓ Администрирование</li>}
          </ul>
        </div>

        {/* Карточка навигации */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Быстрые действия</h3>
          <div className="space-y-2">
            <a
              href="/warehouses"
              className="block text-indigo-600 hover:text-indigo-800"
            >
              → Перейти к складам
            </a>
            {isAdmin && (
              <a
                href="/warehouses/new"
                className="block text-indigo-600 hover:text-indigo-800"
              >
                → Добавить склад
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Информация о системе */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">О системе</h3>
        <p className="text-gray-600">
          Server375 — система управления складами телекоммуникационного оборудования.
          Используйте меню навигации для доступа к функциям системы.
        </p>
      </div>
    </div>
  );
};