import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Trash2, Plus, Minus, CreditCard, ShoppingBag, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const CartView = () => {
  const { cart, updateCartQuantity, removeFromCart, clearCart, token, API_URL, t } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkoutWarning, setCheckoutWarning] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState('');

  const calculateSubtotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((acc, curr) => acc + (curr.productId?.price || 0) * curr.quantity, 0);
  };

  const handleQuantityChange = (productId, currentQty, increment) => {
    const newQty = currentQty + increment;
    if (newQty < 1) return;
    updateCartQuantity(productId, newQty);
  };

  const handleCheckout = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setCheckoutWarning('');
      setCheckoutSuccess('');
      const res = await fetch(`${API_URL}/products/checkout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setCheckoutSuccess(data.message);
        clearCart();
        setTimeout(() => {
          setCheckoutSuccess('');
          navigate('/products');
        }, 3000);
      } else if (data.paymentConfigRequired) {
        setCheckoutWarning(data.message);
      } else {
        setCheckoutWarning(data.message || 'Checkout failed.');
      }
    } catch (e) {
      console.error('Checkout error:', e);
      setCheckoutWarning('Checkout request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-wrapper slide-in">
      <header className="cart-header mb-4">
        <h1>{t('cart')}</h1>
        <p className="subtitle">Manage items in your shopping cart and complete purchase order.</p>
      </header>

      {checkoutSuccess && (
        <section className="alert alert-success checkout-alert-box mb-4">
          <CheckCircle2 size={28} className="alert-icon" aria-label="success-icon" />
          <div>
            <strong>Order Placed!</strong>
            <p>{checkoutSuccess}</p>
          </div>
        </section>
      )}

      {checkoutWarning && (
        <section className="alert alert-warning checkout-alert-box mb-4">
          <ShieldAlert size={28} className="alert-icon" />
          <div>
            <strong>Payment Setup Required:</strong>
            <p>{checkoutWarning}</p>
          </div>
        </section>
      )}


      {cart?.items?.length > 0 ? (
        <div className="cart-layout-grid">
          {/* Cart Items List */}
          <div className="cart-items-section glass-card">
            <div className="cart-list-header">
              <h2>Itemized Details</h2>
              <button onClick={clearCart} className="btn-clear-all">
                <Trash2 size={16} /> {t('clearCart')}
              </button>
            </div>

            <div className="cart-items-list mt-3">
              {cart.items.map((item) => {
                const prod = item.productId;
                if (!prod) return null;

                return (
                  <div key={item._id} className="cart-item-row">
                    <div className="cart-item-info">
                      {prod.image ? (
                        <img src={prod.image} alt={prod.name} className="cart-item-img" />
                      ) : (
                        <div className="cart-item-img-fallback">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      <div>
                        <h4>{prod.name}</h4>
                        <span className="cart-item-store">Seller: {prod.store}</span>
                      </div>
                    </div>

                    <div className="cart-item-pricing-controls">
                      <div className="qty-control">
                        <button 
                          onClick={() => handleQuantityChange(prod._id, item.quantity, -1)}
                          className="qty-btn"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="qty-val">{item.quantity}</span>
                        <button 
                          onClick={() => handleQuantityChange(prod._id, item.quantity, 1)}
                          className="qty-btn"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <span className="cart-item-subtotal">
                        ₹{(prod.price * item.quantity).toFixed(2)}
                      </span>

                      <button onClick={() => removeFromCart(prod._id)} className="btn-remove-item">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Summary Side Card */}
          <div className="cart-summary-section glass-card">
            <h2>Order Summary</h2>
            <div className="summary-details mt-3">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Estimated Delivery</span>
                <span className="text-free">FREE</span>
              </div>
              <div className="divider"></div>
              <div className="summary-row total-row">
                <span>{t('cartTotal')}</span>
                <span>₹{calculateSubtotal().toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn btn-primary btn-block mt-4"
            >
              <CreditCard size={18} /> {loading ? 'Initializing Checkout...' : t('checkout')}
            </button>

            <button
              onClick={() => navigate('/products')}
              className="btn btn-outline btn-block mt-2"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card empty-results">
          <ShoppingBag size={48} color="rgba(144, 165, 149, 0.2)" />
          <p>{t('emptyCart')}</p>
          <button onClick={() => navigate('/products')} className="btn btn-secondary mt-3">
            {t('viewProducts')}
          </button>
        </div>
      )}

      <style>{`
        .cart-layout-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          align-items: flex-start;
        }
        .cart-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 14px;
        }
        .btn-clear-all {
          background: transparent;
          border: none;
          color: #e57373;
          font-family: var(--font-family);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-clear-all:hover {
          color: #ff8a80;
          text-decoration: underline;
        }
        
        /* Cart Items */
        .cart-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          gap: 16px;
        }
        .cart-item-row:last-child {
          border-bottom: none;
        }
        .cart-item-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .cart-item-img {
          width: 50px;
          height: 50px;
          border-radius: var(--border-radius-sm);
          object-fit: cover;
          border: 1px solid var(--border-color);
        }
        .cart-item-img-fallback {
          width: 50px;
          height: 50px;
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-color);
          background: rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cart-item-info h4 {
          font-size: 15px;
          color: #fff;
          margin-bottom: 2px;
        }
        .cart-item-store {
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .cart-item-pricing-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .qty-control {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          overflow: hidden;
        }
        .qty-btn {
          border: none;
          background: transparent;
          color: var(--text-primary);
          padding: 8px 10px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .qty-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
        }
        .qty-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .qty-val {
          padding: 0 10px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
        }
        .cart-item-subtotal {
          font-size: 15px;
          font-weight: 700;
          color: var(--secondary-color);
          width: 80px;
          text-align: right;
        }
        .btn-remove-item {
          background: transparent;
          border: none;
          color: #e57373;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          transition: var(--transition-smooth);
        }
        .btn-remove-item:hover {
          background: rgba(211, 47, 47, 0.1);
        }
        
        /* Summary details */
        .summary-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .text-free {
          color: #81c784;
          font-weight: 700;
        }
        .total-row {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
        }
        
        .checkout-alert-box {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        
        @media (max-width: 1024px) {
          .cart-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .cart-item-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .cart-item-pricing-controls {
            width: 100%;
            justify-content: space-between;
            margin-top: 10px;
          }
        }
      `}</style>
    </div>
  );
};
