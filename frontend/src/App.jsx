import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Entities from './pages/Entities';
import Devices from './pages/Devices';
import LivePositions from './pages/LivePositions';
import Settings from './pages/Settings';
import Login from './pages/Login';
import StaffManagement from './pages/StaffManagement';
import RoleManagement from './pages/RoleManagement';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="organizations" element={<Organizations />} />
              <Route path="entities" element={<Entities />} />
              <Route path="devices" element={<Devices />} />
              <Route path="live-positions" element={<LivePositions />} />

              {/* Admin-only routes */}
              <Route
                path="staff"
                element={
                  <ProtectedRoute requiredPermission="STAFF_VIEW">
                    <StaffManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="roles"
                element={
                  <ProtectedRoute requiredPermission="ROLE_VIEW">
                    <RoleManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute requiredPermission="SETTINGS_VIEW">
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;
