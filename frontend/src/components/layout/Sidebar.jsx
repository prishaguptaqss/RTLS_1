import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wifi,
  MapPin,
  Settings,
  Building,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user, hasPermission } = useAuth();

  // Define all menu items with their required permissions
  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/',
      permission: 'DASHBOARD_VIEW'
    },
    {
      icon: Building,
      label: 'Organizations',
      path: '/organizations',
      permission: 'ORGANIZATION_VIEW'
    },
    {
      icon: Users,
      label: 'Entities',
      path: '/entities',
      permission: 'ENTITY_VIEW'
    },
    {
      icon: Wifi,
      label: 'Devices',
      path: '/devices',
      permission: 'DEVICE_VIEW'
    },
    {
      icon: MapPin,
      label: 'Live Positions',
      path: '/live-positions',
      permission: 'LIVE_POSITION_VIEW'
    },
    {
      icon: UserPlus,
      label: 'User',
      path: '/staff',
      permission: 'STAFF_VIEW',
      adminOnly: false
    },
    {
      icon: Shield,
      label: 'Roles',
      path: '/roles',
      permission: 'ROLE_VIEW',
      adminOnly: false
    },
    {
      icon: Settings,
      label: 'Settings',
      path: '/settings',
      permission: 'SETTINGS_VIEW'
    },
  ];

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.permission) return true;
    if (item.adminOnly && !user?.is_admin) return false;
    return hasPermission(item.permission);
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">RTLS Dashboard</h2>
      </div>

      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => (
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
