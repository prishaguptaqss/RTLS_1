import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  UserPlus,
  Wifi,
  TestTube,
  MapPin,
  Search,
  Settings,
  Building
} from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import './Sidebar.css';

const Sidebar = () => {
  const { currentOrganization, organizations, switchOrganization, loading } = useOrganization();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Building, label: 'Organizations', path: '/organizations' },
    { icon: Users, label: 'Entities', path: '/entities' },
    { icon: Wifi, label: 'Devices', path: '/devices' },
    { icon: MapPin, label: 'Live Positions', path: '/live-positions' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Entity Tracking</h2>

        {/* Organization Selector */}
        {!loading && organizations.length > 0 && (
          <div className="org-selector">
            <label className="org-label">Organization:</label>
            <select
              value={currentOrganization?.id || ''}
              onChange={(e) => switchOrganization(e.target.value)}
              className="org-select"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
