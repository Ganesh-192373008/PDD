import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, MapPin, Phone, RefreshCw, Compass, ArrowUpDown } from 'lucide-react';

export const MarketPrices = () => {
  const { location, API_URL, t } = useApp();
  const [markets, setMarkets] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCrops();
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [location.lat, location.lng, selectedCrop, sortBy]);

  const fetchCrops = async () => {
    try {
      const res = await fetch(`${API_URL}/market/crops`);
      if (res.ok) {
        const data = await res.json();
        setCrops(data);
      }
    } catch (e) {
      console.error('Error fetching crops:', e);
    }
  };

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      // Pass coordinates so backend can calculate distance using Haversine formula
      let queryUrl = `${API_URL}/market?lat=${location.lat}&lng=${location.lng}&sortBy=${sortBy}`;
      if (selectedCrop) {
        queryUrl += `&crop=${encodeURIComponent(selectedCrop)}`;
      }
      
      const res = await fetch(queryUrl);
      if (res.ok) {
        const data = await res.json();
        setMarkets(data);
      }
    } catch (e) {
      console.error('Error fetching markets:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="market-wrapper slide-in">
      <header className="market-header mb-4">
        <h1>{t('marketPrices')} & mandis</h1>
        <p className="subtitle">Track commodity prices in nearby agricultural markets. Distances calculated from your current GPS location.</p>
      </header>

      {/* Filter and Sorting toolbar */}
      <section className="glass-card market-toolbar mb-4">
        <div className="toolbar-item">
          <label className="input-label">Filter by Crop:</label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="toolbar-select"
          >
            <option value="">All Commodities</option>
            {crops.map((crop) => (
              <option key={crop} value={crop}>{crop}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-item">
          <label className="input-label">Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="toolbar-select"
          >
            <option value="distance">Nearest Market (GPS)</option>
            {selectedCrop && <option value="price">Highest Price</option>}
            <option value="name">Market Name</option>
          </select>
        </div>

        <button onClick={fetchMarkets} className="btn btn-outline btn-refresh">
          <RefreshCw size={16} /> Refresh
        </button>
      </section>

      {/* Markets Grid */}
      {loading ? (
        <div className="loading-state glass-card">
          <div className="spinner"></div>
          <p>Calculating distances and rates...</p>
        </div>
      ) : markets.length > 0 ? (
        <div className="grid-2">
          {markets.map((market) => (
            <div key={market.id} className="glass-card market-card">
              <div className="market-card-header">
                <div className="market-info-box">
                  <Compass color="#ffa000" size={24} />
                  <div>
                    <h3>{market.name}</h3>
                    <p className="market-addr">{market.address}</p>
                  </div>
                </div>
                {market.distance !== null && (
                  <span className="distance-tag">{market.distance} km away</span>
                )}
              </div>

              {/* Commodity rates table */}
              <div className="commodity-rates-table mt-3">
                <div className="table-header">
                  <span>Crop (Variety)</span>
                  <span className="text-right">Price</span>
                </div>
                {market.prices.map((item, idx) => (
                  <div key={idx} className="table-row">
                    <span className="crop-name">{item.crop} <span className="crop-variety">({item.variety})</span></span>
                    <span className="crop-price text-right">₹{item.price.toFixed(2)} / {item.unit}</span>
                  </div>
                ))}
              </div>

              <div className="market-contact-info mt-3">
                {market.contact && (
                  <p className="contact-item"><Phone size={14} /> <strong>Contact:</strong> {market.contact}</p>
                )}
                <p className="contact-item"><TrendingUp size={14} /> <strong>Data Source:</strong> {market.source}</p>
                <p className="contact-item-date">Updated: {new Date(market.updatedAt).toLocaleString()}</p>
              </div>

              <div className="market-actions mt-3">
                <a
                  href={market.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-block text-center"
                >
                  <MapPin size={16} /> Get Directions (Google Maps)
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card empty-results">
          <TrendingUp size={48} color="rgba(144, 165, 149, 0.2)" />
          <p>No agricultural market listings found matching selection.</p>
        </div>
      )}

      <style>{`
        .market-toolbar {
          display: flex;
          gap: 20px;
          align-items: center;
          padding: 16px 24px;
          flex-wrap: wrap;
        }
        .toolbar-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 200px;
        }
        .toolbar-select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 12px;
          font-family: var(--font-family);
          border-radius: var(--border-radius-sm);
          font-size: 15px;
          cursor: pointer;
        }
        .btn-refresh {
          height: fit-content;
          align-self: flex-end;
          padding: 12px 20px;
        }
        
        /* Market Cards */
        .market-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-top: 3px solid var(--secondary-color);
        }
        .market-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .market-info-box {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .market-info-box h3 {
          font-size: 17px;
          color: #fff;
          margin-bottom: 2px;
        }
        .market-addr {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .distance-tag {
          font-size: 12px;
          font-weight: 700;
          color: var(--secondary-color);
          background: rgba(255, 160, 0, 0.15);
          padding: 4px 10px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        
        /* Commodity Rates Table */
        .commodity-rates-table {
          background: rgba(0, 0, 0, 0.25);
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        .table-header {
          display: flex;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(46, 125, 50, 0.1);
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .table-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(46, 125, 50, 0.15);
          font-size: 14px;
        }
        .table-row:last-child {
          border-bottom: none;
        }
        .crop-name {
          color: #fff;
          font-weight: 600;
        }
        .crop-variety {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: normal;
        }
        .crop-price {
          color: var(--secondary-color);
          font-weight: 700;
        }
        .text-right {
          text-align: right;
        }
        
        .market-contact-info {
          font-size: 13px;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .contact-item-date {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
        }
        
        @media (max-width: 768px) {
          .market-card-header {
            flex-direction: column;
          }
          .distance-tag {
            align-self: flex-start;
            margin-top: 6px;
          }
        }
      `}</style>
    </div>
  );
};
