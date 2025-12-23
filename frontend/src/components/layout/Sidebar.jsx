import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wifi,
  MapPin,
  Settings,
  Building,
  Shield,
  LogOut,
  User
} from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { currentOrganization, organizations, switchOrganization, loading } = useOrganization();
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
      adminOnly: false // Visible if user has STAFF_VIEW permission
    },
    {
      icon: Shield,
      label: 'Roles',
      path: '/roles',
      permission: 'ROLE_VIEW',
      adminOnly: false // Visible if user has ROLE_VIEW permission
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

        {/* User Info */}
        {user && (
          <div className="user-info">
            <User size={16} />
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              {user.is_admin && <span className="admin-badge-small">Admin</span>}
            </div>
          </div>
        )}

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

      {/* Logout Button */}
      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
