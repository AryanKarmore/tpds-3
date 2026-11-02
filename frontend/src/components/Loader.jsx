import React from 'react';

export default function Loader({ message = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: '12px'
    }}>
      <div className="spinner"></div>
      <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{message}</p>
    </div>
  );
}
