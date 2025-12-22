import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Wifi,
  MapPin,
  Settings,
  Building,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Shield,
  LogOut
} from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { currentOrganization, organizations, switchOrganization, loading } = useOrganization();
  const { hasPermission, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', permission: 'DASHBOARD_VIEW' },
    { icon: Building, label: 'Organizations', path: '/organizations', permission: 'ORGANIZATION_VIEW' },
    { icon: Users, label: 'Entities', path: '/entities', permission: 'ENTITY_VIEW' },
    { icon: Building2, label: 'Locations', path: '/locations', permission: 'BUILDING_VIEW' },
    { icon: Wifi, label: 'Devices', path: '/devices', permission: 'DEVICE_VIEW' },
    { icon: MapPin, label: 'Live Positions', path: '/live-positions', permission: 'LIVE_POSITION_VIEW' },
    { icon: UserCog, label: 'Staff', path: '/staff', permission: 'STAFF_VIEW' },
    { icon: Shield, label: 'Roles', path: '/roles', permission: 'ROLE_VIEW' },
    { icon: Settings, label: 'Settings', path: '/settings', permission: 'SETTINGS_VIEW' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <h2 className="sidebar-title">Entity Tracking</h2>}

        {/* Organization Selector */}
        {!isCollapsed && !loading && organizations.length > 0 && (
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

        {/* Toggle Button */}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          // Only show menu item if user has permission
          if (isAuthenticated && item.permission && !hasPermission(item.permission)) {
            return null;
          }

          return (
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
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="sidebar-footer">
        <button
          className="logout-button"
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
