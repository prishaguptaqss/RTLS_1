import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import {
  getNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead
} from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from '../contexts/ToastContext';
import { Bell, Filter, X, Check } from 'lucide-react';
import './NotificationModal.css';

const NotificationModal = ({ isOpen, onClose }) => {
  const { refreshUnreadCount } = useNotifications();
  const { success, error } = useToast();

  // State
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter,
        page: currentPage,
        limit: itemsPerPage,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      // Add optional filters
      if (searchQuery.trim()) {
        params.entity_name = searchQuery.trim();
      }
      if (dateFrom) {
        params.date_from = new Date(dateFrom).toISOString();
      }
      if (dateTo) {
        params.date_to = new Date(dateTo).toISOString();
      }

      const data = await getNotifications(params);
      setNotifications(data.notifications || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetch for search query and date filters
  useEffect(() => {
    if (!isOpen) return;

    // Reset to page 1 when search changes
    if (currentPage !== 1) {
      setCurrentPage(1);
      return; // Let the other useEffect handle the fetch
    }

    // Debounce search query
    const debounceTimer = setTimeout(() => {
      fetchNotifications();
    }, 300); // 300ms delay

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, dateFrom, dateTo]);

  // Fetch on mount and when filters/page change
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, currentPage, statusFilter, sortBy, sortOrder]);

  // Reset to page 1 when applying new filters
  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchNotifications();
  };

  // Toggle read/unread status
  const handleToggleRead = async (notification) => {
    try {
      if (notification.is_read) {
        await markNotificationUnread(notification.id);
      } else {
        await markNotificationRead(notification.id);
      }
      await fetchNotifications();
      await refreshUnreadCount();
    } catch (err) {
      console.error('Failed to update notification:', err);
      error('Failed to update notification');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await fetchNotifications();
      await refreshUnreadCount();
      success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      error('Failed to mark all as read');
    }
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Render notification item
  const renderNotification = (notification) => {
    const displayName = notification.entity_name || notification.user_name || 'Unknown';
    const entityId = notification.entity_id;
    const severityClass = `severity-${notification.severity || 'medium'}`;

    return (
      <div
        key={notification.id}
        className={`notification-item ${notification.is_read ? 'read' : 'unread'} ${severityClass}`}
      >
        <div className="notification-header">
          <div className="notification-icon">
            <Bell size={18} />
          </div>
          <div className="notification-meta">
            <span className="notification-time">
              {formatTimestamp(notification.created_at)}
            </span>
            <span className={`severity-badge ${severityClass}`}>
              {notification.severity || 'medium'}
            </span>
          </div>
        </div>

        <div className="notification-body">
          <div className="notification-title">Missing Person Alert</div>
          <div className="notification-details">
            <div>
              <strong>Name:</strong> {displayName}
            </div>
            {entityId && (
              <div>
                <strong>ID:</strong> {entityId}
              </div>
            )}
            <div>
              <strong>Last Room:</strong> {notification.last_room || 'Unknown'}
            </div>
            <div>
              <strong>Missing Duration:</strong> {formatDuration(notification.missing_duration_seconds)}
            </div>
          </div>
        </div>

        <div className="notification-actions">
          <button
            onClick={() => handleToggleRead(notification)}
            className="btn-icon"
            title={notification.is_read ? 'Mark as unread' : 'Mark as read'}
          >
            {notification.is_read ? <X size={16} /> : <Check size={16} />}
          </button>
        </div>
      </div>
    );
  };

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startRecord = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endRecord = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Notifications</Modal.Header>

      <Modal.Body>
        {/* Filter Bar */}
        <div className="notification-filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />

          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="filter-datetime"
          />

          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="filter-datetime"
          />

          <button onClick={handleApplyFilters} className="btn-primary btn-filter">
            <Filter size={16} /> Apply
          </button>

          <button onClick={handleMarkAllRead} className="btn-secondary btn-filter">
            Mark All Read
          </button>
        </div>

        {/* Sort Controls */}
        <div className="notification-sort">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="time">Sort by Time</option>
            <option value="status">Sort by Status</option>
            <option value="severity">Sort by Severity</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="sort-select"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="loading-state">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <p>No notifications found</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map(renderNotification)}
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="notification-pagination">
            <span className="pagination-info">
              {startRecord} to {endRecord} of {totalCount}
            </span>

            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="pagination-btn"
                title="First page"
              >
                ⟪
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
                title="Previous page"
              >
                ‹
              </button>
              <span className="pagination-current">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
                title="Next page"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
                title="Last page"
              >
                ⟫
              </button>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default NotificationModal;
