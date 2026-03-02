import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';

export const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const userRoleLabel = user?.role ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role : '';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="text-xl font-bold text-indigo-600">
              TelecomApp
            </Link>

            {/* Navigation */}
            <nav className="flex space-x-2">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Главная
              </Link>
              <Link
                to="/warehouses"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/warehouses') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Склады
              </Link>
              <Link
                to="/equipment"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/equipment') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Оборудование
              </Link>
              {isAdmin && (
                <Link
                  to="/users"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/users') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Пользователи
                </Link>
              )}
            </nav>

            {/* User info */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.username} <span className="text-xs text-gray-400">({userRoleLabel})</span>
              </span>
              <button
                onClick={logout}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};