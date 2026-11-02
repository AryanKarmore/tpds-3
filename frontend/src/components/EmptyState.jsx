import React from 'react';

export default function EmptyState({ icon = '📭', title = 'No records found', message = 'There are no items matching your criteria.', action }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px dashed #cbd5e1',
      margin: '20px 0'
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>{title}</h3>
      <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '420px', margin: '0 auto 16px' }}>{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
