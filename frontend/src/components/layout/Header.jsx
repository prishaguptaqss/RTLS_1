import { useState, useRef, useEffect } from 'react';
import { Search, Settings, Bell, User, LogOut, Lock, X, Moon, Sun, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearch } from '../../contexts/SearchContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ChangePasswordModal from '../ChangePasswordModal';
import ProfileModal from '../ProfileModal';
import NotificationModal from '../NotificationModal';
import { useNotifications } from '../../contexts/NotificationContext';
import './Header.css';

const Header = ({ toggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
  const { theme, toggleTheme, isDark } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const settingsRef = useRef(null);

  // Get dynamic placeholder based on current route
  const getSearchPlaceholder = () => {
    const path = location.pathname;
    if (path === '/devices') return 'Search anchors/tags by ID, name, location, or patient...';
    if (path === '/entities') return 'Search entities by ID or name...';
    if (path === '/organizations') return 'Search organizations...';
    if (path === '/live-positions') return 'Search by entity ID or name...';
    if (path === '/roles') return 'Search roles by name...';
    if (path === '/locations') return 'Search locations by building, floor, or room...';
    if (path.startsWith('/staff')) return 'Search users by name or email...';
    return 'Search...';
  };

  // Clear search when route changes
  useEffect(() => {
    clearSearch();

  }, [location.pathname, clearSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChangePassword = () => {
    setIsSettingsOpen(false);
    setIsChangePasswordModalOpen(true);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setIsSettingsOpen(false);
  };

  return (
    <header className="header">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={toggleMobileMenu}
        title="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <div className="header-search">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder={getSearchPlaceholder()}
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="header-search-clear"
            onClick={clearSearch}
            title="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="header-actions">
        {user && (
          <div
            className="header-user-section"
            onClick={() => setIsProfileModalOpen(true)}
            style={{ cursor: 'pointer' }}
            title="View Profile"
          >
            <div className="header-user-avatar">
              {user.profile_picture ? (
                <img
                  src={`http://localhost:3000${user.profile_picture}`}
                  alt={user.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <User size={18} />
              )}
            </div>
            <div className="header-user-info">
              <span className="header-user-name">{user.name}</span>
              {user.is_admin && <span className="header-user-role">System Administrator</span>}
            </div>
          </div>
        )}

        <div className="header-dropdown" ref={settingsRef}>
          <button
            className="header-icon-btn"
            title="Settings"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <Settings size={20} />
          </button>

          {isSettingsOpen && (
            <div className="header-dropdown-menu">
              <button className="header-dropdown-item" onClick={handleThemeToggle}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <div className="header-dropdown-divider"></div>
              <button className="header-dropdown-item" onClick={handleChangePassword}>
                <Lock size={18} />
                <span>Change Password</span>
              </button>
              <div className="header-dropdown-divider"></div>
              <button className="header-dropdown-item logout-item" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        <button
          className="header-icon-btn notification-btn"
          title="Notifications"
          onClick={() => setIsNotificationModalOpen(true)}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </header>
  );
};

export default Header;
