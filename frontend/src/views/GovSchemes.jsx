import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FileSpreadsheet, ExternalLink, Calendar, Users, Bookmark, FileCheck } from 'lucide-react';

export const GovSchemes = () => {
  const { token, API_URL } = useApp();
  const [schemes, setSchemes] = useState([]);
  const [userStates, setUserStates] = useState({}); // { schemeId: status }
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSchemes();
    if (token) {
      fetchUserSchemeStates();
    }
  }, [token]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/schemes`);
      if (res.ok) {
        const data = await res.json();
        setSchemes(data);
      }
    } catch (e) {
      console.error('Error fetching schemes:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSchemeStates = async () => {
    try {
      const res = await fetch(`${API_URL}/schemes/user-states`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Map to key-value object
        const statesMap = {};
        data.forEach(item => {
          statesMap[item.schemeId] = item.status;
        });
        setUserStates(statesMap);
      }
    } catch (e) {
      console.error('Error fetching user scheme states:', e);
    }
  };

  const handleStatusChange = async (schemeId, status) => {
    try {
      const res = await fetch(`${API_URL}/schemes/update-state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ schemeId, status })
      });
      
      if (res.ok) {
        // Update local state
        setUserStates(prev => ({
          ...prev,
          [schemeId]: status
        }));
      }
    } catch (e) {
      console.error('Error updating scheme state:', e);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Interested': return 'badge-warning';
      case 'Applied': return 'badge-info';
      case 'Completed': return 'badge-success';
      default: return 'badge-outline-grey';
    }
  };

  const filteredSchemes = schemes.filter(scheme => {
    const status = userStates[scheme.id] || 'Not Applied';
    
    // Status Filter
    if (filterStatus !== 'All' && status !== filterStatus) {
      return false;
    }
    
    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        scheme.name.toLowerCase().includes(query) ||
        scheme.description.toLowerCase().includes(query) ||
        scheme.region.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  return (
    <div className="schemes-wrapper slide-in">
      <header className="schemes-header mb-4">
        <h1>Agricultural Government Schemes</h1>
        <p className="subtitle">Explore active state and national subsidies and track your application milestones.</p>
      </header>

      {/* Filters Toolbar */}
      <section className="glass-card schemes-filters mb-4">
        <div className="search-box">
          <input
            type="text"
            className="input-field search-input"
            placeholder="Search schemes by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="status-filters">
          <span className="filter-label">Filter Status:</span>
          {['All', 'Not Applied', 'Interested', 'Applied', 'Completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-outline'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {/* Schemes Grid */}
      {loading ? (
        <div className="loading-state glass-card">
          <div className="spinner"></div>
          <p>Retrieving schemes database...</p>
        </div>
      ) : filteredSchemes.length > 0 ? (
        <div className="schemes-list">
          {filteredSchemes.map((scheme) => {
            const currentStatus = userStates[scheme.id] || 'Not Applied';
            
            return (
              <div key={scheme.id} className="glass-card scheme-card mb-3">
                <div className="scheme-card-header">
                  <div className="scheme-title-box">
                    <FileSpreadsheet color="#ba68c8" size={24} />
                    <div>
                      <h3>{scheme.name}</h3>
                      <span className="scheme-region">{scheme.region} Scheme</span>
                    </div>
                  </div>

                  {/* Status Tracker */}
                  <div className="status-tracker-box">
                    <span className={`badge ${getStatusBadgeClass(currentStatus)}`}>
                      {currentStatus}
                    </span>
                    
                    {token && (
                      <select
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(scheme.id, e.target.value)}
                        className="status-selector-dropdown"
                      >
                        <option value="Not Applied">Not Applied</option>
                        <option value="Interested">Interested</option>
                        <option value="Applied">Applied</option>
                        <option value="Completed">Completed</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="scheme-body mt-3">
                  <p className="scheme-desc">{scheme.description}</p>
                  
                  <div className="scheme-details-grid mt-3">
                    <div className="details-item">
                      <strong><Users size={16} /> Eligibility Criteria:</strong>
                      <p>{scheme.eligibility}</p>
                    </div>
                    <div className="details-item">
                      <strong><Bookmark size={16} /> Benefits & Subsidies:</strong>
                      <p>{scheme.benefits}</p>
                    </div>
                    <div className="details-item">
                      <strong><FileCheck size={16} /> Required Documents:</strong>
                      <p>{scheme.requiredDocuments}</p>
                    </div>
                    <div className="details-item">
                      <strong><Calendar size={16} /> Deadline:</strong>
                      <p>{scheme.deadline}</p>
                    </div>
                  </div>
                </div>

                <div className="scheme-footer mt-3">
                  <a
                    href={scheme.officialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary apply-btn"
                  >
                    Apply Now <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card empty-results">
          <FileSpreadsheet size={48} color="rgba(144, 165, 149, 0.2)" />
          <p>No government schemes matched your search criteria.</p>
        </div>
      )}

      <style>{`
        .schemes-filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          padding: 16px 24px;
        }
        .search-box {
          flex: 1;
          min-width: 250px;
        }
        .search-input {
          margin-bottom: 0;
        }
        .status-filters {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .filter-label {
          font-size: 14px;
          color: var(--text-secondary);
          margin-right: 8px;
          font-weight: 500;
        }
        .btn-sm {
          padding: 8px 16px;
          font-size: 13px;
          border-radius: var(--border-radius-sm);
        }
        
        /* Scheme Cards */
        .scheme-card {
          border-left: 4px solid var(--primary-color);
          transition: var(--transition-smooth);
        }
        .scheme-card:hover {
          transform: translateY(-2px);
          border-left-color: var(--secondary-color);
        }
        .scheme-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }
        .scheme-title-box {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .scheme-title-box h3 {
          font-size: 18px;
          color: #fff;
          margin-bottom: 4px;
        }
        .scheme-region {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-tracker-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .badge-outline-grey {
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
        }
        .status-selector-dropdown {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 6px 12px;
          font-family: var(--font-family);
          font-size: 13px;
          border-radius: var(--border-radius-sm);
          cursor: pointer;
        }
        
        .scheme-desc {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-primary);
        }
        .scheme-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          background: rgba(0, 0, 0, 0.15);
          padding: 20px;
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-color);
        }
        .details-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .details-item strong {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .details-item p {
          font-size: 14px;
          color: #fff;
          line-height: 1.5;
        }
        .apply-btn {
          font-size: 14px;
          padding: 10px 20px;
        }
        .mb-4 { margin-bottom: 24px; }
        .mb-3 { margin-bottom: 16px; }
        
        @media (max-width: 768px) {
          .scheme-details-grid {
            grid-template-columns: 1fr;
          }
          .scheme-card-header {
            flex-direction: column;
            align-items: stretch;
          }
          .status-tracker-box {
            margin-top: 10px;
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};
