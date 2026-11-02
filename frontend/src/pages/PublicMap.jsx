import React, { useState, useEffect } from 'react';
import api from '../api/client';
import ComplaintMap from '../components/ComplaintMap';
import Loader from '../components/Loader';
import ErrorBanner from '../components/ErrorBanner';

export default function PublicMap() {
  const [markers, setMarkers] = useState([]);
  const [wards, setWards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wardScores, setWardScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [markerRes, wardRes, catRes, scoreRes] = await Promise.all([
          api.get('/public/map'),
          api.get('/wards'),
          api.get('/categories'),
          api.get('/wards/scores')
        ]);

        setMarkers(markerRes.data.markers || []);
        setWards(wardRes.data.wards || []);
        setCategories(catRes.data.categories || []);
        setWardScores(scoreRes.data.scores || []);
      } catch (err) {
        setError('Failed to load map data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Sort ward scores descending
  const sortedScores = [...wardScores].sort((a, b) => {
    if (a.performance_score === null) return 1;
    if (b.performance_score === null) return -1;
    return b.performance_score - a.performance_score;
  });

  return (
    <div style={{ maxWidth: '1300px', margin: '24px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
          Nagpur Public Civic Map & Ward Rankings
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          Live view of civic issues reported across Nagpur city. Privacy note: personal citizen names and contact details are redacted.
        </p>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {loading ? (
        <Loader message="Loading Nagpur civic map and ward scores..." />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Main Map */}
          <div>
            <ComplaintMap
              complaints={markers}
              wards={wards}
              wardScores={wardScores}
              categories={categories}
              height="650px"
              showFilters={true}
            />
          </div>

          {/* Ward Score Ranking Sidebar */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            maxHeight: '650px',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>
              🏆 Ward Performance Rankings
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
              Formula: 100 - resolution time - overdue rate - reopen rate
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedScores.map((w, idx) => {
                const score = w.performance_score;
                const scoreColor =
                  score === null ? '#94a3b8' :
                  score >= 80 ? '#16a34a' :
                  score >= 60 ? '#2563eb' :
                  score >= 40 ? '#ea580c' : '#dc2626';

                return (
                  <div
                    key={w.ward_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                        #{idx + 1} {w.ward_name.replace('Ward ', '')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {w.zone_name} • {w.total_complaints} reports
                      </div>
                    </div>

                    <div style={{
                      fontWeight: '700',
                      fontSize: '13px',
                      color: scoreColor,
                      backgroundColor: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${scoreColor}40`
                    }}>
                      {score !== null ? `${score.toFixed(1)}%` : 'No data'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Synthetic Data academic footer notice */}
      <footer style={{
        textAlign: 'center',
        padding: '24px 0 12px',
        color: '#94a3b8',
        fontSize: '12px'
      }}>
        Academic Project: CivicTrack Nagpur. Note: Data displayed is synthetic for demonstration and testing purposes.
      </footer>
    </div>
  );
}

