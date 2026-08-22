import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Droplet, Calendar, Sliders, Trash2, Bell, BellOff, Info, AlertTriangle } from 'lucide-react';

export const WaterManagement = () => {
  const { token, API_URL, t } = useApp();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields
  const [crop, setCrop] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [soilType, setSoilType] = useState('Loamy Soil');
  const [plantingDate, setPlantingDate] = useState('');
  const [irrigationMethod, setIrrigationMethod] = useState('Drip Irrigation');

  useEffect(() => {
    if (token) {
      fetchSchedules();
    }
  }, [token]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/water`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (e) {
      console.error('Error fetching schedules:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!crop || !fieldSize || !plantingDate) {
      setError('Please fill in all required inputs.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/water`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          crop,
          fieldSize: parseFloat(fieldSize),
          soilType,
          plantingDate,
          irrigationMethod
        })
      });

      if (res.ok) {
        // Reset form
        setCrop('');
        setFieldSize('');
        setPlantingDate('');
        fetchSchedules();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to create schedule.');
      }
    } catch (e) {
      setError('Failed to reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminder = async (id, currentVal) => {
    try {
      const res = await fetch(`${API_URL}/water/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ remindersEnabled: !currentVal })
      });
      if (res.ok) {
        fetchSchedules();
      }
    } catch (e) {
      console.error('Error toggling reminder:', e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this watering schedule?')) return;
    try {
      const res = await fetch(`${API_URL}/water/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSchedules();
      }
    } catch (e) {
      console.error('Error deleting schedule:', e);
    }
  };

  return (
    <div className="water-wrapper slide-in">
      <header className="water-header mb-4">
        <h1>{t('water')} Planner</h1>
        <p className="subtitle">Optimize field water management and irrigation schedules dynamically using local parameters.</p>
      </header>

      {/* Advisory warning header */}
      <section className="alert alert-info advisory-warning mb-4">
        <Info size={20} className="info-icon" />
        <div>
          <strong>AI Advisory Recommendation Notice:</strong>
          <p>Irrigation predictions are guidelines calculated using crop type, soil moisture retention rates, and general weather forecasts. They are agricultural recommendations and do not represent absolute guarantees. Adjust as needed based on local physical field inspections.</p>
        </div>
      </section>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="grid-2">
        {/* Form Creation Card */}
        <section className="glass-card form-card">
          <h2>Create Watering Schedule</h2>
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="input-group">
              <label className="input-label">Select Crop Type:</label>
              <input
                type="text"
                className="input-field"
                placeholder="Tomato, Cotton, Sugarcane, Wheat, etc."
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Field Size (Acres):</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  placeholder="e.g. 2.5"
                  value={fieldSize}
                  onChange={(e) => setFieldSize(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Soil Type:</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="input-field"
                >
                  <option value="Loamy Soil">Loamy Soil</option>
                  <option value="Sandy Soil">Sandy Soil</option>
                  <option value="Clay Soil">Clay Soil</option>
                  <option value="Black Cotton Soil">Black Cotton Soil</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Planting Date:</label>
                <input
                  type="date"
                  className="input-field"
                  value={plantingDate}
                  onChange={(e) => setPlantingDate(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Irrigation Method:</label>
                <select
                  value={irrigationMethod}
                  onChange={(e) => setIrrigationMethod(e.target.value)}
                  className="input-field"
                >
                  <option value="Drip Irrigation">Drip Irrigation</option>
                  <option value="Sprinkler Irrigation">Sprinkler Irrigation</option>
                  <option value="Flood Irrigation">Flood Irrigation</option>
                  <option value="Furrow Irrigation">Furrow Irrigation</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block mt-3">
              {loading ? 'Calculating...' : 'Generate Irrigation Schedule'}
            </button>
          </form>
        </section>

        {/* Existing Schedules list */}
        <section className="glass-card schedules-list-card">
          <h2>Active Watering Schedules</h2>
          
          {loading && schedules.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Retrieving schedule parameters...</p>
            </div>
          ) : schedules.length > 0 ? (
            <div className="schedules-scroll mt-3">
              {schedules.map((schedule) => {
                // Calculate estimated daily liters per acre
                const nextDate = new Date(schedule.nextWatering);
                
                return (
                  <div key={schedule._id} className="schedule-item-box mb-3">
                    <div className="schedule-item-header">
                      <div className="crop-title-box">
                        <Droplet color="#4db6ac" size={20} />
                        <div>
                          <h4>{schedule.crop}</h4>
                          <span className="field-size-sub">{schedule.fieldSize} Acres • {schedule.soilType}</span>
                        </div>
                      </div>
                      <div className="schedule-actions">
                        <button
                          onClick={() => handleToggleReminder(schedule._id, schedule.remindersEnabled)}
                          className={`btn-reminder-toggle ${schedule.remindersEnabled ? 'enabled' : 'disabled'}`}
                          title={schedule.remindersEnabled ? 'Disable Reminder' : 'Enable Reminder'}
                        >
                          {schedule.remindersEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(schedule._id)}
                          className="btn-delete-schedule"
                          title="Delete Schedule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="schedule-metrics-row mt-2">
                      <div className="metric-col">
                        <span className="col-lbl">NEXT WATERING</span>
                        <span className="col-val">
                          {nextDate.toLocaleDateString()} at{' '}
                          {nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="metric-col">
                        <span className="col-lbl">IRRIGATION TYPE</span>
                        <span className="col-val">{schedule.irrigationMethod}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-results mt-4">
              <Droplet size={48} color="rgba(144, 165, 149, 0.2)" />
              <p>No active watering schedules. Create one using the planner.</p>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .advisory-warning {
          display: flex;
          gap: 16px;
          align-items: center;
          background: rgba(0, 121, 107, 0.1) !important;
          border: 1px solid var(--accent-color) !important;
          color: #80cbc4 !important;
        }
        .info-icon {
          flex-shrink: 0;
        }
        .field-size-sub {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .schedules-scroll {
          max-height: 480px;
          overflow-y: auto;
          padding-right: 6px;
        }
        
        /* Schedule Items */
        .schedule-item-box {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 16px;
          transition: var(--transition-smooth);
        }
        .schedule-item-box:hover {
          border-color: rgba(46, 125, 50, 0.4);
        }
        .schedule-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .crop-title-box {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .crop-title-box h4 {
          font-size: 16px;
          color: #fff;
          margin: 0;
        }
        .schedule-actions {
          display: flex;
          gap: 8px;
        }
        .btn-reminder-toggle {
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .btn-reminder-toggle.enabled {
          color: var(--secondary-color);
          background: rgba(255, 160, 0, 0.1);
        }
        .btn-reminder-toggle.disabled {
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
        }
        .btn-delete-schedule {
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: var(--border-radius-sm);
          color: #e57373;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .btn-delete-schedule:hover {
          background: rgba(211, 47, 47, 0.1);
        }
        
        .schedule-metrics-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 12px;
        }
        .metric-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .col-lbl {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .col-val {
          font-size: 13px;
          color: #fff;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
