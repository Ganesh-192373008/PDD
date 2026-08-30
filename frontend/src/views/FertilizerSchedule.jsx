import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Sprout, Calendar, Trash2, Bell, BellOff, Info } from 'lucide-react';

export const FertilizerSchedule = () => {
  const { token, API_URL, t } = useApp();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [crop, setCrop] = useState('');
  const [growthStage, setGrowthStage] = useState('Germination / Seedling');
  const [soilInfo, setSoilInfo] = useState('Loamy Soil');
  const [plantingDate, setPlantingDate] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [applicationTime, setApplicationTime] = useState('08:00');
  const [nextApplicationDate, setNextApplicationDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (token) {
      fetchSchedules();
    }
  }, [token]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/fertilizer`, {
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
    if (!crop || !growthStage || !soilInfo || !plantingDate || !fieldSize) {
      setError('Please fill in all inputs.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/fertilizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          crop,
          growthStage,
          soilInfo,
          plantingDate,
          fieldSize: parseFloat(fieldSize),
          applicationTime,
          nextApplication: nextApplicationDate
        })
      });

      if (res.ok) {
        setCrop('');
        setFieldSize('');
        setPlantingDate('');
        fetchSchedules();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to create schedule.');
      }
    } catch (e) {
      setError('Failed to contact backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminder = async (id, currentVal) => {
    try {
      const res = await fetch(`${API_URL}/fertilizer/${id}`, {
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
    if (!window.confirm('Delete this fertilizer schedule?')) return;
    try {
      const res = await fetch(`${API_URL}/fertilizer/${id}`, {
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
    <div className="fertilizer-wrapper slide-in">
      <header className="fertilizer-header mb-4">
        <h1>{t('fertilizer')} Schedule</h1>
        <p className="subtitle">Plan nutrient applications based on crop growth stages, acreage, and soil properties.</p>
      </header>

      {/* Chemical advisory warning */}
      <section className="alert alert-info chemical-advisory mb-4">
        <Info size={20} className="info-icon" />
        <div>
          <strong>Nutrient & Chemical Recommendation Notice:</strong>
          <p>Fertilizer guidelines are general recommendations only. Do not apply exact chemical dosages without conducting localized soil nutrient testing. Always follow product manufacturer instructions and wear personal protective equipment when applying chemicals.</p>
        </div>
      </section>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="grid-2">
        {/* Form Creation */}
        <section className="glass-card form-card">
          <h2>Create Fertilizer Schedule</h2>
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="input-group">
              <label className="input-label">Select Crop Type:</label>
              <input
                type="text"
                className="input-field"
                placeholder="Tomato, Cotton, Rice, Wheat, etc."
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Growth Stage:</label>
                <select
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  className="input-field"
                >
                  <option value="Germination / Seedling">Germination / Seedling</option>
                  <option value="Vegetative Stage">Vegetative Stage</option>
                  <option value="Flowering Stage">Flowering Stage</option>
                  <option value="Fruiting / Grain Fill">Fruiting / Grain Fill</option>
                  <option value="Harvesting Stage">Harvesting Stage</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Soil Information:</label>
                <select
                  value={soilInfo}
                  onChange={(e) => setSoilInfo(e.target.value)}
                  className="input-field"
                >
                  <option value="Loamy Soil">Loamy Soil</option>
                  <option value="Sandy Soil">Sandy Soil</option>
                  <option value="Clay Soil">Clay Soil</option>
                  <option value="Black Soil">Black Soil</option>
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
                <label className="input-label">Field Size (Acres):</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  placeholder="e.g. 5.0"
                  value={fieldSize}
                  onChange={(e) => setFieldSize(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2 mt-2">
              <div className="input-group">
                <label className="input-label">Next Application Date:</label>
                <input
                  type="date"
                  className="input-field"
                  value={nextApplicationDate}
                  onChange={(e) => setNextApplicationDate(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Reminder Alarm Time:</label>
                <input
                  type="time"
                  className="input-field"
                  value={applicationTime}
                  onChange={(e) => setApplicationTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block mt-3">
              {loading ? 'Analyzing...' : 'Generate Fertilizer Schedule'}
            </button>
          </form>
        </section>

        {/* List of Schedules */}
        <section className="glass-card schedules-list-card">
          <h2>Active Fertilizer Schedules</h2>
          
          {loading && schedules.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Retrieving schedule parameters...</p>
            </div>
          ) : schedules.length > 0 ? (
            <div className="schedules-scroll mt-3">
              {schedules.map((schedule) => {
                const nextDate = new Date(schedule.nextApplication);
                
                return (
                  <div key={schedule._id} className="schedule-item-box mb-3">
                    <div className="schedule-item-header">
                      <div className="crop-title-box">
                        <Sprout color="#81c784" size={20} />
                        <div>
                          <h4>{schedule.crop}</h4>
                          <span className="field-size-sub">
                            {schedule.fieldSize} Acres • {schedule.growthStage}
                          </span>
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
                        <span className="col-lbl">RECOMMENDED NUTRIENT</span>
                        <span className="col-val" style={{ color: 'var(--secondary-color)' }}>
                          {schedule.fertilizerType}
                        </span>
                      </div>

                      <div className="metric-col">
                        <span className="col-lbl">NEXT APPLICATION DATE</span>
                        <span className="col-val">
                          {nextDate.toLocaleDateString()} at{' '}
                          {schedule.applicationTime || '08:00'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-results mt-4">
              <Sprout size={48} color="rgba(144, 165, 149, 0.2)" />
              <p>No active fertilizer schedules. Create one using the planner.</p>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .chemical-advisory {
          background: rgba(161, 136, 127, 0.1) !important;
          border: 1px solid #a1887f !important;
          color: #d7ccc8 !important;
        }
        .schedules-scroll {
          max-height: 480px;
          overflow-y: auto;
          padding-right: 6px;
        }
      `}</style>
    </div>
  );
};
