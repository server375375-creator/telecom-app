import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#14121F] mb-2">
          Добро пожаловать, {user?.username}!
        </h1>
        <p className="text-[#4A4858]">Server375 — система управления складами</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Role Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBEBF5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#14121F] flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <span className="text-sm font-medium text-[#4A4858]">Ваша роль</span>
          </div>
          <p className="text-2xl font-bold text-[#14121F]">
            {user?.role === 'admin' ? 'Администратор' : 'Техник'}
          </p>
        </div>

        {/* Permissions Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBEBF5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#F4F4FC] flex items-center justify-center border border-[#DFE1EE]">
              <span className="text-2xl">🔐</span>
            </div>
            <span className="text-sm font-medium text-[#4A4858]">Права доступа</span>
          </div>
          <ul className="space-y-2 text-[#4A4858]">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#EBEBF5] flex items-center justify-center text-xs">✓</span>
              Просмотр складов
            </li>
            {isAdmin && (
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#14121F] flex items-center justify-center text-xs text-white">✓</span>
                Администрирование
              </li>
            )}
          </ul>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-[#14121F] rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <span className="text-sm font-medium text-white/60">Быстрые действия</span>
          </div>
          <div className="space-y-2">
            <a
              href="/warehouses"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <span>🏭</span>
              <span>Перейти к складам</span>
            </a>
            {isAdmin && (
              <a
                href="/users"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span>👥</span>
                <span>Управление пользователями</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Navigation Cards */}
        <a href="/warehouses" className="group">
          <div className="bg-white rounded-2xl p-6 border border-[#EBEBF5] shadow-sm hover:border-[#14121F] hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-[#F4F4FC] border border-[#DFE1EE] flex items-center justify-center group-hover:bg-[#14121F] group-hover:border-[#14121F] transition-colors">
                <span className="text-3xl group-hover:text-white">🏭</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#14121F] group-hover:text-[#6366F1] transition-colors">Склады</h3>
                <p className="text-[#4A4858] text-sm">Управление складами</p>
              </div>
            </div>
            <p className="text-[#4A4858]">
              Создание, редактирование и просмотр складов. Управление оборудованием и материалами.
            </p>
          </div>
        </a>

        <a href="/equipment" className="group">
          <div className="bg-white rounded-2xl p-6 border border-[#EBEBF5] shadow-sm hover:border-[#14121F] hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-[#F4F4FC] border border-[#DFE1EE] flex items-center justify-center group-hover:bg-[#14121F] group-hover:border-[#14121F] transition-colors">
                <span className="text-3xl group-hover:text-white">📡</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#14121F] group-hover:text-[#6366F1] transition-colors">Оборудование</h3>
                <p className="text-[#4A4858] text-sm">Учёт с серийными номерами</p>
              </div>
            </div>
            <p className="text-[#4A4858]">
              Оборудование с отслеживанием по серийным номерам, статусами и перемещениями.
            </p>
          </div>
        </a>

        <a href="/materials" className="group">
          <div className="bg-white rounded-2xl p-6 border border-[#EBEBF5] shadow-sm hover:border-[#14121F] hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-[#F4F4FC] border border-[#DFE1EE] flex items-center justify-center group-hover:bg-[#14121F] group-hover:border-[#14121F] transition-colors">
                <span className="text-3xl group-hover:text-white">📦</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#14121F] group-hover:text-[#6366F1] transition-colors">Материалы</h3>
                <p className="text-[#4A4858] text-sm">Учёт без серийных номеров</p>
              </div>
            </div>
            <p className="text-[#4A4858]">
              Материалы и расходники с учётом количества на складах.
            </p>
          </div>
        </a>

        {isAdmin && (
          <a href="/users" className="group">
            <div className="bg-white rounded-2xl p-6 border border-[#EBEBF5] shadow-sm hover:border-[#14121F] hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[#F4F4FC] border border-[#DFE1EE] flex items-center justify-center group-hover:bg-[#14121F] group-hover:border-[#14121F] transition-colors">
                  <span className="text-3xl group-hover:text-white">👥</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#14121F] group-hover:text-[#6366F1] transition-colors">Пользователи</h3>
                  <p className="text-[#4A4858] text-sm">Управление доступом</p>
                </div>
              </div>
              <p className="text-[#4A4858]">
                Создание пользователей, назначение ролей и прав доступа.
              </p>
            </div>
          </a>
        )}
      </div>
    </div>
  );
};