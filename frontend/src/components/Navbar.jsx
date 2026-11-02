import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    const isOfficer = user && user.role === 'officer';
    logout();
    navigate(isOfficer ? '/officer/login' : '/login');
  };

  const isOfficerPortal = user?.role === 'officer' || location.pathname.startsWith('/officer');

  return (
    <header style={{
      backgroundColor: isOfficerPortal ? '#1e293b' : '#0f172a',
      color: '#ffffff',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <Link to="/" style={{ textDecoration: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🏛️</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>
              CivicTrack <span style={{ color: '#38bdf8' }}>Nagpur</span>
            </div>
            {isOfficerPortal && (
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                Ward Officer Portal {user?.is_head ? '(Head Officer)' : user?.ward_name ? `• ${user.ward_name}` : ''}
              </div>
            )}
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/map"
            style={{
              color: location.pathname === '/map' ? '#38bdf8' : '#e2e8f0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Public Map
          </Link>

          {user ? (
            <>
              {user.role === 'citizen' && (
                <>
                  <Link
                    to="/citizen/dashboard"
                    style={{
                      color: location.pathname === '/citizen/dashboard' ? '#38bdf8' : '#e2e8f0',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/citizen/new"
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: '600',
                      padding: '6px 12px',
                      borderRadius: '6px'
                    }}
                  >
                    + File Complaint
                  </Link>
                  <Link
                    to="/citizen/complaints"
                    style={{
                      color: location.pathname === '/citizen/complaints' ? '#38bdf8' : '#e2e8f0',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    My Complaints
                  </Link>
                </>
              )}

              {user.role === 'officer' && (
                <>
                  <Link
                    to="/officer/dashboard"
                    style={{
                      color: location.pathname === '/officer/dashboard' ? '#38bdf8' : '#e2e8f0',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/officer/queue"
                    style={{
                      color: location.pathname === '/officer/queue' ? '#38bdf8' : '#e2e8f0',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Priority Queue
                  </Link>
                  <Link
                    to="/officer/map"
                    style={{
                      color: location.pathname === '/officer/map' ? '#38bdf8' : '#e2e8f0',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Ward Map
                  </Link>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {user.name.split(' ')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#f87171',
                    border: '1px solid #ef4444',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                to="/login"
                style={{
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                Citizen Login
              </Link>
              <Link
                to="/officer/login"
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '6px 12px',
                  borderRadius: '6px'
                }}
              >
                Officer Portal
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
