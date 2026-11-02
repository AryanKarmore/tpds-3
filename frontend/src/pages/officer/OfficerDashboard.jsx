import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [wardScores, setWardScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [statsRes, scoreRes] = await Promise.all([
          api.get('/stats/summary'),
          api.get('/wards/scores')
        ]);
        setStats(statsRes.data.stats);
        setWardScores(scoreRes.data.scores || []);
      } catch (err) {
        setError('Failed to load officer dashboard metrics.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <Loader message="Loading officer dashboard..." />;

  // Find own ward score
  const ownWardScore = user?.ward_id
    ? wardScores.find((ws) => ws.ward_id === user.ward_id)
    : null;

  // Sorted rankings
  const rankedWards = [...wardScores].sort((a, b) => {
    if (a.performance_score === null) return 1;
    if (b.performance_score === null) return -1;
    return b.performance_score - a.performance_score;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px' }}>
      {/* Officer Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {user?.is_head ? 'Head Officer Portal (City-Wide Administration)' : `Ward Officer • ${user?.ward_name || `Ward ${user?.ward_id}`}`}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0' }}>
            Maintenance Performance & Workflows
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            to="/officer/queue"
            style={{
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
            📋 Open Priority Queue
          </Link>
          <Link
            to="/officer/map"
            style={{
              backgroundColor: '#1e293b',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '14px',
              textDecoration: 'none'
            }}
          >
            🗺️ Ward Map
          </Link>
        </div>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Total Complaints</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {stats?.total || 0}
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Open</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
            {stats?.open || 0}
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>In Progress</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#ea580c', marginTop: '4px' }}>
            {stats?.in_progress || 0}
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Pending Confirmation</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
            {stats?.pending_confirmation || 0}
          </div>
        </div>

        <div style={{
          backgroundColor: '#fef2f2',
          borderRadius: '10px',
          padding: '18px',
          border: '1px solid #fecaca',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c' }}>⚠️ OVERDUE (Past SLA)</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#991b1b', marginTop: '4px' }}>
            {stats?.overdue || 0}
          </div>
        </div>

        <div style={{
          backgroundColor: '#faf5ff',
          borderRadius: '10px',
          padding: '18px',
          border: '1px solid #e9d5ff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#7e22ce' }}>🔁 Reopened by Citizen</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#9333ea', marginTop: '4px' }}>
            {stats?.reopened || 0}
          </div>
        </div>
      </div>

      {/* Main Section: Ward Score Card + Mini Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* Ward Performance Score Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
                {user?.is_head ? 'Nagpur City-Wide Performance Index' : `${user?.ward_name} Performance Score`}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Objective score (0-100) based on resolution time, SLA overdue share, and citizen reopens.
              </p>
            </div>

            {ownWardScore && (
              <div style={{
                textAlign: 'center',
                padding: '10px 18px',
                backgroundColor: ownWardScore.performance_score >= 70 ? '#f0fdf4' : '#fff7ed',
                border: `2px solid ${ownWardScore.performance_score >= 70 ? '#16a34a' : '#ea580c'}`,
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '26px', fontWeight: '800', color: ownWardScore.performance_score >= 70 ? '#16a34a' : '#ea580c' }}>
                  {ownWardScore.performance_score !== null ? `${ownWardScore.performance_score.toFixed(1)}%` : 'No data'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Current Score</div>
              </div>
            )}
          </div>

          {/* Breakdown Details */}
          {ownWardScore && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '13px'
            }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Avg Resolution Time</div>
                <strong style={{ fontSize: '15px', color: '#1e293b' }}>{ownWardScore.avg_resolution_days} days</strong>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cap: 14 days</div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Overdue Share</div>
                <strong style={{ fontSize: '15px', color: '#b91c1c' }}>{(ownWardScore.overdue_share * 100).toFixed(1)}%</strong>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ownWardScore.overdue_count} overdue</div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Citizen Reopen Rate</div>
                <strong style={{ fontSize: '15px', color: '#9333ea' }}>{(ownWardScore.reopen_rate * 100).toFixed(1)}%</strong>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ownWardScore.reopened_complaints} reopens</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '14px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
            💡 <strong>Score Formula:</strong> <code>Score = 100 - (30 × min(avg_time, 14)/14) - (30 × overdue_share) - (40 × reopen_rate)</code>.
            Fixing issues right the first time avoids costly citizen reopens which carry a heavy 40-point penalty.
          </div>
        </div>

        {/* Mini Ranking Table */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px' }}>
            Ward Performance Rankings
          </h3>

          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '8px' }}>Rank</th>
                  <th style={{ padding: '8px' }}>Ward</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {rankedWards.map((w, idx) => {
                  const isCurrentWard = user?.ward_id === w.ward_id;
                  const score = w.performance_score;
                  return (
                    <tr
                      key={w.ward_id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isCurrentWard ? '#eff6ff' : 'transparent',
                        fontWeight: isCurrentWard ? '700' : 'normal'
                      }}
                    >
                      <td style={{ padding: '8px', color: '#64748b' }}>#{idx + 1}</td>
                      <td style={{ padding: '8px' }}>
                        {w.ward_name.replace('Ward ', '')}
                        {isCurrentWard && <span style={{ fontSize: '10px', color: '#2563eb', marginLeft: '6px' }}>(Your Ward)</span>}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: score >= 70 ? '#16a34a' : '#ea580c' }}>
                        {score !== null ? `${score.toFixed(1)}%` : 'No data'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

