import React from 'react';
import StatusBadge from './StatusBadge';

export default function StatusTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return <p style={{ color: '#64748b', fontSize: '14px' }}>No status history recorded yet.</p>;
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '24px', margin: '16px 0' }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute',
        left: '7px',
        top: '6px',
        bottom: '6px',
        width: '2px',
        backgroundColor: '#e2e8f0'
      }} />

      {history.map((item, idx) => (
        <div key={item.id || idx} style={{ position: 'relative', marginBottom: '20px' }}>
          {/* Node circle */}
          <div style={{
            position: 'absolute',
            left: '-24px',
            top: '4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: idx === history.length - 1 ? '#2563eb' : '#94a3b8',
            border: '3px solid #ffffff',
            boxShadow: '0 0 0 1px #cbd5e1'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <StatusBadge status={item.new_status} size="small" />
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {new Date(item.changed_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {item.changed_by_name && (
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                  by {item.changed_by_name} ({item.changed_by_role || 'Staff'})
                </span>
              )}
            </div>

            {item.note && (
              <div style={{
                fontSize: '13px',
                color: '#334155',
                backgroundColor: '#f8fafc',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                marginTop: '4px'
              }}>
                {item.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

