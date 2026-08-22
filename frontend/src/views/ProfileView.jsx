import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, Phone, MapPin, Sprout, Shield, CheckCircle, Compass } from 'lucide-react';

export const ProfileView = () => {
  const { user, updateProfile, t, location, setLocation } = useApp();
  
  // Local Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [farmingExperience, setFarmingExperience] = useState('0');
  const [landArea, setLandArea] = useState('0');
  
  // Location states
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');

  // Selected crops checkbox states
  const [selectedCrops, setSelectedCrops] = useState([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const availableCrops = [
    'Wheat',
    'Rice',
    'Cotton',
    'Tomato',
    'Sugarcane',
    'Maize',
    'Chilli',
    'Groundnut',
    'Potato',
    'Apple'
  ];

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setPreferredLanguage(user.preferredLanguage || 'en');
      setFarmingExperience(user.farmingExperience?.toString() || '0');
      setLandArea(user.landArea?.toString() || '0');
      setSelectedCrops(user.crops || []);
      
      setAddress(user.location?.address || location.address || '');
      setState(user.location?.state || location.state || '');
      setDistrict(user.location?.district || location.district || '');
    }
  }, [user]);

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      setDetecting(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
            const data = await res.json();
            const addressVal = data.address.city || data.address.town || data.address.suburb || data.address.county || 'Detected Location';
            const stateVal = data.address.state || '';
            const districtVal = data.address.state_district || '';
            
            setAddress(`${addressVal}, ${stateVal}`);
            setState(stateVal);
            setDistrict(districtVal);
            setLocation({ lat, lng, address: `${addressVal}, ${stateVal}`, state: stateVal, district: districtVal });
          } catch (e) {
            setAddress('Detected Location');
            setLocation({ lat, lng, address: 'Detected Location' });
          } finally {
            setDetecting(false);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          alert('Failed to detect GPS location. Please check browser permissions.');
          setDetecting(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleCropToggle = (cropName) => {
    setSelectedCrops(prev => {
      if (prev.includes(cropName)) {
        return prev.filter(c => c !== cropName);
      } else {
        return [...prev, cropName];
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError('');
    setLoading(true);

    const profilePayload = {
      name,
      email,
      phone,
      preferredLanguage,
      farmingExperience: parseInt(farmingExperience) || 0,
      landArea: parseFloat(landArea) || 0,
      crops: selectedCrops,
      location: {
        lat: location.lat,
        lng: location.lng,
        address,
        state,
        district
      }
    };

    const res = await updateProfile(profilePayload);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      // Automatically clear success banner after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error || 'Failed to update profile.');
    }
  };

  return (
    <div className="profile-wrapper slide-in">
      <header className="profile-header mb-4">
        <h1>{t('profile')} Configuration</h1>
        <p className="subtitle">Customize your language, crop selections, location markers, and notifications preferences.</p>
      </header>

      {success && (
        <div className="alert alert-success success-banner-profile mb-4">
          <CheckCircle size={20} />
          <span>Profile configuration saved successfully!</span>
        </div>
      )}

      {error && <div className="alert alert-error mb-4">{error}</div>}

      <form onSubmit={handleSave} className="profile-layout-grid">
        {/* Left Side: General Profile Card */}
        <section className="glass-card profile-details-card">
          <h2>General Details</h2>
          
          <div className="profile-avatar-row mt-3">
            <div className="profile-avatar-fallback">
              <User size={48} color="#fff" />
            </div>
            <div>
              <h3>{name || 'Farmer'}</h3>
              <p className="avatar-loc">{address || 'No Location Set'}</p>
            </div>
          </div>

          <div className="form-fields-container mt-3">
            <div className="input-group">
              <label className="input-label"><User size={14} /> Full Name</label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label"><Phone size={14} /> {t('phone')}</label>
                <input
                  type="tel"
                  className="input-field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled // Phone is bound to account key
                />
              </div>

              <div className="input-group">
                <label className="input-label"><Mail size={14} /> {t('email')}</label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@agroassist.com"
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label"><Shield size={14} /> {t('experience')} (Years)</label>
                <input
                  type="number"
                  className="input-field"
                  value={farmingExperience}
                  onChange={(e) => setFarmingExperience(e.target.value)}
                  min="0"
                />
              </div>

              <div className="input-group">
                <label className="input-label"><Sprout size={14} /> {t('landArea')} (Acres)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Preferences and Crop choices */}
        <div className="profile-preferences-side">
          {/* Language selection card */}
          <section className="glass-card language-card mb-3">
            <h2>{t('language')} Settings</h2>
            <div className="language-options mt-3">
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिन्दी (Hindi)' },
                { code: 'mr', label: 'मराठी (Marathi)' },
                { code: 'ta', label: 'தமிழ் (Tamil)' }
              ].map((lang) => (
                <label key={lang.code} className="lang-radio-label">
                  <input
                    type="radio"
                    name="language"
                    value={lang.code}
                    checked={preferredLanguage === lang.code}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="lang-radio-input"
                  />
                  <span>{lang.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Location manual editing */}
          <section className="glass-card location-card mb-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h2><MapPin size={18} /> Location Details</h2>
              <button 
                type="button" 
                onClick={handleDetectLocation} 
                disabled={detecting}
                className="btn btn-outline btn-sm btn-gps"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Compass size={14} className={detecting ? 'spin' : ''} />
                {detecting ? 'Detecting...' : 'Get GPS Location'}
              </button>
            </div>
            <div className="form-fields-container mt-3">
              <div className="input-group">
                <label className="input-label">Village / Address:</label>
                <input
                  type="text"
                  className="input-field"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shirur Village, Pune"
                />
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">District:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Pune"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">State:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Crop Selections */}
          <section className="glass-card crops-selection-card mb-3">
            <h2>My Principal Crops</h2>
            <p className="section-subtitle mt-1">Select crops grown on your farm for customized notifications.</p>
            <div className="crops-checkbox-grid mt-3">
              {availableCrops.map((cropName) => (
                <label key={cropName} className={`crop-checkbox-label ${selectedCrops.includes(cropName) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedCrops.includes(cropName)}
                    onChange={() => handleCropToggle(cropName)}
                    className="crop-checkbox-input"
                  />
                  <span>{cropName}</span>
                </label>
              ))}
            </div>
          </section>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block py-3 mt-2">
            {loading ? 'Saving preferences...' : t('saveChanges')}
          </button>
        </div>
      </form>

      <style>{`
        .profile-layout-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
          align-items: flex-start;
        }
        .profile-avatar-row {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 16px;
          border-radius: var(--border-radius-sm);
        }
        .profile-avatar-fallback {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-color) 0%, #388e3c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--border-color);
        }
        .profile-avatar-row h3 {
          color: #fff;
          font-size: 18px;
        }
        .avatar-loc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        
        /* Language radios */
        .language-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .lang-radio-label {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          font-size: 14px;
          transition: var(--transition-smooth);
        }
        .lang-radio-label:hover {
          border-color: var(--primary-color);
        }
        .lang-radio-input {
          accent-color: var(--primary-color);
        }
        
        /* Crops checklist selection */
        .section-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .crops-checkbox-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .crop-checkbox-label {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: var(--transition-smooth);
        }
        .crop-checkbox-label.selected {
          border-color: var(--primary-color);
          background: var(--primary-light);
          color: #81c784;
        }
        .crop-checkbox-input {
          display: none;
        }
        
        .success-banner-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .spin {
          animation: gps-spin 1s linear infinite;
        }
        @keyframes gps-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .btn-gps {
          font-size: 12px;
          padding: 6px 12px;
          height: auto;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
        }
        .btn-gps:hover {
          background: rgba(129, 199, 132, 0.1);
          border-color: var(--primary-color);
          color: #fff;
        }
        .py-3 { padding-top: 14px; padding-bottom: 14px; }
        
        @media (max-width: 1024px) {
          .profile-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .crops-checkbox-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .language-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
