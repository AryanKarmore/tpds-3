import React from 'react';
import { STATUS_COLORS, STATUS_BG_COLORS, STATUS_LABELS } from '../utils/constants';

export default function StatusBadge({ status, isOverdue = false, size = 'normal' }) {
  const color = STATUS_COLORS[status] || '#64748b';
  const bgColor = STATUS_BG_COLORS[status] || '#f1f5f9';
  const label = STATUS_LABELS[status] || status;

  const isSmall = size === 'small';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: '600',
        backgroundColor: bgColor,
        color: color,
        border: `1px solid ${color}40`,
        whiteSpace: 'nowrap'
      }}>
        <span style={{
          width: isSmall ? '6px' : '7px',
          height: isSmall ? '6px' : '7px',
          borderRadius: '50%',
          backgroundColor: color,
          marginRight: '6px'
        }} />
        {label}
      </span>

      {Boolean(isOverdue) && (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: isSmall ? '2px 6px' : '3px 8px',
          borderRadius: '9999px',
          fontSize: isSmall ? '10px' : '11px',
          fontWeight: '700',
          backgroundColor: '#b91c1c',
          color: '#ffffff',
          whiteSpace: 'nowrap',
          letterSpacing: '0.5px'
        }}>
          OVERDUE
        </span>
      )}
    </div>
  );
}

