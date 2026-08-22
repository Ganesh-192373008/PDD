import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Check, Trash2, Sliders, Info, MessageSquare, Sprout, Droplet, TrendingUp, HelpCircle } from 'lucide-react';

export const NotificationsView = () => {
  const { token, API_URL, fetchUnreadNotificationsCount, t } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, read: true } : n)
        );
        fetchUnreadNotificationsCount();
      }
    } catch (e) {
      console.error('Error marking read:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        fetchUnreadNotificationsCount();
      }
    } catch (e) {
      console.error('Error marking all read:', e);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
        fetchUnreadNotificationsCount();
      }
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your entire notification history?')) return;
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications([]);
        fetchUnreadNotificationsCount();
      }
    } catch (e) {
      console.error('Error clearing history:', e);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Weather Alerts': return <Info color="#64b5f6" size={18} />;
      case 'Market Price Changes': return <TrendingUp color="#ffb74d" size={18} />;
      case 'Government Schemes':
      case 'Government Announcements': return <Bell color="#ba68c8" size={18} />;
      case 'Water Schedule': return <Droplet color="#4db6ac" size={18} />;
      case 'Fertilizer Schedule': return <Sprout color="#81c784" size={18} />;
      default: return <MessageSquare color="#90a595" size={18} />;
    }
  };

  const categories = [
    'All',
    'Weather Alerts',
    'Market Price Changes',
    'Government Schemes',
    'Water Schedule',
    'Fertilizer Schedule',
    'AI/System Notifications'
  ];

  const filteredNotifications = notifications.filter(n => {
    if (filterCategory === 'All') return true;
    if (filterCategory === 'Government Schemes') {
      return n.category === 'Government Schemes' || n.category === 'Government Announcements';
    }
    return n.category === filterCategory;
  });

  return (
    <div className="notifications-wrapper slide-in">
      <header className="notifications-header mb-4">
        <h1>Notification Center</h1>
        <p className="subtitle">View and organize agricultural warnings, weather reports, seed distributions, and irrigation logs.</p>
      </header>

      {/* Control Actions Bar */}
      <section className="glass-card notif-actions-bar mb-4">
        <div className="notif-filters">
          <span className="filter-label"><Sliders size={14} /> Categories:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="notif-category-select"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="notif-buttons">
          <button onClick={handleMarkAllRead} className="btn btn-outline btn-sm">
            <Check size={14} /> Mark All as Read
          </button>
          <button onClick={handleClearHistory} className="btn btn-outline btn-sm btn-outline-danger">
            <Trash2 size={14} /> Clear History
          </button>
        </div>
      </section>

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <div className="loading-state glass-card">
          <div className="spinner"></div>
          <p>Loading notification archives...</p>
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="notifications-list-block">
          {filteredNotifications.map((notif) => (
            <div key={notif._id} className={`notif-card glass-card mb-2 ${notif.read ? 'read' : 'unread'}`}>
              <div className="notif-card-main">
                <div className="notif-icon-circle">
                  {getCategoryIcon(notif.category)}
                </div>
                <div className="notif-card-text">
                  <div className="notif-card-header">
                    <h4>{notif.title}</h4>
                    <span className="notif-category-badge">{notif.category}</span>
                  </div>
                  <p>{notif.message}</p>
                  <span className="notif-timestamp">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="notif-card-actions">
                {!notif.read && (
                  <button
                    onClick={() => handleMarkAsRead(notif._id)}
                    className="btn-notif-circle-action check"
                    title="Mark as Read"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notif._id)}
                  className="btn-notif-circle-action delete"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card empty-results">
          <Bell size={48} color="rgba(144, 165, 149, 0.2)" />
          <p>No agricultural notifications match your selected filter.</p>
        </div>
      )}

      <style>{`
        .notif-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          padding: 16px 24px;
        }
        .notif-filters {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .notif-category-select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 8px 12px;
          font-family: var(--font-family);
          border-radius: var(--border-radius-sm);
          font-size: 14px;
          cursor: pointer;
        }
        .notif-buttons {
          display: flex;
          gap: 10px;
        }
        .btn-outline-danger {
          border-color: rgba(211, 47, 47, 0.3);
          color: #e57373;
        }
        .btn-outline-danger:hover {
          background: rgba(211, 47, 47, 0.1);
          border-color: var(--danger-color);
          color: #ff8a80;
        }
        
        /* Notification Card list */
        .notif-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 16px 24px;
          transition: var(--transition-smooth);
        }
        .notif-card.unread {
          border-left: 4px solid var(--secondary-color);
          background: rgba(255, 160, 0, 0.03);
        }
        .notif-card.read {
          border-left: 4px solid transparent;
        }
        .notif-card-main {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          flex: 1;
        }
        .notif-icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(46, 125, 50, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .notif-card-text {
          flex: 1;
        }
        .notif-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .notif-card-header h4 {
          font-size: 15px;
          color: #fff;
          font-weight: 700;
        }
        .notif-category-badge {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .notif-card-text p {
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: 6px;
        }
        .notif-timestamp {
          font-size: 11px;
          color: rgba(144, 165, 149, 0.6);
        }
        
        .notif-card-actions {
          display: flex;
          gap: 8px;
        }
        .btn-notif-circle-action {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .btn-notif-circle-action.check {
          color: var(--primary-color);
        }
        .btn-notif-circle-action.check:hover {
          background: rgba(46, 125, 50, 0.15);
          color: #fff;
          border-color: var(--primary-color);
        }
        .btn-notif-circle-action.delete {
          color: #e57373;
        }
        .btn-notif-circle-action.delete:hover {
          background: rgba(211, 47, 47, 0.15);
          color: #fff;
          border-color: var(--danger-color);
        }
        
        .mb-2 { margin-bottom: 12px; }
        
        @media (max-width: 768px) {
          .notif-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .notif-card-actions {
            align-self: flex-end;
            margin-top: 10px;
          }
        }
      `}</style>
    </div>
  );
};
