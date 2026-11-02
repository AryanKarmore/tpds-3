import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';

export default function OfficerQueue() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [wards, setWards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [wardFilter, setWardFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [wRes, cRes] = await Promise.all([
          api.get('/wards'),
          api.get('/categories')
        ]);
        setWards(wRes.data.wards || []);
        setCategories(cRes.data.categories || []);
      } catch (e) {
        console.error(e);
      }
    }
    fetchMetadata();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (wardFilter) params.append('ward_id', wardFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (overdueOnly) params.append('overdue_only', 'true');

      const res = await api.get(`/complaints?${params.toString()}`);
      setComplaints(res.data.complaints || []);
    } catch (err) {
      setError('Failed to load complaint priority queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [wardFilter, categoryFilter, statusFilter, overdueOnly]);

  return (
    <div style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
            Officer Priority Queue
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Ranked by Priority Score = Severity + Age + Affected Citizens. Only parent complaints count.
          </p>
        </div>

        <button
          onClick={loadQueue}
          style={{
            padding: '8px 14px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Queue
        </button>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: '14px 18px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Ward Filter (if Head Officer) */}
        {user?.is_head ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Ward:</label>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">All Wards (Nagpur)</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600', paddingRight: '8px', borderRight: '1px solid #e2e8f0' }}>
            🔒 Locked to: {user?.ward_name || `Ward ${user?.ward_id}`}
          </div>
        )}

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Confirmation">Pending Confirmation</option>
            <option value="Reopened">Reopened</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Overdue Only Filter */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#b91c1c' }}>
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          ⚠️ Overdue Only
        </label>

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b' }}>
          <strong>{complaints.length}</strong> issues in queue
        </div>
      </div>

      {loading ? (
        <Loader message="Fetching priority sorted complaints..." />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="Queue is clear!"
          message="No complaints matching the selected filters in this ward."
        />
      ) : (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 14px' }}>Priority</th>
                <th style={{ padding: '12px 14px' }}>ID</th>
                <th style={{ padding: '12px 14px' }}>Category</th>
                <th style={{ padding: '12px 14px' }}>Locality</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Affected</th>
                <th style={{ padding: '12px 14px' }}>Age</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: c.is_overdue ? '#fffbeb' : 'transparent'
                  }}
                >
                  <td style={{ padding: '12px 14px', fontWeight: '800', color: '#2563eb' }}>
                    <div style={{
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      fontSize: '13px'
                    }}>
                      ⚡ {c.priority_score}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: '700', color: '#64748b' }}>
                    #{c.id}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b' }}>
                    {c.category_name}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#334155' }}>
                    {c.locality}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: c.affected_count > 1 ? '#2563eb' : '#64748b' }}>
                    👥 {c.affected_count}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    {c.age_in_days}d
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <StatusBadge status={c.status} isOverdue={c.is_overdue} size="small" />
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <Link
                      to={`/officer/complaints/${c.id}`}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '12px'
                      }}
                    >
                      Update →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
