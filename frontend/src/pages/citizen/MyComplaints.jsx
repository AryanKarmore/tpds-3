import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import ComplaintCard from '../../components/ComplaintCard';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComplaints = async (status = '') => {
    try {
      setLoading(true);
      const url = status ? `/complaints/mine?status=${encodeURIComponent(status)}` : '/complaints/mine';
      const res = await api.get(url);
      setComplaints(res.data.complaints || []);
    } catch (err) {
      setError('Failed to fetch your complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints(statusFilter);
  }, [statusFilter]);

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
            My Civic Complaints
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Track progress and verify completed field repairs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Confirmation">Pending Confirmation</option>
            <option value="Closed">Closed (Verified)</option>
            <option value="Reopened">Reopened</option>
          </select>

          <Link
            to="/citizen/new"
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            + File New
          </Link>
        </div>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {loading ? (
        <Loader message="Loading your complaints..." />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No complaints found"
          message={statusFilter ? `No complaints match the filter '${statusFilter}'.` : "You haven't filed any complaints yet."}
          action={
            <Link
              to="/citizen/new"
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              File a Complaint
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {complaints.map((c) => (
            <ComplaintCard key={c.id} complaint={c} linkPrefix="/citizen/complaints" />
          ))}
        </div>
      )}
    </div>
  );
}

