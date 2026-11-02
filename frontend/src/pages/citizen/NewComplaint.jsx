import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import MapPicker from '../../components/MapPicker';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';

export default function NewComplaint() {
  const [categories, setCategories] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form fields
  const [categoryId, setCategoryId] = useState('');
  const [wardId, setWardId] = useState('');
  const [locality, setLocality] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [photos, setPhotos] = useState([]); // [{ id, file, preview }]

  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setError('');
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (photos.length + selectedFiles.length > 3) {
      setError('You can upload a maximum of 3 photos.');
      return;
    }

    const validExtensions = ['image/jpeg', 'image/png', 'image/webp'];
    const newPhotos = [];

    for (const file of selectedFiles) {
      if (!validExtensions.includes(file.type.toLowerCase())) {
        setError(`"${file.name}" is not a valid format. Only JPG, PNG, and WebP are accepted.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 5 MB file size limit.`);
        return;
      }
      newPhotos.push({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file)
      });
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const removePhoto = (idToRemove) => {
    setPhotos((prev) => {
      const remaining = prev.filter((p) => p.id !== idToRemove);
      const removed = prev.find((p) => p.id === idToRemove);
      if (removed) URL.revokeObjectURL(removed.preview);
      return remaining;
    });
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        const [catRes, wardRes] = await Promise.all([
          api.get('/categories'),
          api.get('/wards')
        ]);
        setCategories(catRes.data.categories || []);
        setWards(wardRes.data.wards || []);
      } catch (err) {
        setError('Failed to load categories or wards. Please refresh.');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const handleLocationSelect = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleWardAutoSelect = (nearestWard) => {
    if (nearestWard && nearestWard.id) {
      setWardId(nearestWard.id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDuplicateAlert(null);
    setSuccessInfo(null);

    if (!latitude || !longitude) {
      setError('Please click on the Nagpur map to place a location pin.');
      return;
    }

    if (description.length < 10) {
      setError('Description must be at least 10 characters long.');
      return;
    }

    if (description.length > 500) {
      setError('Description cannot exceed 500 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category_id', String(categoryId));
      formData.append('ward_id', String(wardId));
      formData.append('locality', locality);
      formData.append('description', description);
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));

      photos.forEach((p) => {
        formData.append('photos', p.file);
      });

      const res = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.merged) {
        setDuplicateAlert({
          message: res.data.message || 'A similar complaint already exists nearby. Your report has been added to it.',
          parentId: res.data.parentId,
          complaintId: res.data.complaintId
        });
      } else {
        setSuccessInfo({
          message: 'Complaint submitted successfully!',
          complaintId: res.data.complaintId
        });
        setTimeout(() => {
          navigate(`/citizen/complaints/${res.data.complaintId}`);
        }, 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.details?.[0]?.message ||
                  err.response?.data?.error ||
                  'Failed to submit complaint. Please check your inputs.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return <Loader message="Loading complaint form..." />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
            Pin & Report a Civic Problem
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Place a pin on the Nagpur map. We will notify the ward officer and give you full authority to confirm or reject the repair.
          </p>
        </div>

        <ErrorBanner error={error} onClose={() => setError('')} />

        {/* Duplicate Merge Notice Banner */}
        {duplicateAlert && (
          <div style={{
            backgroundColor: '#eff6ff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: '700', fontSize: '15px' }}>
              <span>ℹ️</span> {duplicateAlert.message}
            </div>
            <p style={{ fontSize: '13px', color: '#3b82f6', margin: '8px 0 12px' }}>
              To prevent duplicate repair crew deployments, nearby complaints within 150m merge into parent issues while increasing overall priority.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link
                to={`/citizen/complaints/${duplicateAlert.parentId}`}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                View Parent Complaint #{duplicateAlert.parentId} →
              </Link>
              <Link
                to="/citizen/dashboard"
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#1e293b',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successInfo && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px',
            color: '#166534',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            ✅ {successInfo.message} Redirecting to your complaint tracking page...
          </div>
        )}

        {!duplicateAlert && !successInfo && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Category & Ward Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (SLA: {c.sla_days} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Ward * <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '400' }}>(Auto-suggested from map pin)</span>
                </label>
                <select
                  required
                  value={wardId}
                  onChange={(e) => setWardId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">-- Select Ward --</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.zone_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Locality */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Locality / Landmark *
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={150}
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Opposite Metro Pillar 42, Wardha Road"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  Description *
                </label>
                <span style={{ fontSize: '12px', color: description.length > 500 ? '#dc2626' : '#64748b' }}>
                  {description.length} / 500 (min 10)
                </span>
              </div>
              <textarea
                required
                rows={4}
                minLength={10}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail (e.g. depth of pothole, water overflow, hazards)..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Map Pin Picker */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Exact Location Pin on Nagpur Map *
              </label>
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onLocationSelect={handleLocationSelect}
                wards={wards}
                onWardAutoSelect={handleWardAutoSelect}
              />
            </div>

            {/* Photo Attachments (Optional, max 3) */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  📷 Attach Problem Photos (Optional, up to 3)
                </label>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {photos.length} / 3 selected (Max 5 MB each, JPG/PNG/WebP)
                </span>
              </div>

              {photos.length < 3 && (
                <div style={{ marginBottom: photos.length > 0 ? '12px' : '0' }}>
                  <input
                    type="file"
                    id="complaint-photos-input"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="complaint-photos-input"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    <span>📁</span> Choose Photo Files
                  </label>
                </div>
              )}

              {/* Photo Previews */}
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {photos.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        position: 'relative',
                        width: '90px',
                        height: '90px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <img
                        src={item.preview}
                        alt="preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(item.id)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(220, 38, 38, 0.9)',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          lineHeight: 1
                        }}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '14px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                marginTop: '10px'
              }}
            >
              {submitting ? 'Submitting & Checking Nearby Reports...' : 'Submit Civic Complaint'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

