import { Search, Settings, Bell, MessageSquare, LogOut, User } from 'lucide-react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-search">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Search"
          className="search-input"
        />
      </div>

      <div className="header-actions">
        <button className="header-icon-btn" title="Settings">
          <Settings size={20} />
        </button>
        <button className="header-icon-btn" title="Notifications">
          <Bell size={20} />
        </button>
        <button className="header-icon-btn" title="Messages">
          <MessageSquare size={20} />
        </button>
{/* 
        <div className="admin-section">
          <div className="admin-avatar">
            <User size={16} />
          </div>
          <div className="admin-info">
            <span className="admin-name">Admin</span>
            <span className="admin-role">online</span>
          </div>
          <button className="logout-btn" title="Logout">
            Logout
          </button>
        </div> */}
      </div>
    </header>
  );
};

export default Header;
