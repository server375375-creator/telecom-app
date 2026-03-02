import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Warehouses } from './pages/Warehouses';
import { WarehouseForm } from './pages/WarehouseForm';
import { EquipmentPage } from './pages/Equipment';
import { UsersPage } from './pages/Users';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Публичные роуты */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Защищённые роуты */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route
              path="warehouses/new"
              element={
                <PrivateRoute adminOnly>
                  <WarehouseForm />
                </PrivateRoute>
              }
            />
            <Route path="equipment" element={<EquipmentPage />} />
            <Route
              path="users"
              element={
                <PrivateRoute adminOnly>
                  <UsersPage />
                </PrivateRoute>
              }
            />
          </Route>

          {/* Редирект для неизвестных роутов */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;