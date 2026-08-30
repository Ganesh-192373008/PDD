import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  History as HistoryIcon, Clock, Eye, Trash2, ShieldAlert, 
  Droplet, Sprout, MessageSquare, AlertCircle, CheckCircle2, ChevronRight 
} from 'lucide-react';

export const History = () => {
  const { token, API_URL, t } = useApp();
  const [scans, setScans] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('scans'); // 'scans', 'activities'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans || []);
        setActivities(data.activities || []);
      } else {
        setError('Failed to fetch history details.');
      }
    } catch (e) {
      console.error('History fetch error:', e);
      setError('Connection to server failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScan = async (scanId) => {
    if (!window.confirm('Remove this scan record from your history?')) return;

    try {
      const res = await fetch(`${API_URL}/history/scans/${scanId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setScans(prev => prev.filter(item => item._id !== scanId));
        setSuccess('Scan record deleted.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete scan record.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting scan:', err);
      setError('Connection failed.');
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'severe':
        return 'severity-critical';
      case 'moderate':
        return 'severity-moderate';
      case 'none':
      case 'healthy':
      default:
        return 'severity-healthy';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'water':
        return <Droplet size={18} className="activity-icon water" />;
      case 'fertilizer':
        return <Sprout size={18} className="activity-icon fertilizer" />;
      case 'community':
        return <MessageSquare size={18} className="activity-icon community" />;
      default:
        return <Clock size={18} className="activity-icon default" />;
    }
  };

  return (
    <div className="history-page-wrapper slide-in">
      {success && (
        <div className="alert alert-success floating-alert">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {error && (
        <div className="alert alert-error floating-alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Header section */}
      <header className="history-header-card">
        <div className="header-top">
          <HistoryIcon size={24} className="mr-2" />
          <div>
            <h1>Activity & Scan History</h1>
            <p className="subtitle">Track your scans, irrigation plans, and forum topics</p>
          </div>
        </div>

        <div className="history-tabs-row mt-3">
          <button 
            onClick={() => setActiveTab('scans')} 
            className={`tab-pill ${activeTab === 'scans' ? 'active' : ''}`}
          >
            📸 Crop Disease Scans
          </button>
          <button 
            onClick={() => setActiveTab('activities')} 
            className={`tab-pill ${activeTab === 'activities' ? 'active' : ''}`}
          >
            📝 Farming Log
          </button>
        </div>
      </header>

      {/* Quick Statistics Summary */}
      {!loading && (
        <div className="history-stats-grid mt-4 glass-card">
          <div className="stat-card">
            <span className="stat-label">Scans Completed</span>
            <span className="stat-number">{scans.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Activities</span>
            <span className="stat-number">{activities.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Critical Issues</span>
            <span className="stat-number">
              {scans.filter(s => s.severity?.toLowerCase() === 'critical' || s.severity?.toLowerCase() === 'severe').length}
            </span>
          </div>
        </div>
      )}

      {/* Main lists */}
      <div className="history-content-container mt-4">
        {loading ? (
          <div className="skeleton-container">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="skeleton-card glass-card">
                <div className="skeleton-line short"></div>
                <div className="skeleton-line mt-3"></div>
                <div className="skeleton-line medium mt-2"></div>
              </div>
            ))}
          </div>
        ) : activeTab === 'scans' ? (
          scans.length > 0 ? (
            <div className="scans-list">
              {scans.map((scan) => (
                <div key={scan._id} className="scan-card glass-card hover-glow">
                  <div className="scan-card-header">
                    <div>
                      <h3>{scan.crop} Leaf</h3>
                      <span className="scan-date">{formatTimeAgo(scan.createdAt)}</span>
                    </div>
                    <div className="scan-header-actions">
                      <span className={`badge ${getSeverityBadgeClass(scan.severity)}`}>
                        {scan.disease} ({scan.severity})
                      </span>
                      <button 
                        onClick={() => handleDeleteScan(scan._id)} 
                        className="btn-delete-scan"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="scan-card-body mt-3">
                    <p className="recommendation-text">
                      <strong>Recommendation:</strong> {scan.recommendation}
                    </p>
                    <div className="scan-meta-footer mt-2">
                      <span className="confidence-score">
                        🎯 Model Confidence: <strong>{scan.confidence}%</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-history glass-card">
              <ShieldAlert size={48} className="empty-icon mb-2" />
              <p>No crop disease scans completed yet. Try scanning a crop on the Detect page!</p>
            </div>
          )
        ) : (
          // Farming Log Activities
          activities.length > 0 ? (
            <div className="activities-timeline">
              {activities.map((act, index) => (
                <div key={index} className="activity-timeline-item glass-card hover-glow">
                  {getActivityIcon(act.type)}
                  <div className="activity-timeline-content">
                    <div className="timeline-header">
                      <h4>{act.title}</h4>
                      <span className="timeline-date">{formatTimeAgo(act.createdAt)}</span>
                    </div>
                    <p className="timeline-description mt-1">
                      {act.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-history glass-card">
              <Clock size={48} className="empty-icon mb-2" />
              <p>No activities recorded in your farming log. Create a schedule or post to community!</p>
            </div>
          )
        )}
      </div>

      <style>{`
        .history-page-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 80px;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .history-header-card {
          background: linear-gradient(135deg, #e64a19 0%, #d84315 100%);
          border-radius: var(--border-radius-md);
          padding: 24px;
          color: #fff;
          box-shadow: 0 8px 32px rgba(216, 67, 21, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .history-header-card h1 {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }
        .header-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .history-header-card .subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          margin-top: 4px;
        }

        .history-tabs-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tab-pill {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .tab-pill:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .tab-pill.active {
          background: #fff;
          color: #d84315;
          border-color: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .history-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--border-radius-sm);
        }
        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .stat-label {
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .stat-number {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin-top: 4px;
        }

        /* Scan Cards */
        .scan-card {
          padding: 20px;
          margin-bottom: 16px;
          transition: var(--transition-smooth);
        }
        .scan-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .scan-card h3 {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        .scan-date {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .scan-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-delete-scan {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .btn-delete-scan:hover {
          color: #ff4757;
        }

        .recommendation-text {
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.5;
        }
        .confidence-score {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .severity-critical {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.3);
        }
        .severity-moderate {
          background: rgba(241, 196, 15, 0.2);
          color: #f1c40f;
          border: 1px solid rgba(241, 196, 15, 0.3);
        }
        .severity-healthy {
          background: rgba(46, 125, 50, 0.2);
          color: #2e7d32;
          border: 1px solid rgba(46, 125, 50, 0.3);
        }

        /* Timeline Activities */
        .activities-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .activity-timeline-item {
          display: flex;
          gap: 16px;
          padding: 16px;
          align-items: center;
        }
        .activity-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .activity-icon.water {
          background: rgba(30, 144, 255, 0.15);
          color: #1e90ff;
        }
        .activity-icon.fertilizer {
          background: rgba(46, 125, 50, 0.15);
          color: #2e7d32;
        }
        .activity-icon.community {
          background: rgba(186, 104, 200, 0.15);
          color: #ba68c8;
        }
        .activity-timeline-content {
          flex-grow: 1;
        }
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .timeline-header h4 {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        .timeline-date {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .timeline-description {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .empty-history {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 45px;
          text-align: center;
          color: var(--text-secondary);
        }
        .empty-icon {
          opacity: 0.2;
        }

        /* Skeleton Loading */
        .skeleton-card {
          padding: 20px;
          margin-bottom: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .skeleton-line {
          height: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .skeleton-line.short {
          width: 40%;
        }
        .skeleton-line.medium {
          width: 70%;
        }
      `}</style>
    </div>
  );
};
