import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  MessageSquare,
  ScanEye,
  FileSpreadsheet,
  TrendingUp,
  Droplet,
  Sprout,
  ShoppingBag,
  ShoppingCart,
  Bell,
  User,
  LogOut,
  Leaf,
  Globe,
  FolderLock
} from 'lucide-react';

export const Navigation = () => {
  const { t, unreadNotifications, setToken, setUser, cart } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/ai-assistant', label: t('aiAssistant'), icon: MessageSquare },
    { path: '/scan', label: t('scanCrop'), icon: ScanEye },
    { path: '/documents', label: '🔐 ' + (t('vault') || 'My Secure Documents'), icon: FolderLock },
    { path: '/schemes', label: t('schemes'), icon: FileSpreadsheet },
    { path: '/market-prices', label: t('marketPrices'), icon: TrendingUp },
    { path: '/community', label: t('community'), icon: Globe },
    { path: '/water-management', label: t('water'), icon: Droplet },
    { path: '/fertilizer-schedule', label: t('fertilizer'), icon: Sprout },
    { path: '/products', label: t('products'), icon: ShoppingBag },
    { path: '/cart', label: t('cart'), icon: ShoppingCart, badge: 'cart' },
    { path: '/notifications', label: t('notifications'), icon: Bell, badge: 'notifications' },
    { path: '/profile', label: t('profile'), icon: User },
  ];

  const renderBadge = (item) => {
    if (item.badge === 'notifications' && unreadNotifications > 0) {
      return <span className="nav-badge">{unreadNotifications}</span>;
    }
    if (item.badge === 'cart' && cart?.items?.length > 0) {
      const totalItems = cart.items.reduce((acc, curr) => acc + curr.quantity, 0);
      return <span className="nav-badge cart-badge">{totalItems}</span>;
    }
    return null;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Leaf className="brand-logo" color="#81c784" size={32} />
          <span className="brand-text">AgroAssist AI</span>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span className="link-label">{item.label}</span>
              {item.badge && renderBadge(item)}
            </NavLink>
          ))}
          
          <button onClick={handleLogout} className="sidebar-link logout-btn">
            <LogOut size={20} />
            <span className="link-label">{t('logout')}</span>
          </button>
        </nav>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          {[
            { path: '/', label: t('dashboard'), icon: LayoutDashboard },
            { path: '/scan', label: t('scanCrop'), icon: ScanEye },
            { path: '/community', label: t('community'), icon: Globe },
            { path: '/ai-assistant', label: t('aiAssistant'), icon: MessageSquare },
            { path: '/profile', label: t('profile'), icon: User }
          ].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <div style={{ position: 'relative' }}>
                <item.icon size={22} />
              </div>
              <span style={{ fontSize: '10px' }}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      
      {/* Styles for Navigation */}
      <style>{`
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(46, 125, 50, 0.25);
        }
        .brand-logo {
          filter: drop-shadow(0 0 8px rgba(129, 199, 132, 0.5));
        }
        .brand-text {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.5px;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          flex-grow: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--border-radius-sm);
          font-weight: 500;
          transition: var(--transition-smooth);
          background: transparent;
          border: none;
          text-align: left;
          width: 100%;
          cursor: pointer;
          position: relative;
        }
        .sidebar-link:hover {
          color: #fff;
          background: rgba(46, 125, 50, 0.15);
        }
        .sidebar-link.active {
          color: #fff;
          background: linear-gradient(135deg, var(--primary-color) 0%, rgba(56, 142, 60, 0.7) 100%);
          box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2);
        }
        .logout-btn {
          margin-top: auto;
          color: #e57373;
          border-top: 1px solid rgba(211, 47, 47, 0.15);
          padding-top: 16px;
          border-radius: 0;
        }
        .logout-btn:hover {
          background: rgba(211, 47, 47, 0.1);
          color: #ff8a80;
        }
        .nav-badge {
          position: absolute;
          right: 16px;
          background: var(--danger-color);
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }
        .cart-badge {
          background: var(--secondary-color);
          color: black;
        }
        
        @media (max-width: 768px) {
          .nav-badge {
            position: absolute;
            top: -4px;
            right: -10px;
            padding: 1px 4px;
            font-size: 9px;
            min-width: 14px;
            border-radius: 8px;
          }
        }
      `}</style>
    </>
  );
};
