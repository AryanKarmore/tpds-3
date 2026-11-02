import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import ErrorBanner from '../../components/ErrorBanner';

export default function OfficerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/officer/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/officer/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillWardOfficer = () => {
    setEmail('officer1@civictrack.test');
    setPassword('Officer@123');
  };

  const fillHeadOfficer = () => {
    setEmail('head.officer@civictrack.test');
    setPassword('Officer@123');
  };

  return (
    <div style={{ maxWidth: '440px', margin: '60px auto', padding: '0 20px' }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 16px rgba(15,23,42,0.08)'
      }}>
        {/* Officer Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>👮‍♂️</div>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            padding: '3px 8px',
            borderRadius: '4px'
          }}>
            Nagpur Municipal Corporation
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '8px 0 4px' }}>
            Ward Officer Portal
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Restricted access for designated ward maintenance officers
          </p>
        </div>

        <ErrorBanner error={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Official Officer Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer1@civictrack.test"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '4px'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Officer Portal'}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7', fontSize: '12px', color: '#92400e' }}>
          ⚠️ <strong>Security Policy:</strong> Officer accounts are administrative and cannot be self-registered. New accounts are provisioned exclusively by system administrators.
        </div>

        {/* Demo Logins */}
        <div style={{
          marginTop: '20px',
          padding: '14px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px dashed #cbd5e1'
        }}>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Demo Quick-Fill Credentials:
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={fillWardOfficer}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Ward 1 Officer
            </button>
            <button
              type="button"
              onClick={fillHeadOfficer}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Head Officer (All)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

