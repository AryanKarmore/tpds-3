import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import ComplaintMap from '../../components/ComplaintMap';
import ComplaintCard from '../../components/ComplaintCard';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadComplaints() {
      try {
        setLoading(true);
        const res = await api.get('/complaints/mine');
        setComplaints(res.data.complaints || []);
      } catch (err) {
        setError('Failed to load your complaints');
      } finally {
        setLoading(false);
      }
    }
    loadComplaints();
  }, []);

  const openCount = complaints.filter(c => ['Open', 'In Progress', 'Reopened'].includes(c.status)).length;
  const pendingCount = complaints.filter(c => c.status === 'Pending Confirmation').length;
  const closedCount = complaints.filter(c => c.status === 'Closed').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px' }}>
      {/* Header */}
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
            Welcome back, {user?.name}!
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Citizen Portal • Track and verify your reported civic issues
          </p>
        </div>

        <Link
          to="/citizen/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
          }}
        >
          <span>➕</span> Pin New Complaint
        </Link>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Open Complaints</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#ea580c', marginTop: '6px' }}>
            {openCount}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Under investigation or work</div>
        </div>

        <div style={{
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #3b82f640',
          backgroundColor: '#eff6ff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af' }}>Action Needed: Pending Your Confirmation</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', marginTop: '6px' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>Officer marked resolved; please verify</div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Closed & Verified</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
            {closedCount}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Successfully resolved</div>
        </div>
      </div>

      {loading ? (
        <Loader message="Loading your dashboard..." />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon="📍"
          title="No complaints filed yet"
          message="Notice an uncollected garbage pile, broken streetlight, pothole or water leak? Pin it on the Nagpur map to alert the ward crew."
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
              File Your First Complaint
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '24px', alignItems: 'start' }}>
          {/* Map of My Complaints */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                🗺️ My Complaints Map
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {complaints.length} reported locations
              </span>
            </div>
            <ComplaintMap
              complaints={complaints}
              height="450px"
              showFilters={false}
              userRole="citizen"
            />
          </div>

          {/* Recent List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Recent Reports
              </h3>
              <Link to="/citizen/complaints" style={{ fontSize: '13px', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {complaints.slice(0, 4).map((c) => (
                <ComplaintCard key={c.id} complaint={c} linkPrefix="/citizen/complaints" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
