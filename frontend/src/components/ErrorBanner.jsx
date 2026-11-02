import React from 'react';

export default function ErrorBanner({ error, onClose }) {
  if (!error) return null;

  return (
    <div style={{
      backgroundColor: '#fef2f2',
      borderLeft: '4px solid #ef4444',
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ color: '#991b1b', fontSize: '14px', fontWeight: '500' }}>
        ⚠️ {typeof error === 'string' ? error : (error.error || error.message || 'An error occurred')}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#991b1b',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px 6px'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
