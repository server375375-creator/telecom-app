import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Приветствие */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200">
            <span className="text-3xl">👋</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Добро пожаловать, {user?.username}!
            </h1>
            <p className="text-slate-500 mt-1">Server375 — система управления складами</p>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Роль */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Ваша роль</p>
              <p className={`text-2xl font-bold ${isAdmin ? 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent' : 'text-emerald-600'}`}>
                {user?.role === 'admin' ? '👑 Администратор' : '🔧 Техник'}
              </p>
            </div>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-gradient-to-br from-purple-100 to-pink-100' : 'bg-gradient-to-br from-emerald-100 to-green-100'}`}>
              <span className="text-2xl">{isAdmin ? '👑' : '🔧'}</span>
            </div>
          </div>
        </div>

        {/* Права */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 hover:shadow-2xl transition-all duration-300">
          <p className="text-sm font-medium text-slate-500 mb-3">Права доступа</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-slate-700">
              <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">✓</span>
              Просмотр складов
            </li>
            {isAdmin && (
              <li className="flex items-center gap-2 text-slate-700">
                <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm">✓</span>
                Создание складов
              </li>
            )}
            {isAdmin && (
              <li className="flex items-center gap-2 text-slate-700">
                <span className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-sm">✓</span>
                Администрирование
              </li>
            )}
          </ul>
        </div>

        {/* Быстрые действия */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-xl shadow-purple-200/50 p-6 text-white">
          <p className="text-sm font-medium text-white/80 mb-3">Быстрые действия</p>
          <div className="space-y-2">
            <a
              href="/warehouses"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all font-medium"
            >
              <span>📦</span> Перейти к складам
            </a>
            {isAdmin && (
              <a
                href="/warehouses/new"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all font-medium"
              >
                <span>➕</span> Добавить склад
              </a>
            )}
            {isAdmin && (
              <a
                href="/users"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all font-medium"
              >
                <span>👥</span> Управление пользователями
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Информация о системе */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <span className="text-xl">ℹ️</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800">О системе</h3>
        </div>
        <p className="text-slate-600 leading-relaxed">
          <strong className="text-slate-800">Server375</strong> — современная система управления складами телекоммуникационного оборудования. 
          Используйте меню навигации для доступа к функциям системы: управление складами, оборудованием, материалами и пользователями.
        </p>
        
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/warehouses" className="flex flex-col items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <span className="text-3xl mb-2">🏭</span>
            <span className="text-sm font-medium text-slate-700">Склады</span>
          </a>
          <a href="/equipment" className="flex flex-col items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <span className="text-3xl mb-2">📡</span>
            <span className="text-sm font-medium text-slate-700">Оборудование</span>
          </a>
          <a href="/materials" className="flex flex-col items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <span className="text-3xl mb-2">📦</span>
            <span className="text-sm font-medium text-slate-700">Материалы</span>
          </a>
          {isAdmin && (
            <a href="/users" className="flex flex-col items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <span className="text-3xl mb-2">👥</span>
              <span className="text-sm font-medium text-slate-700">Пользователи</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};