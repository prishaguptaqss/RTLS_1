import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Entities from './pages/Entities';
import Locations from './pages/Locations';
import Devices from './pages/Devices';
import LivePositions from './pages/LivePositions';
import Settings from './pages/Settings';
import StaffManagement from './pages/StaffManagement';
import RoleManagement from './pages/RoleManagement';
import AccessDenied from './pages/AccessDenied';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/access-denied" element={<AccessDenied />} />

            {/* Protected routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={
                <ProtectedRoute requiredPermission="DASHBOARD_VIEW">
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="organizations" element={
                <ProtectedRoute requiredPermission="ORGANIZATION_VIEW">
                  <Organizations />
                </ProtectedRoute>
              } />
              <Route path="entities" element={
                <ProtectedRoute requiredPermission="ENTITY_VIEW">
                  <Entities />
                </ProtectedRoute>
              } />
              <Route path="locations" element={
                <ProtectedRoute requiredPermission="BUILDING_VIEW">
                  <Locations />
                </ProtectedRoute>
              } />
              <Route path="devices" element={
                <ProtectedRoute requiredPermission="DEVICE_VIEW">
                  <Devices />
                </ProtectedRoute>
              } />
              <Route path="live-positions" element={
                <ProtectedRoute requiredPermission="LIVE_POSITION_VIEW">
                  <LivePositions />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute requiredPermission="SETTINGS_VIEW">
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="staff" element={
                <ProtectedRoute requiredPermission="STAFF_VIEW">
                  <StaffManagement />
                </ProtectedRoute>
              } />
              <Route path="roles" element={
                <ProtectedRoute requiredPermission="ROLE_VIEW">
                  <RoleManagement />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;
