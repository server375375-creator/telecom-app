import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
          Добро пожаловать, {user?.username}!
        </h1>
        <p className="text-slate-500">Server375 — система управления складами</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Role Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-2xl text-white">👤</span>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Ваша роль</p>
              <p className="text-xl font-bold text-slate-800">
                {user?.role === 'admin' ? 'Администратор' : 'Техник'}
              </p>
            </div>
          </div>
        </div>

        {/* Permissions Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-2xl text-white">🔐</span>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Права доступа</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">
                  Просмотр складов
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg">
                    Администрирование
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-lg shadow-indigo-500/30 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <p className="text-sm text-white/70 mb-1">Быстрые действия</p>
            </div>
          </div>
          <div className="space-y-2">
            <a
              href="/warehouses"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <span className="text-lg">🏭</span>
              <span className="font-medium">Перейти к складам</span>
            </a>
            {isAdmin && (
              <a
                href="/users"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="text-lg">👥</span>
                <span className="font-medium">Управление пользователями</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Warehouses */}
        <a href="/warehouses" className="group">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:border-indigo-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all">
                <span className="text-3xl text-white">🏭</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Склады</h3>
                <p className="text-slate-500 text-sm">Управление складами</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Создание, редактирование и просмотр складов. Управление оборудованием и материалами на складах.
            </p>
          </div>
        </a>

        {/* Equipment */}
        <a href="/equipment" className="group">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:border-emerald-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all">
                <span className="text-3xl text-white">📡</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Оборудование</h3>
                <p className="text-slate-500 text-sm">Учёт с серийными номерами</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Оборудование с отслеживанием по серийным номерам, статусами и перемещениями между складами.
            </p>
          </div>
        </a>

        {/* Materials */}
        <a href="/materials" className="group">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:border-amber-200 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 transition-all">
                <span className="text-3xl text-white">📦</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-amber-600 transition-colors">Материалы</h3>
                <p className="text-slate-500 text-sm">Учёт без серийных номеров</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Материалы и расходники с учётом количества на складах. Перемещение между складами.
            </p>
          </div>
        </a>

        {/* Users (Admin only) */}
        {isAdmin && (
          <a href="/users" className="group">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:border-purple-200 hover:shadow-xl transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all">
                  <span className="text-3xl text-white">👥</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-purple-600 transition-colors">Пользователи</h3>
                  <p className="text-slate-500 text-sm">Управление доступом</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Создание пользователей, назначение ролей и прав доступа к системе.
              </p>
            </div>
          </a>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">Совет</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Используйте раздел «Склады» для просмотра остатков на каждом складе. 
              Для оборудования с серийными номерами используйте раздел «Оборудование», 
              а для материалов без серийных номеров — раздел «Материалы».
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};