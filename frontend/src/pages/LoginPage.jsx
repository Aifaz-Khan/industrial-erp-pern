import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/inventory');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDemoCredentials = (role) => {
    setError('');
    if (role === 'ADMIN') {
      setEmail('admin@industrial-erp.com');
      setPassword('AdminPassword123!');
    } else {
      setEmail('sales@industrial-erp.com');
      setPassword('SalesPassword123!');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon-box">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
            Industrial ERP Portal
          </h2>
          <p className="text-sm text-muted" style={{ marginTop: '0.2rem' }}>
            Manufacturing Supply Chain & Inventory System
          </p>
        </div>

        {error && (
          <div className="alert-box flex items-center gap-2">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="form-group">
            <label className="form-label">
              Corporate Email
            </label>
            <div className="input-icon-wrapper">
              <Mail className="input-icon" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@industrial-erp.com"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Password
            </label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="form-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full"
            style={{ padding: '0.6rem 1rem', marginTop: '0.5rem' }}
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Quick Demo Pre-fill Buttons */}
        <div className="demo-credentials-box">
          <span className="text-xs font-semibold text-muted text-center" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            Recruiter Quick Access Credentials
          </span>
          <div className="demo-btn-grid">
            <button
              type="button"
              onClick={() => setDemoCredentials('ADMIN')}
              className="demo-btn"
            >
              <span className="font-semibold text-xs" style={{ color: 'var(--text-main)', display: 'block' }}>ADMIN Role</span>
              <span className="text-xs text-muted">Full stock & dispatch</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('SALES')}
              className="demo-btn"
            >
              <span className="font-semibold text-xs" style={{ color: 'var(--text-main)', display: 'block' }}>SALES Role</span>
              <span className="text-xs text-muted">Quotes & orders</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
