import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Lock, Mail, Phone, User, Landmark, ShieldCheck } from 'lucide-react';

export const Auth = () => {
  const { setToken, API_URL, t } = useApp();
  const navigate = useNavigate();

  // Mode state: 'login' | 'register' | 'forgot' | 'otp'
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+91');

  // OTP Verification States
  const [otpStep, setOtpStep] = useState(1); // 1 = input phone, 2 = input OTP
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [tempRegisterUser, setTempRegisterUser] = useState(null);



  // OTP Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Standard Login handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        navigate('/');
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Failed to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Standard Register handler - sends verification OTP
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !phone || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setTempRegisterUser(data.tempUser);
        setMode('otp-register');
        setOtpCode('');
        setMessage(data.message || 'Verification code sent to your email.');
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      setError('Auth server unreachable.');
    } finally {
      setLoading(false);
    }
  };

  // Verify Registration OTP handler
  const handleRegisterVerify = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 4) {
      setError('Please enter a valid 4-digit OTP code.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/auth/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempUser: tempRegisterUser, otp: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        navigate('/');
      } else {
        setError(data.message || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setError('Verification connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password handler
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset instructions and verification code sent to your email.');
        // Set mode to reset password
        setMode('reset');
        setOtpCode('');
      } else {
        setError(data.message || 'Error executing password recovery.');
      }
    } catch (e) {
      setError('Reset request connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email || !otpCode || !password) {
      setError('All fields are required.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset successful. Please login with your new password.');
        setMode('login');
        setPassword('');
        setEmail('');
      } else {
        setError(data.message || 'Invalid or expired reset code.');
      }
    } catch (e) {
      setError('Password reset submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-container slide-in">
        <div className="auth-brand">
          <Landmark size={36} color="#81c784" />
          <h2>AgroAssist AI</h2>
          <p>Smart Farming. Better Tomorrow.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="input-group">
              <label className="input-label"><Mail size={16} /> Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="farmer@agroassist.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <label className="input-label"><Lock size={16} /> Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-pwd-link">
              <span onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}>Forgot Password?</span>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Authenticating...' : 'Login'}
            </button>


            <p className="auth-footer-text">
              Don't have an account?{' '}
              <span onClick={() => { setMode('register'); setError(''); setMessage(''); }}>Create Account</span>
            </p>
          </form>
        )}

        {/* 2. REGISTER MODE */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div className="input-group">
              <label className="input-label"><User size={16} /> Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ramesh Patil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label"><Mail size={16} /> Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="ramesh@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label"><Phone size={16} /> Phone Number</label>
              <input
                type="tel"
                className="input-field"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label"><Lock size={16} /> Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label"><Lock size={16} /> Confirm Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="auth-footer-text">
              Already have an account?{' '}
              <span onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Login</span>
            </p>
          </form>
        )}

        {/* 3. EMAIL OTP REGISTER VERIFICATION MODE */}
        {mode === 'otp-register' && (
          <div>
            <form onSubmit={handleRegisterVerify}>
              <div className="input-group">
                <label className="input-label"><ShieldCheck size={16} /> Enter Verification Code</label>
                <input
                  type="text"
                  className="input-field text-center letter-spacing-lg"
                  maxLength="4"
                  placeholder="1 2 3 4"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-block">
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-outline btn-block mt-3"
              onClick={() => { setMode('register'); setError(''); setMessage(''); }}
            >
              Back to Registration
            </button>
          </div>
        )}

        {/* 4. FORGOT PASSWORD MODE */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div className="input-group">
              <label className="input-label"><Mail size={16} /> Registered Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="farmer@agroassist.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Requesting...' : 'Send Recovery Code'}
            </button>

            <button
              type="button"
              className="btn btn-outline btn-block mt-3"
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            >
              Back to Login
            </button>
          </form>
        )}

        {/* 5. RESET PASSWORD MODE (FOLLOWS FORGOT CODE) */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="input-group">
              <label className="input-label"><ShieldCheck size={16} /> 4-digit Reset Code</label>
              <input
                type="text"
                className="input-field text-center"
                maxLength="4"
                placeholder="1 2 3 4"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label"><Lock size={16} /> New Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Resetting...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .auth-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .auth-container {
          width: 100%;
          max-width: 450px;
          padding: 40px;
        }
        .auth-brand {
          text-align: center;
          margin-bottom: 30px;
        }
        .auth-brand h2 {
          font-size: 26px;
          margin-top: 10px;
          margin-bottom: 5px;
        }
        .auth-brand p {
          color: var(--text-secondary);
          font-size: 14px;
        }
        .password-wrapper {
          position: relative;
        }
        .pw-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .pw-toggle:hover {
          color: var(--text-primary);
        }
        .forgot-pwd-link {
          text-align: right;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .forgot-pwd-link span {
          color: var(--secondary-color);
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .forgot-pwd-link span:hover {
          color: var(--secondary-hover);
          text-decoration: underline;
        }
        .btn-block {
          width: 100%;
        }
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 20px 0;
          color: var(--text-secondary);
          font-size: 12px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }
        .divider:not(:empty)::before {
          margin-right: .5em;
        }
        .divider:not(:empty)::after {
          margin-left: .5em;
        }
        .google-btn {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .phone-input-wrapper {
          display: flex;
          gap: 10px;
        }
        .country-select {
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          color: var(--text-primary);
          font-family: var(--font-family);
          font-size: 14px;
        }
        .letter-spacing-lg {
          letter-spacing: 6px;
          font-size: 20px;
          font-weight: 700;
        }
        .text-center {
          text-align: center;
        }
        .otp-resend-section {
          text-align: center;
          margin-top: 15px;
          font-size: 14px;
        }
        .countdown-text {
          color: var(--text-secondary);
        }
        .btn-link {
          background: transparent;
          border: none;
          color: var(--secondary-color);
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-family);
        }
        .btn-link:hover {
          text-decoration: underline;
        }
        .auth-footer-text {
          text-align: center;
          margin-top: 25px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .auth-footer-text span {
          color: var(--primary-color);
          font-weight: 600;
          cursor: pointer;
        }
        .auth-footer-text span:hover {
          text-decoration: underline;
          color: var(--primary-hover);
        }
        .alert {
          padding: 12px 16px;
          border-radius: var(--border-radius-sm);
          font-size: 14px;
          margin-bottom: 20px;
          font-weight: 500;
        }
        .alert-error {
          background: rgba(211, 47, 47, 0.15);
          border: 1px solid var(--danger-color);
          color: #ff8a80;
        }
        .alert-success {
          background: rgba(56, 142, 60, 0.15);
          border: 1px solid var(--success-color);
          color: #a5d6a7;
        }
        .mt-3 { margin-top: 12px; }
      `}</style>
    </div>
  );
};
