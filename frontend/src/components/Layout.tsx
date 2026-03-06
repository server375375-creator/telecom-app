import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import { useState } from 'react';

export const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const userRoleLabel = user?.role ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role : '';

  const navItems = [
    { path: '/', label: 'Главная', icon: '🏠' },
    { path: '/warehouses', label: 'Склады', icon: '🏭' },
    { path: '/equipment', label: 'Оборудование', icon: '📡' },
    { path: '/materials', label: 'Материалы', icon: '📦' },
    ...(isAdmin ? [{ path: '/users', label: 'Пользователи', icon: '👥' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F4F4FC]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#DFE1EE] flex flex-col z-40">
        {/* Logo */}
        <div className="p-6 border-b border-[#EBEBF5]">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14121F] flex items-center justify-center">
              <span className="text-white text-xl">🏭</span>
            </div>
            <span className="text-xl font-bold text-[#14121F]">Server375</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-[#14121F] text-white shadow-lg'
                  : 'text-[#4A4858] hover:bg-[#EBEBF5] hover:text-[#14121F]'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[#EBEBF5]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F4F4FC]">
            <div className="w-10 h-10 rounded-full bg-[#DFE1EE] flex items-center justify-center">
              <span className="text-[#4A4858] font-semibold">{user?.username?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#14121F] truncate">{user?.username}</p>
              <p className="text-xs text-[#4A4858]">{userRoleLabel}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#4A4858] hover:bg-[#EBEBF5] hover:text-[#14121F] transition-all duration-200"
          >
            <span>🚪</span>
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#DFE1EE] flex items-center px-4 z-20">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-[#EBEBF5]"
        >
          <span className="text-2xl">☰</span>
        </button>
        <Link to="/" className="ml-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#14121F] flex items-center justify-center">
            <span className="text-white">🏭</span>
          </div>
          <span className="font-bold text-[#14121F]">Server375</span>
        </Link>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#DFE1EE] flex flex-col z-50 lg:hidden">
          <div className="p-4 border-b border-[#EBEBF5]">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-[#EBEBF5]"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-[#14121F] text-white shadow-lg'
                    : 'text-[#4A4858] hover:bg-[#EBEBF5] hover:text-[#14121F]'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-[#EBEBF5]">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#4A4858] hover:bg-[#EBEBF5] hover:text-[#14121F] transition-all duration-200"
            >
              <span>🚪</span>
              <span className="font-medium">Выйти</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};