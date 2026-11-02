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

export default function OfficerComplaintDetail() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Status update form
  const [selectedStatus, setSelectedStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState('');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data.complaint);
      setSelectedStatus('');
      setNote('');
      setAfterPhoto(null);
      setAfterPhotoPreview('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds 5MB limit. Please upload a smaller photo.');
      return;
    }

    setError('');
    setAfterPhoto(file);
    setAfterPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setAfterPhoto(null);
    if (afterPhotoPreview) {
      URL.revokeObjectURL(afterPhotoPreview);
      setAfterPhotoPreview('');
    }
  };

  // Allowed transitions per Section 9
  const getAllowedNextStatuses = (currentStatus) => {
    switch (currentStatus) {
      case 'Open':
        return [{ value: 'In Progress', label: 'Move to In Progress' }];
      case 'In Progress':
        return [{ value: 'Pending Confirmation', label: 'Mark Resolved (Pending Citizen Confirmation)' }];
      case 'Reopened':
        return [{ value: 'In Progress', label: 'Re-assign: Move to In Progress' }];
      case 'Pending Confirmation':
      case 'Closed':
      default:
        return [];
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) {
      setError('Please select a valid next status.');
      return;
    }

    if (selectedStatus === 'Pending Confirmation' && !afterPhoto) {
      setError("An 'after' photo is strictly required before moving to Pending Confirmation.");
      return;
    }

    if (!window.confirm(`Are you sure you want to update status to '${selectedStatus}'?`)) {
      return;
    }

    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('status', selectedStatus);
      if (note.trim()) {
        formData.append('note', note.trim());
      }
      if (afterPhoto) {
        formData.append('photo', afterPhoto);
      }

      await api.patch(`/complaints/${id}/status`, formData);
      setSuccess(`Status successfully updated to '${selectedStatus}'!`);
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loader message="Loading complaint details..." />;
  if (!complaint) return <ErrorBanner error={error || 'Complaint not found'} />;

  const allowedOptions = getAllowedNextStatuses(complaint.status);

  return (
    <div style={{ maxWidth: '1000px', margin: '24px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/officer/queue" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
          ← Back to Priority Queue
        </Link>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {success && (
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
          ✅ {success}
        </div>
      )}

      {/* Main Details and Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Complaint & Update Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Complaint Info Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                  #{complaint.id} • {complaint.category_name}
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
                <span style={{ color: '#64748b' }}>Priority Score:</span>{' '}
                <strong style={{ color: '#2563eb' }}>⚡ {complaint.priority_score}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Affected Citizens:</span>{' '}
                <strong>👥 {complaint.affected_count}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Age in Days:</span>{' '}
                <strong>{complaint.age_days}d</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Citizen Contact:</span>{' '}
                <strong>{complaint.citizen_name} ({complaint.citizen_phone || 'No phone'})</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Reopen Count:</span>{' '}
                <strong style={{ color: complaint.reopen_count > 0 ? '#9333ea' : '#1e293b' }}>
                  {complaint.reopen_count}
                </strong>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#334155', margin: '0 0 6px' }}>
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

            {/* Photos & Side-by-side verification */}
            {complaint.photos && complaint.photos.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#334155', margin: '0 0 8px' }}>
                  Attached Photos ({complaint.photos.length})
                </h4>
                <PhotoGallery photos={complaint.photos} showSideBySide={true} />
              </div>
            )}

            {/* Status History */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 12px' }}>
                Status History & Work Log
              </h4>
              <StatusTimeline history={complaint.history} />
            </div>

            {/* Updates (Comments) Thread */}
            <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <ComplaintUpdates
                complaintId={complaint.id}
                isClosed={complaint.status === 'Closed'}
                userRole="officer"
              />
            </div>
          </div>

          {/* Officer Action Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            padding: '24px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
              🛠️ Update Complaint Status
            </h3>

            {allowedOptions.length === 0 ? (
              <div style={{
                padding: '14px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                color: '#64748b'
              }}>
                {complaint.status === 'Pending Confirmation' ? (
                  <span>
                    ℹ️ This complaint is currently <strong>Pending Confirmation</strong> by the citizen. Per CivicTrack rules, only the citizen who filed this issue may verify the fix and mark it Closed, or reject it to Reopen.
                  </span>
                ) : complaint.status === 'Closed' ? (
                  <span>
                    ✅ This complaint is <strong>Closed & Verified</strong>. No further status changes are permitted.
                  </span>
                ) : (
                  <span>No transitions available from current status.</span>
                )}
              </div>
            ) : (
              <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Allowed Next Status *
                  </label>
                  <select
                    required
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="">-- Select Next Step --</option>
                    {allowedOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Required After-Photo upload when moving to Pending Confirmation */}
                {selectedStatus === 'Pending Confirmation' && (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📷</span> Proof of Resolution ('After' Photo) *
                    </label>
                    <p style={{ fontSize: '12px', color: '#15803d', margin: 0, lineHeight: '1.4' }}>
                      An 'after' photo is strictly required before moving to Pending Confirmation. The citizen will inspect this image side-by-side with their original complaint before verifying. (JPG, PNG, WebP up to 5MB)
                    </p>
                    <input
                      type="file"
                      required
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      style={{ fontSize: '13px', marginTop: '4px' }}
                    />
                    {afterPhotoPreview && (
                      <div style={{ marginTop: '8px', position: 'relative', width: '140px' }}>
                        <img
                          src={afterPhotoPreview}
                          alt="After fix proof"
                          style={{
                            width: '140px',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '2px solid #16a34a'
                          }}
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          title="Remove photo"
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Officer Maintenance Note / Work Details
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Field crew deployed, patch work completed, debris cleared..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating || !selectedStatus}
                  style={{
                    padding: '12px',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: updating || !selectedStatus ? 'not-allowed' : 'pointer',
                    opacity: updating || !selectedStatus ? 0.6 : 1
                  }}
                >
                  {updating ? 'Recording Status Transition...' : 'Apply Status Update'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Location Map */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 12px' }}>
            📍 Problem Location Coordinates
          </h4>

          <div style={{ height: '320px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
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
    </div>
  );
}

