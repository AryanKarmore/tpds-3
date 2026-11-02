import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏛️</div>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '800',
          color: '#0f172a',
          margin: '0 0 16px',
          letterSpacing: '-0.5px'
        }}>
          CivicTrack <span style={{ color: '#2563eb' }}>Nagpur</span>
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#475569',
          maxWidth: '650px',
          margin: '0 auto 28px',
          lineHeight: '1.6'
        }}>
          <strong>Existing tools collect complaints.</strong> CivicTrack verifies that fixes actually happened through citizen confirmation and transparently ranks wards on performance.
        </p>

        {/* Two Big Portal Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '32px'
        }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 36px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '18px',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              minWidth: '220px',
              transition: 'transform 0.15s ease'
            }}
          >
            <span>🙋 I'm a Citizen</span>
            <span style={{ fontSize: '13px', fontWeight: '400', opacity: 0.9, marginTop: '4px' }}>
              Report, track & verify fixes
            </span>
          </Link>

          <Link
            to="/officer/login"
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 36px',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '18px',
              boxShadow: '0 4px 14px rgba(30,41,59,0.3)',
              minWidth: '220px',
              transition: 'transform 0.15s ease'
            }}
          >
            <span>👮 I'm a Ward Officer</span>
            <span style={{ fontSize: '13px', fontWeight: '400', opacity: 0.9, marginTop: '4px' }}>
              Priority queue & resolution portal
            </span>
          </Link>
        </div>

        {/* Public Map Link */}
        <div>
          <Link
            to="/map"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#2563eb',
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            🗺️ Explore Public Nagpur Map & Ward Rankings →
          </Link>
        </div>
      </div>

      {/* Feature Pillars */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginTop: '40px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📍</div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Nagpur Geo-Pinning & Merging
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
            Drop exact GPS pins inside the Nagpur municipal boundary. Nearby reports within 150m merge automatically into parent issues, boosting priority.
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Citizen-Confirmed Resolution
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
            Ward officers cannot unilaterally close complaints. Only the citizen who reported the problem can confirm or reject the fix.
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Transparent Ward Score & Power BI
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
            Wards are objectively scored (0 to 100) on resolution time, SLA compliance, and citizen rejection rates, powering live Power BI analytics.
          </p>
        </div>
      </div>
    </div>
  );
}

