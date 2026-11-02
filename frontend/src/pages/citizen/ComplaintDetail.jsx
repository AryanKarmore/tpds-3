import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import api from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import StatusTimeline from '../../components/StatusTimeline';
import PhotoGallery from '../../components/PhotoGallery';
import ComplaintUpdates from '../../components/ComplaintUpdates';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';

const pinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function ComplaintDetail() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Reject Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data.complaint);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleConfirm = async () => {
    if (!window.confirm('Are you sure you want to confirm that this problem has been resolved to your satisfaction?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await api.post(`/complaints/${id}/confirm`);
      setActionSuccess('Resolution confirmed successfully! This issue is now Closed & Verified.');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm resolution.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (rejectReason.trim().length < 10) {
      setError('Please provide at least 10 characters explaining why the fix is unsatisfactory.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await api.post(`/complaints/${id}/reject`, { reason: rejectReason.trim() });
      setShowRejectModal(false);
      setRejectReason('');
      setActionSuccess('Resolution rejected. Complaint has been Reopened for the ward officer to fix.');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject resolution.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader message="Loading complaint details..." />;
  if (!complaint) return <ErrorBanner error={error || 'Complaint not found'} />;

  const isPendingConfirmation = complaint.status === 'Pending Confirmation';

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link to="/citizen/complaints" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
          ← Back to My Complaints
        </Link>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {actionSuccess && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#166534',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          ✅ {actionSuccess}
        </div>
      )}

      {/* Citizen Action Callout Banner if Pending Confirmation */}
      {isPendingConfirmation && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '2px solid #2563eb',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔔</span> Officer has marked this problem as RESOLVED.
            </div>
            <p style={{ fontSize: '14px', color: '#1e3a8a', margin: '6px 0 0' }}>
              Please verify if the field fix actually happened. Your confirmation verifies the fix and closes the complaint.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ✅ Confirm Fix
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ❌ Reject Fix
            </button>
          </div>
        </div>
      )}

      {/* Citizen Verification Comparison: Before & After Side by Side */}
      {isPendingConfirmation && complaint.photos && complaint.photos.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <PhotoGallery photos={complaint.photos} showSideBySide={true} />
        </div>
      )}

      {/* Main Grid: Details + Map */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left Card: Details & Timeline */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Complaint #{complaint.id} • {complaint.category_name}
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0' }}>
                {complaint.locality}
              </h2>
            </div>
            <StatusBadge status={complaint.status} isOverdue={complaint.is_overdue} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            backgroundColor: '#f8fafc',
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px'
          }}>
            <div>
              <span style={{ color: '#64748b' }}>Ward:</span>{' '}
              <strong>{complaint.ward_name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Zone:</span>{' '}
              <strong>{complaint.zone_name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Category SLA:</span>{' '}
              <strong>{complaint.sla_days} days</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Age:</span>{' '}
              <strong>{complaint.age_days} days</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Affected Citizens:</span>{' '}
              <strong>{complaint.affected_count}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Reopen Count:</span>{' '}
              <strong>{complaint.reopen_count}</strong>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 8px' }}>
              Citizen Description
            </h4>
            <p style={{
              fontSize: '14px',
              color: '#1e293b',
              lineHeight: '1.6',
              margin: 0,
              backgroundColor: '#ffffff',
              border: '1px solid #f1f5f9',
              padding: '12px',
              borderRadius: '6px'
            }}>
              {complaint.description}
            </p>
          </div>

          {/* Complaint Photos Gallery */}
          {complaint.photos && complaint.photos.length > 0 && !isPendingConfirmation && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 8px' }}>
                📷 Attached Photos ({complaint.photos.length})
              </h4>
              <PhotoGallery photos={complaint.photos} />
            </div>
          )}

          {/* Merged Duplicate Reports (if any) */}
          {complaint.children && complaint.children.length > 0 && (
            <div style={{
              marginBottom: '24px',
              padding: '14px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#166534', margin: '0 0 8px' }}>
                👥 {complaint.children.length} Additional Citizen Reports Merged into This Issue
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#14532d' }}>
                {complaint.children.map((ch) => (
                  <li key={ch.id} style={{ marginBottom: '4px' }}>
                    #{ch.id} by {ch.citizen_name}: "{ch.description}"
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Status Timeline */}
          <div style={{ marginBottom: '28px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 12px' }}>
              Status History & Audit Trail
            </h4>
            <StatusTimeline history={complaint.history} />
          </div>

          {/* Updates (Comments) */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <ComplaintUpdates
              complaintId={complaint.id}
              isClosed={complaint.status === 'Closed'}
              userRole="citizen"
            />
          </div>
        </div>

        {/* Right Card: Location Map Pin */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 12px' }}>
            📍 Pinned Location
          </h4>

          <div style={{ height: '300px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
            <MapContainer
              center={[complaint.latitude, complaint.longitude]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[complaint.latitude, complaint.longitude]} icon={pinIcon} />
            </MapContainer>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Latitude: <strong>{complaint.latitude.toFixed(6)}</strong></span>
            <span>Longitude: <strong>{complaint.longitude.toFixed(6)}</strong></span>
          </div>
        </div>
      </div>

      {/* Reject Fix Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#991b1b', margin: '0 0 8px' }}>
              ❌ Reject Resolution & Reopen Complaint
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px', lineHeight: '1.5' }}>
              Please explain why the fix is incomplete or unsatisfactory. Your reason will be added to the official audit log and the ward officer will be required to re-inspect.
            </p>

            <form onSubmit={handleReject}>
              <textarea
                required
                rows={4}
                minLength={10}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Garbage was left on the sidewalk, or pothole repair was incomplete..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  marginBottom: '16px'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#334155',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || rejectReason.trim().length < 10}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

