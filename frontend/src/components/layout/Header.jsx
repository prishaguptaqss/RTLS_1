import { useState, useRef, useEffect } from 'react';
import { Search, Settings, Bell, User, LogOut, Lock, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearch } from '../../contexts/SearchContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    // Navigate to change password or open modal
    navigate('/settings'); // You can change this to open a modal instead
  };

  return (
    <header className="header">
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
          <div className="header-user-section">
            <div className="header-user-avatar">
              <User size={18} />
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

        <button className="header-icon-btn notification-btn" title="Notifications">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
