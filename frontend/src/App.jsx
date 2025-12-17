import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Users from './pages/Users';
import Patients from './pages/Patients';
import Devices from './pages/Devices';
import LivePositions from './pages/LivePositions';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="buildings" element={<Buildings />} />
          <Route path="users" element={<Users />} />
          <Route path="patients" element={<Patients />} />
          <Route path="devices" element={<Devices />} />
          <Route path="live-positions" element={<LivePositions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
