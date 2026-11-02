import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ComplaintCard({ complaint, linkPrefix = '/citizen/complaints' }) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            #{complaint.id} • {complaint.category_name}
          </span>
          <h4 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
            {complaint.locality}
          </h4>
        </div>
        <StatusBadge status={complaint.status} isOverdue={complaint.is_overdue} />
      </div>

      <p style={{
        fontSize: '13px',
        color: '#475569',
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {complaint.description}
      </p>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '8px',
        borderTop: '1px solid #f1f5f9',
        fontSize: '12px',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span>Ward: {complaint.ward_name ? complaint.ward_name.split(' - ')[1] || complaint.ward_name : `Ward ${complaint.ward_id}`}</span>
          {complaint.affected_count > 1 && (
            <span style={{ fontWeight: '600', color: '#2563eb' }}>
              👥 {complaint.affected_count} affected
            </span>
          )}
        </div>

        <Link
          to={`${linkPrefix}/${complaint.id}`}
          style={{
            color: '#2563eb',
            fontWeight: '600',
            textDecoration: 'none'
          }}
        >
          View details →
        </Link>
      </div>
    </div>
  );
}

