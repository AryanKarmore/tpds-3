import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import ComplaintMap from '../../components/ComplaintMap';
import Loader from '../../components/Loader';
import ErrorBanner from '../../components/ErrorBanner';

export default function OfficerMap() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [wards, setWards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wardScores, setWardScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMapData() {
      try {
        setLoading(true);
        const [markerRes, wardRes, catRes, scoreRes] = await Promise.all([
          api.get('/map/complaints'),
          api.get('/wards'),
          api.get('/categories'),
          api.get('/wards/scores')
        ]);
        setComplaints(markerRes.data.markers || []);
        setWards(wardRes.data.wards || []);
        setCategories(catRes.data.categories || []);
        setWardScores(scoreRes.data.scores || []);
      } catch (err) {
        setError('Failed to load officer map data.');
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>
          {user?.is_head ? 'City-Wide Map' : `Assigned Ward: ${user?.ward_name || `Ward ${user?.ward_id}`}`}
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0' }}>
          Ward Maintenance GIS Map
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
          Real-time geospatial visualization of complaints, status categories, and overdue repair sites.
        </p>
      </div>

      <ErrorBanner error={error} onClose={() => setError('')} />

      {loading ? (
        <Loader message="Loading ward GIS data..." />
      ) : (
        <ComplaintMap
          complaints={complaints}
          wards={wards}
          wardScores={wardScores}
          categories={categories}
          height="650px"
          userRole="officer"
          showFilters={true}
        />
      )}
    </div>
  );
}

