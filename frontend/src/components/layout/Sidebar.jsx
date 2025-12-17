import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  Wifi,
  TestTube,
  MapPin,
  Search
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Building2, label: 'Buildings', path: '/buildings' },
    { icon: Users, label: 'Users', path: '/users' },
    { icon: Wifi, label: 'Devices', path: '/devices' },
    { icon: MapPin, label: 'Live Positions', path: '/live-positions' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">User Tracking</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
