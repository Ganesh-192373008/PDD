import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  CloudSun, 
  MapPin, 
  Wind, 
  Droplets, 
  Umbrella, 
  ScanEye, 
  MessageSquare, 
  TrendingUp, 
  FileSpreadsheet,
  Droplet,
  Sprout,
  ChevronRight,
  Bell,
  History
} from 'lucide-react';

export const Dashboard = () => {
  const { user, t, location, weather, API_URL, token } = useApp();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (token) {
      fetchLatestNotifications();
    }
  }, [token]);

  const fetchLatestNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.slice(0, 3)); // show top 3
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const quickActions = [
    { label: t('scanCrop'), desc: 'Detect plant diseases using camera', path: '/scan', icon: ScanEye, color: '#81c784' },
    { label: t('aiAssistant'), desc: 'Chat with farming assistant', path: '/ai-assistant', icon: MessageSquare, color: '#64b5f6' },
    { label: t('marketPrices'), desc: 'Check mandis and commodity rates', path: '/market-prices', icon: TrendingUp, color: '#ffb74d' },
    { label: t('water'), desc: 'Water requirements planner', path: '/water-management', icon: Droplet, color: '#4db6ac' },
    { label: t('fertilizer'), desc: 'Nutrient application calendar', path: '/fertilizer-schedule', icon: Sprout, color: '#a1887f' },
    { label: t('schemes'), desc: 'Apply for agricultural subsidies', path: '/schemes', icon: FileSpreadsheet, color: '#ba68c8' },
    { label: 'Activity History', desc: 'View all your crop scans and logs', path: '/history', icon: History, color: '#ff8a65' },
  ];

  return (
    <div className="dashboard-wrapper slide-in">
      <header className="dashboard-header">
        <div>
          <h1>{t('welcome')} {user?.name || 'Farmer'}!</h1>
          <p className="subtitle">Here is the farming overview for your field today.</p>
        </div>
        <div className="location-badge glass-card">
          <MapPin size={18} color="#ffa000" />
          <span>{user?.location?.address || location.address}</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid-2 mt-4">
        {/* Weather Card */}
        <section className="glass-card weather-card">
          <div className="card-title">
            <h3>{t('weather')}</h3>
            <span className="badge badge-info">{weather?.location || user?.location?.address || location.address || 'Loading Location...'}</span>
          </div>

          {weather ? (
            <div className="weather-details-wrapper">
              <div className="weather-main">
                <div className="weather-temp-info">
                  <span className="weather-temp">{weather.temperature}°C</span>
                  <span className="weather-condition">{weather.condition}</span>
                </div>
                <CloudSun size={64} className="weather-icon" color="#ffa000" />
              </div>

              <div className="weather-stats-grid">
                <div className="stat-item">
                  <Droplets size={18} color="#4db6ac" />
                  <div>
                    <p className="stat-label">Humidity</p>
                    <p className="stat-value">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="stat-item">
                  <Wind size={18} color="#90a595" />
                  <div>
                    <p className="stat-label">Wind Speed</p>
                    <p className="stat-value">{weather.windSpeed} km/h</p>
                  </div>
                </div>
                <div className="stat-item">
                  <Umbrella size={18} color="#64b5f6" />
                  <div>
                    <p className="stat-label">Rain Prob.</p>
                    <p className="stat-value">{weather.rainProb}%</p>
                  </div>
                </div>
              </div>

              <div className="weather-advice">
                <strong>Agronomic Advice:</strong>{' '}
                {weather.rainProb > 50 
                  ? 'High probability of rain. Postpone any fertilizer spraying or pesticide application. Secure harvested crops.'
                  : 'Weather looks clear. Ideal conditions for light irrigation and weeding in early hours.'}
              </div>
            </div>
          ) : (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{t('loading')}</p>
            </div>
          )}
        </section>

        {/* Quick Notifications Card */}
        <section className="glass-card notifications-preview">
          <div className="card-title">
            <h3>Recent Notifications</h3>
            <button onClick={() => navigate('/notifications')} className="btn-link-chevron">
              View All <ChevronRight size={16} />
            </button>
          </div>

          <div className="notifications-list mt-3">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div key={notif._id} className={`notif-item ${notif.read ? 'read' : 'unread'}`}>
                  <div className="notif-bullet">
                    <Bell size={16} />
                  </div>
                  <div className="notif-content">
                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>
                    <span className="notif-time">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-text">No recent notifications.</p>
            )}
          </div>
        </section>
      </div>

      {/* Quick Actions Grid */}
      <section className="quick-actions-section mt-4">
        <h2>{t('quickActions')}</h2>
        <div className="grid-3 mt-3">
          {quickActions.map((action, i) => (
            <div key={i} onClick={() => navigate(action.path)} className="glass-card action-card">
              <div className="action-icon-circle" style={{ backgroundColor: `${action.color}15`, border: `1px solid ${action.color}30` }}>
                <action.icon size={24} color={action.color} />
              </div>
              <div className="action-text">
                <h3>{action.label}</h3>
                <p>{action.desc}</p>
              </div>
              <ChevronRight className="action-arrow" size={18} />
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }
        .subtitle {
          color: var(--text-secondary);
          margin-top: -15px;
        }
        .location-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: var(--border-radius-sm);
        }
        .card-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .btn-link-chevron {
          background: transparent;
          border: none;
          color: var(--secondary-color);
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-family);
        }
        .btn-link-chevron:hover {
          color: var(--secondary-hover);
          text-decoration: underline;
        }
        
        /* Weather Details */
        .weather-details-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .weather-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .weather-temp-info {
          display: flex;
          flex-direction: column;
        }
        .weather-temp {
          font-size: 48px;
          font-weight: 800;
          color: #fff;
        }
        .weather-condition {
          font-size: 18px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .weather-icon {
          filter: drop-shadow(0 0 12px rgba(255, 160, 0, 0.4));
        }
        .weather-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          background: rgba(0, 0, 0, 0.2);
          padding: 14px;
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-color);
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stat-label {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .stat-value {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
        }
        .weather-advice {
          font-size: 13px;
          line-height: 1.5;
          color: #a5d6a7;
          background: rgba(46, 125, 50, 0.1);
          padding: 12px;
          border-radius: var(--border-radius-sm);
          border-left: 3px solid var(--primary-color);
        }

        /* Notifications Preview */
        .notif-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: var(--border-radius-sm);
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          margin-bottom: 10px;
          transition: var(--transition-smooth);
        }
        .notif-item.unread {
          border-left: 3px solid var(--secondary-color);
          background: rgba(255, 160, 0, 0.05);
        }
        .notif-bullet {
          color: var(--text-secondary);
          display: flex;
          align-items: flex-start;
          padding-top: 2px;
        }
        .notif-item.unread .notif-bullet {
          color: var(--secondary-color);
        }
        .notif-content h4 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
          color: #fff;
        }
        .notif-content p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 4px;
        }
        .notif-time {
          font-size: 11px;
          color: rgba(144, 165, 149, 0.6);
        }
        .empty-text {
          color: var(--text-secondary);
          text-align: center;
          padding: 20px 0;
          font-size: 14px;
        }

        /* Action Cards */
        .action-card {
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          padding: 16px 20px;
        }
        .action-icon-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-smooth);
        }
        .action-card:hover .action-icon-circle {
          transform: scale(1.1);
        }
        .action-text h3 {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        .action-text p {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .action-arrow {
          margin-left: auto;
          color: var(--text-secondary);
          transition: var(--transition-smooth);
        }
        .action-card:hover .action-arrow {
          color: #fff;
          transform: translateX(4px);
        }

        /* Loading Spinner */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          gap: 16px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(46, 125, 50, 0.1);
          border-radius: 50%;
          border-top-color: var(--primary-color);
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .mt-4 { margin-top: 30px; }
        .mt-3 { margin-top: 20px; }
      `}</style>
    </div>
  );
};
