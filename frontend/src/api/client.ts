import axios from 'axios';

// Автоматическое определение API URL
const LOCAL_API_URL = 'http://192.168.0.100:8000';
const EXTERNAL_API_URL = 'http://86.57.150.169:8000';

// Функция для определения рабочего URL
const getApiUrl = (): string => {
  // Сначала проверяем localStorage - возможно уже определили
  const savedUrl = localStorage.getItem('api_url');
  if (savedUrl) {
    return savedUrl;
  }
  
  // По умолчанию пробуем локальный (для сервера и локальной сети)
  return LOCAL_API_URL;
};

export const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Функция для переключения URL
export const switchApiUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 3000 });
    if (response.data?.status === 'ok') {
      localStorage.setItem('api_url', url);
      api.defaults.baseURL = url;
      return true;
    }
  } catch {
    // Игнорируем ошибку
  }
  return false;
};

// При старте проверяем доступность API
export const initApi = async (): Promise<void> => {
  const savedUrl = localStorage.getItem('api_url');
  
  // Если есть сохранённый URL - проверяем его
  if (savedUrl) {
    const works = await switchApiUrl(savedUrl);
    if (works) return;
  }
  
  // Пробуем локальный
  const localWorks = await switchApiUrl(LOCAL_API_URL);
  if (localWorks) return;
  
  // Пробуем внешний
  await switchApiUrl(EXTERNAL_API_URL);
};

// Интерцептор для добавления токена к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);