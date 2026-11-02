import React, { useState, useEffect } from 'react';
import api from '../api/client';
import ErrorBanner from './ErrorBanner';

export default function ComplaintUpdates({ complaintId, isClosed = false, userRole = 'citizen' }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchUpdates = async () => {
    try {
      const res = await api.get(`/complaints/${complaintId}/updates`);
      setUpdates(res.data.updates || []);
    } catch (err) {
      console.error('Failed to load updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      fetchUpdates();
    }
  }, [complaintId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please enter an update message.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Update message cannot exceed 500 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/complaints/${complaintId}/updates`, {
        message: trimmed,
        is_internal: userRole === 'officer' ? isInternal : false
      });
      setMessage('');
      setIsInternal(false);
      fetchUpdates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post update.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
          💬 Activity Updates & Comments ({updates.length})
        </h4>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {/* Updates List */}
      {loading ? (
        <div style={{ fontSize: '13px', color: '#64748b', padding: '12px 0' }}>Loading updates...</div>
      ) : updates.length === 0 ? (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px dashed #cbd5e1',
          fontSize: '13px',
          color: '#64748b',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          No updates posted yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
          {updates.map((u) => {
            const isOfficer = u.author_role === 'officer';
            const internal = Boolean(u.is_internal);

            return (
              <div
                key={u.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: internal ? '#fef3c7' : '#f8fafc',
                  border: `1px solid ${internal ? '#fde68a' : '#e2e8f0'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: isOfficer ? '#1e293b' : '#2563eb',
                      color: '#ffffff'
                    }}>
                      {isOfficer ? '👮 Officer' : '🙋 Citizen'}
                    </span>
                    <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                      {u.author_name}
                    </strong>
                    {internal && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#92400e',
                        backgroundColor: '#fef08a',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        🔒 Internal Officer Note
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {new Date(u.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {u.message}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Update Form */}
      {isClosed ? (
        <div style={{
          padding: '12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          🔒 Complaint is closed. Further comments are disabled.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <textarea
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message or status update..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: message.length > 500 ? '#dc2626' : '#64748b' }}>
                {message.length} / 500
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {userRole === 'officer' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#92400e', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                />
                🔒 Internal Note (Hidden from citizens)
              </label>
            )}

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              style={{
                marginLeft: 'auto',
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: submitting || !message.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !message.trim() ? 0.6 : 1
              }}
            >
              {submitting ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

