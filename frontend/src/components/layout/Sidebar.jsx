import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wifi,
  MapPin,
  Settings,
  Building,
  Shield,
  Building2,
  Target,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user, hasPermission } = useAuth();
  const { currentOrganization } = useOrganization();

  // Get the API base URL for logo images
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const BASE_URL = API_BASE_URL.replace('/api', ''); // Remove /api to get base URL

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
      icon: Building2,
      label: 'Locations',
      path: '/locations',
      permission: 'BUILDING_VIEW'
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
      icon: Target,
      label: 'Live Tracking',
      path: '/live-tracking',
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
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          {currentOrganization?.logo ? (
            <img
              src={`${BASE_URL}/${currentOrganization.logo}`}
              alt="Organization logo"
              className="brand-logo"
            />
          ) : (
            <Activity size={24} className="brand-icon" />
          )}
          {!isCollapsed && (
            <div className="brand-text">
              <h2 className="sidebar-title">RPM System</h2>
              <p className="sidebar-subtitle">Doctor Portal</p>
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Current Organization Display */}
        {currentOrganization && !isCollapsed && currentOrganization.display_name && (
          <div className="current-organization">
            <div className="org-display-name">{currentOrganization.display_name}</div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={isCollapsed ? item.label : ''}
          >
            <item.icon size={20} />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
