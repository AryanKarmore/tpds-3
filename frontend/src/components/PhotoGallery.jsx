import React, { useState } from 'react';

export default function PhotoGallery({ photos = [], showSideBySide = false }) {
  const [activePhoto, setActivePhoto] = useState(null);

  if (!photos || photos.length === 0) {
    return null;
  }

  const beforePhotos = photos.filter((p) => p.type === 'before');
  const afterPhotos = photos.filter((p) => p.type === 'after');

  return (
    <div style={{ margin: '20px 0' }}>
      {/* Side-by-side comparison for citizen confirmation */}
      {showSideBySide && afterPhotos.length > 0 && beforePhotos.length > 0 && (
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> Before & After Verification Comparison
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Before Column */}
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#dc2626',
                backgroundColor: '#fee2e2',
                padding: '4px 10px',
                borderRadius: '4px',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                📸 BEFORE (Reported by Citizen)
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {beforePhotos.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setActivePhoto(p)}
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid #ef4444'
                    }}
                  >
                    <img
                      src={p.file_path}
                      alt="Before"
                      style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* After Column */}
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#16a34a',
                backgroundColor: '#dcfce7',
                padding: '4px 10px',
                borderRadius: '4px',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                ✅ AFTER (Repaired by Ward Officer)
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {afterPhotos.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setActivePhoto(p)}
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid #22c55e'
                    }}
                  >
                    <img
                      src={p.file_path}
                      alt="After fix"
                      style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Gallery List */}
      <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 10px' }}>
        📷 Photo Gallery ({photos.length}) <span style={{ fontSize: '11px', fontWeight: '400', color: '#64748b' }}>(Click to enlarge)</span>
      </h4>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {photos.map((p) => {
          const isAfter = p.type === 'after';
          return (
            <div
              key={p.id}
              onClick={() => setActivePhoto(p)}
              style={{
                position: 'relative',
                width: '110px',
                height: '110px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}
            >
              <img
                src={p.file_path}
                alt={p.type}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{
                position: 'absolute',
                bottom: '4px',
                left: '4px',
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: isAfter ? '#16a34a' : '#2563eb',
                color: '#ffffff'
              }}>
                {isAfter ? 'After Fix' : 'Before'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Enlarged Photo Modal */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '850px',
              maxHeight: '90vh',
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              fontSize: '13px'
            }}>
              <div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '700',
                  marginRight: '8px',
                  backgroundColor: activePhoto.type === 'after' ? '#16a34a' : '#2563eb'
                }}>
                  {activePhoto.type === 'after' ? 'AFTER FIX' : 'BEFORE REPAIR'}
                </span>
                <span>Uploaded by {activePhoto.uploader_name || 'User'}</span>
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 6px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#000000', padding: '10px' }}>
              <img
                src={activePhoto.file_path}
                alt="Enlarged"
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

