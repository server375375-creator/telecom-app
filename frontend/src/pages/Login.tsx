import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F4FC] p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#14121F] shadow-lg mb-4">
            <span className="text-4xl">🏭</span>
          </div>
          <h1 className="text-3xl font-bold text-[#14121F] mb-2">Server375</h1>
          <p className="text-[#4A4858]">Система управления складами</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#EBEBF5] p-8">
          <h2 className="text-2xl font-bold text-[#14121F] text-center mb-6">
            Добро пожаловать!
          </h2>

          {error && (
            <div className="mb-5 p-4 bg-[#14121F] text-white rounded-xl flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#14121F] mb-2">
                Имя пользователя
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A4858]">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3.5 pl-12 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white text-[#14121F]"
                  placeholder="Введите имя пользователя"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#14121F] mb-2">
                Пароль
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A4858]">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pl-12 border border-[#DFE1EE] rounded-xl focus:ring-2 focus:ring-[#14121F] focus:border-transparent transition-all bg-white text-[#14121F]"
                  placeholder="Введите пароль"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-[#14121F] text-white rounded-xl hover:bg-[#2A2838] focus:outline-none focus:ring-2 focus:ring-[#14121F] focus:ring-offset-2 disabled:opacity-50 transition-all font-semibold text-lg shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Вход...</span>
                </span>
              ) : (
                '🚀 Войти'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#EBEBF5] text-center">
            <p className="text-[#4A4858]">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-[#14121F] hover:underline font-semibold transition-colors">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#4A4858] text-sm mt-6">
          © 2024 Server375. All rights protected.
        </p>
      </div>
    </div>
  );
};