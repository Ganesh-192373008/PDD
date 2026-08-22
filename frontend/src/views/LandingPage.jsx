import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sprout, 
  CloudSun, 
  LineChart, 
  Droplet, 
  ArrowRight, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight 
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitStatus(null), 5000); // Clear after 5 seconds
    }, 1200);
  };

  return (
    <div className="landing-layout">
      {/* 1. HEADER / NAVIGATION */}
      <header className="landing-header">
        <div className="header-container">
          <div className="brand-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="logo-icon">
              <Sprout size={24} className="icon-green" />
            </div>
            <span className="brand-text">AgroAssist <span className="text-highlight">AI</span></span>
          </div>

          <nav className="header-nav">
            <a href="#features" className="nav-link">Features</a>
            <a href="#stats" className="nav-link">Platform Scale</a>
            <a href="#contact" className="nav-link">Contact Support</a>
          </nav>

          <button className="cta-button" onClick={() => navigate('/login')}>
            <span>Launch Portal</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-bg-overlay"></div>
        <div className="hero-container">
          <div className="hero-content">
            <div className="badge-wrapper">
              <span className="badge">
                <Sparkles size={12} className="icon-gold" />
                <span>Next-Gen Smart Farming Platform</span>
              </span>
            </div>
            <h1 className="hero-title">
              Empowering Agriculture With <br />
              <span className="text-gradient">Artificial Intelligence</span>
            </h1>
            <p className="hero-description">
              AgroAssist brings advanced machine learning and real-time data analysis to your fields. 
              Diagnose crop diseases, optimize water resources, track market trends, and get smart 
              advisories in your local language.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate('/login')}>
                <span>Get Started Now</span>
                <ArrowRight size={18} />
              </button>
              <a href="#features" className="btn btn-outline">
                Explore Features
              </a>
            </div>
          </div>

          {/* Interactive Hero Illustration Card */}
          <div className="hero-visual">
            <div className="visual-card">
              <div className="card-header">
                <div className="indicator-live"></div>
                <span>Live Agro-Advisory Engine</span>
              </div>
              <div className="diagnostics-log">
                <div className="diag-item">
                  <div className="diag-icon diag-icon-yellow"><CloudSun size={18} /></div>
                  <div className="diag-details">
                    <span className="diag-title">Irrigation Scheduled</span>
                    <span className="diag-meta">Mettur Inflow high. Triggering water schedule.</span>
                  </div>
                </div>
                <div className="diag-item">
                  <div className="diag-icon diag-icon-green"><Sprout size={18} /></div>
                  <div className="diag-details">
                    <span className="diag-title">Tomato Leaf Spot</span>
                    <span className="diag-meta">Mealybug threat active. Severity: 89% (High)</span>
                  </div>
                </div>
                <div className="diag-item">
                  <div className="diag-icon diag-icon-blue"><LineChart size={18} /></div>
                  <div className="diag-details">
                    <span className="diag-title">Market Arbitrage</span>
                    <span className="diag-meta">APMC price rose to ₹18.50/kg in Gultekdi.</span>
                  </div>
                </div>
              </div>
              <div className="visual-card-footer">
                <span>Current Precision Level: 97.4%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURES GRID SECTION */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Revolutionizing the Way You Farm</h2>
          <p className="section-subtitle">A suite of intelligent crop diagnosis and resource optimization tools tailored for modern farmers.</p>
        </div>

        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Sprout size={28} className="icon-green" />
            </div>
            <h3>AI Disease Diagnostics</h3>
            <p>Upload a leaf photo to instantly identify crop diseases, receive detailed organic treatment advisories, and track local outbreaks.</p>
          </div>

          {/* Card 2 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <CloudSun size={28} className="icon-gold" />
            </div>
            <h3>Agri Weather Advisories</h3>
            <p>Get localized alerts on cyclones, severe winds, and rainfall, alongside customized schedule recommendations to secure your harvest.</p>
          </div>

          {/* Card 3 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <LineChart size={28} className="icon-blue" />
            </div>
            <h3>Real-time APMC Rates</h3>
            <p>Track wholesale crop price changes and market trends across local APMCs to harvest and sell at optimal market conditions.</p>
          </div>

          {/* Card 4 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Droplet size={28} className="icon-cyan" />
            </div>
            <h3>Smart Irrigation & Soil Metrics</h3>
            <p>Analyze N-P-K nutrient levels, moisture content, and dam outflows to generate optimized water management plans.</p>
          </div>
        </div>
      </section>

      {/* 4. STATISTICS SECTION */}
      <section id="stats" className="stats-section">
        <div className="stats-container">
          <div className="stat-box">
            <span className="stat-number">10k+</span>
            <span className="stat-label">Farmers Empowered</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">95.8%</span>
            <span className="stat-label">AI Diagnosis Precision</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">50+</span>
            <span className="stat-label">Crop Types Supported</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">4</span>
            <span className="stat-label">Local Languages Supported</span>
          </div>
        </div>
      </section>

      {/* 5. CONTACT US SECTION */}
      <section id="contact" className="contact-section">
        <div className="contact-container">
          <div className="contact-info">
            <h2 className="section-title text-left">Get in Touch with Our Experts</h2>
            <p className="contact-text">
              Have questions about platform integration, customized crop templates, or technical issues? Our agro-advisory support team is available 24/7.
            </p>
            <div className="info-items">
              <div className="info-item">
                <Mail className="info-icon" size={20} />
                <span>support@agroassist.com</span>
              </div>
              <div className="info-item">
                <Phone className="info-icon" size={20} />
                <span>+91 (020) 2445-6677</span>
              </div>
              <div className="info-item">
                <MapPin className="info-icon" size={20} />
                <span>Smart Agriculture Hub, Pune, MH, India</span>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper">
            <h3 className="form-title">Send a Support Message</h3>
            <form onSubmit={handleContactSubmit} className="contact-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  className="form-input" 
                  placeholder="Your Name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  className="form-input" 
                  placeholder="farmer@example.com" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Inquiry</label>
                <textarea 
                  name="message" 
                  className="form-input textarea-input" 
                  placeholder="Describe your issue or questions..." 
                  value={formData.message} 
                  onChange={handleInputChange} 
                  required
                ></textarea>
              </div>

              {submitStatus === 'success' && (
                <div className="form-alert success-alert">
                  <CheckCircle2 size={16} />
                  <span>Message sent successfully! Our advisors will reach out shortly.</span>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-block">
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="logo-icon">
              <Sprout size={20} className="icon-green" />
            </div>
            <span className="brand-text">AgroAssist</span>
          </div>
          <p className="footer-disclaimer">
            © {new Date().getFullYear()} AgroAssist AI Platforms. Designed to support sustainable, high-precision smart farming ecosystems.
          </p>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#stats">Scale</a>
            <a href="#contact">Support</a>
            <span className="footer-link-divider">|</span>
            <span className="footer-link-highlight" onClick={() => navigate('/login')}>Login</span>
          </div>
        </div>
      </footer>

      {/* 7. CUSTOM CSS (Scoped/Embedded styling for beautiful premium aesthetics) */}
      <style>{`
        /* Global variables mapping & dark layout settings */
        .landing-layout {
          --bg-base: #030806;
          --bg-surface: rgba(16, 29, 24, 0.45);
          --border-color: rgba(255, 255, 255, 0.08);
          --primary-emerald: #10B981;
          --primary-gold: #F59E0B;
          --text-main: #E2E8F0;
          --text-muted: #94A3B8;
          
          background-color: var(--bg-base);
          color: var(--text-main);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          scroll-behavior: smooth;
        }

        /* Color configurations */
        .icon-green { color: var(--primary-emerald); }
        .icon-gold { color: var(--primary-gold); }
        .icon-blue { color: #3B82F6; }
        .icon-cyan { color: #06B6D4; }
        .text-highlight { color: var(--primary-emerald); }
        .text-gradient {
          background: linear-gradient(135deg, var(--primary-emerald) 0%, #34D399 50%, var(--primary-gold) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Container Layouts */
        .landing-header, .hero-section, .features-section, .stats-section, .contact-section, .landing-footer {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        /* 1. Header Navigation Styling */
        .landing-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3, 8, 6, 0.75);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          height: 70px;
        }
        .header-container {
          width: 100%;
          max-width: 1200px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .brand-text {
          font-weight: 700;
          font-size: 20px;
          letter-spacing: -0.5px;
        }
        .header-nav {
          display: flex;
          gap: 30px;
        }
        .nav-link {
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .nav-link:hover {
          color: var(--text-main);
        }
        .cta-button {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--primary-emerald);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .cta-button:hover {
          background: var(--primary-emerald);
          color: #030806;
          border-color: var(--primary-emerald);
        }

        /* 2. Hero Section */
        .hero-section {
          position: relative;
          padding: 100px 24px;
          min-height: 85vh;
          align-items: center;
        }
        .hero-bg-overlay {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 1400px;
          height: 100%;
          background: radial-gradient(circle at 75% 30%, rgba(16, 185, 129, 0.08) 0%, rgba(3, 8, 6, 0) 60%),
                      radial-gradient(circle at 25% 70%, rgba(245, 158, 11, 0.04) 0%, rgba(3, 8, 6, 0) 50%);
          pointer-events: none;
          z-index: 1;
        }
        .hero-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1200px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 60px;
          align-items: center;
        }
        .badge-wrapper {
          margin-bottom: 20px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 158, 11, 0.06);
          border: 1px solid rgba(245, 158, 11, 0.2);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: var(--primary-gold);
        }
        .hero-title {
          font-size: 48px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -1.5px;
          margin-bottom: 24px;
        }
        .hero-description {
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 36px;
          max-width: 540px;
        }
        .hero-actions {
          display: flex;
          gap: 16px;
        }

        /* General Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .btn-primary {
          background: var(--primary-emerald);
          color: #030806;
          border: none;
        }
        .btn-primary:hover {
          background: #34D399;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);
        }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-main);
        }
        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--text-muted);
          transform: translateY(-2px);
        }
        .btn-block {
          width: 100%;
        }

        /* Hero Visual Card Panel */
        .hero-visual {
          display: flex;
          justify-content: center;
        }
        .visual-card {
          width: 100%;
          max-width: 400px;
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .indicator-live {
          width: 8px;
          height: 8px;
          background: var(--primary-emerald);
          border-radius: 50%;
          animation: pulse 1.8s infinite;
        }
        .diagnostics-log {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        .diag-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .diag-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
        }
        .diag-icon-yellow { background: rgba(245, 158, 11, 0.1); color: var(--primary-gold); }
        .diag-icon-green { background: rgba(16, 185, 129, 0.1); color: var(--primary-emerald); }
        .diag-icon-blue { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
        .diag-details {
          display: flex;
          flex-direction: column;
        }
        .diag-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 2px;
        }
        .diag-meta {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .visual-card-footer {
          font-size: 11px;
          font-weight: 600;
          color: var(--primary-emerald);
          background: rgba(16, 185, 129, 0.06);
          padding: 8px 12px;
          border-radius: 6px;
          text-align: center;
        }

        /* 3. Features Section */
        .features-section {
          flex-direction: column;
          align-items: center;
          padding: 100px 24px;
          background: rgba(5, 15, 10, 0.4);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
        }
        .section-header {
          text-align: center;
          margin-bottom: 60px;
          max-width: 600px;
        }
        .section-title {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.8px;
          margin-bottom: 16px;
        }
        .text-left {
          text-align: left;
        }
        .section-subtitle {
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.5;
        }
        .features-grid {
          width: 100%;
          max-width: 1200px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 30px;
        }
        .feature-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          padding: 32px;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.05);
        }
        .feature-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          margin-bottom: 24px;
        }
        .feature-card h3 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .feature-card p {
          color: var(--text-muted);
          font-size: 13.5px;
          line-height: 1.6;
        }

        /* 4. Stats Section */
        .stats-section {
          padding: 80px 24px;
          border-bottom: 1px solid var(--border-color);
        }
        .stats-container {
          width: 100%;
          max-width: 1200px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 30px;
        }
        .stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .stat-number {
          font-size: 44px;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 6px;
          background: linear-gradient(135deg, #FFF 0%, var(--primary-emerald) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .stat-label {
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
        }

        /* 5. Contact Section */
        .contact-section {
          padding: 100px 24px;
        }
        .contact-container {
          width: 100%;
          max-width: 1200px;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 80px;
          align-items: center;
        }
        .contact-text {
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.6;
          margin-top: 16px;
          margin-bottom: 32px;
        }
        .info-items {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .info-item {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 14.5px;
        }
        .info-icon {
          color: var(--primary-emerald);
        }
        .contact-form-wrapper {
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          padding: 40px;
        }
        .form-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 24px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-main);
          font-family: inherit;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--primary-emerald);
        }
        .textarea-input {
          min-height: 100px;
          resize: vertical;
        }
        .form-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
        }
        .success-alert {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid var(--primary-emerald);
          color: #A7F3D0;
        }

        /* 6. Footer Section */
        .landing-footer {
          background: #020604;
          padding: 40px 24px;
          border-top: 1px solid var(--border-color);
        }
        .footer-container {
          width: 100%;
          max-width: 1200px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--text-muted);
          font-size: 13px;
        }
        .footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-main);
          font-weight: 700;
        }
        .footer-disclaimer {
          max-width: 480px;
          line-height: 1.5;
          text-align: center;
        }
        .footer-links {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .footer-links a {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .footer-links a:hover {
          color: var(--text-main);
        }
        .footer-link-divider {
          color: rgba(255, 255, 255, 0.15);
        }
        .footer-link-highlight {
          color: var(--primary-emerald);
          font-weight: 600;
          cursor: pointer;
        }
        .footer-link-highlight:hover {
          text-decoration: underline;
        }

        /* Keyframes Animations */
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        /* Responsiveness settings */
        @media (max-width: 900px) {
          .hero-container {
            grid-template-columns: 1fr;
            gap: 40px;
            text-align: center;
          }
          .hero-description {
            margin-left: auto;
            margin-right: auto;
          }
          .hero-actions {
            justify-content: center;
          }
          .contact-container {
            grid-template-columns: 1fr;
            gap: 50px;
          }
          .stats-container {
            grid-template-columns: repeat(2, 1fr);
          }
          .footer-container {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};
