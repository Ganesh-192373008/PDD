import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, ShoppingCart, MapPin, Phone, Info, Tag } from 'lucide-react';

export const Store = () => {
  const { addToCart, API_URL, t } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/products/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let queryUrl = `${API_URL}/products`;
      if (selectedCategory) {
        queryUrl += `?category=${encodeURIComponent(selectedCategory)}`;
      }
      
      const res = await fetch(queryUrl);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Error loading products:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product) => {
    const res = await addToCart(product._id);
    if (res.success) {
      setMessage({ text: `Successfully added ${product.name} to cart!`, type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } else {
      setMessage({ text: res.error || 'Failed to add item.', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  return (
    <div className="store-wrapper slide-in">
      <header className="store-header mb-4">
        <h1>Agricultural Store</h1>
        <p className="subtitle">Purchase certified seeds, crop protection chemicals, micro-irrigation tools, and power equipment from local verified sellers.</p>
      </header>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} floating-alert`}>
          {message.text}
        </div>
      )}

      {/* Categories Bar */}
      <section className="glass-card categories-bar mb-4">
        <button
          onClick={() => setSelectedCategory('')}
          className={`btn btn-sm ${selectedCategory === '' ? 'btn-primary' : 'btn-outline'}`}
        >
          All Products
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Products Grid */}
      {loading ? (
        <div className="loading-state glass-card">
          <div className="spinner"></div>
          <p>Loading catalog items...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid-3">
          {products.map((product) => (
            <div key={product._id} className="glass-card product-card">
              <div className="product-image-container">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="product-image" />
                ) : (
                  <div className="product-image-fallback">
                    <ShoppingBag size={48} color="rgba(255, 255, 255, 0.1)" />
                  </div>
                )}
                <span className="product-category-tag">{product.category}</span>
              </div>

              <div className="product-info mt-3">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-desc">{product.description}</p>
                
                {/* Specs list */}
                {product.details && Object.keys(product.details).length > 0 && (
                  <div className="product-specs mt-2">
                    {Object.entries(product.details).map(([key, val]) => (
                      <span key={key} className="spec-badge">
                        <strong>{key}:</strong> {val}
                      </span>
                    ))}
                  </div>
                )}

                <div className="product-price-row mt-3">
                  <span className="product-price">₹{product.price.toFixed(2)}</span>
                  {product.availability ? (
                    <span className="badge badge-success">In Stock</span>
                  ) : (
                    <span className="badge badge-danger">Out of Stock</span>
                  )}
                </div>

                <div className="product-seller-box mt-3">
                  <p className="seller-name"><strong>Store:</strong> {product.store}</p>
                  {product.location && (
                    <p className="seller-loc">
                      <MapPin size={12} /> {product.location.address}
                    </p>
                  )}
                  {product.contact && (
                    <p className="seller-contact">
                      <Phone size={12} /> {product.contact}
                    </p>
                  )}
                </div>
              </div>

              <div className="product-actions mt-3">
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.availability}
                  className="btn btn-primary btn-block"
                >
                  <ShoppingCart size={16} /> Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card empty-results">
          <ShoppingBag size={48} color="rgba(144, 165, 149, 0.2)" />
          <p>No agricultural products found in this category.</p>
        </div>
      )}

      <style>{`
        .categories-bar {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 16px 20px;
          white-space: nowrap;
        }
        .categories-bar::-webkit-scrollbar {
          height: 4px;
        }
        
        /* Product Cards */
        .product-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
        }
        .product-image-container {
          position: relative;
          width: 100%;
          height: 180px;
          border-radius: var(--border-radius-sm);
          overflow: hidden;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: var(--transition-smooth);
        }
        .product-card:hover .product-image {
          transform: scale(1.05);
        }
        .product-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .product-category-tag {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(8, 15, 11, 0.85);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .product-name {
          font-size: 16px;
          color: #fff;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .product-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 36px;
        }
        
        /* Specs */
        .product-specs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .spec-badge {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(46, 125, 50, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-primary);
        }
        
        .product-price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .product-price {
          font-size: 22px;
          font-weight: 800;
          color: var(--secondary-color);
        }
        
        /* Seller info */
        .product-seller-box {
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(46, 125, 50, 0.1);
          border-radius: var(--border-radius-sm);
          padding: 10px;
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .seller-name {
          color: #fff;
        }
        .seller-loc, .seller-contact {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .floating-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
