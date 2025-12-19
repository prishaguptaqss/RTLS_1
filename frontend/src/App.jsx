import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { OrganizationProvider } from './contexts/OrganizationContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Entities from './pages/Entities';
import Locations from './pages/Locations';
import Devices from './pages/Devices';
import LivePositions from './pages/LivePositions';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <OrganizationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="entities" element={<Entities />} />
            <Route path="locations" element={<Locations />} />
            <Route path="devices" element={<Devices />} />
            <Route path="live-positions" element={<LivePositions />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </OrganizationProvider>
  );
}

export default App;
