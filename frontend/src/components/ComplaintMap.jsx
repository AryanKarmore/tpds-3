import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import {
  NAGPUR_CENTER,
  NAGPUR_BOUNDS,
  NAGPUR_DEFAULT_ZOOM
} from '../utils/nagpur';
import { STATUS_COLORS } from '../utils/constants';
import StatusBadge from './StatusBadge';

// Helper component to add MarkerClusterGroup to Leaflet map
function MarkerClusterLayer({ complaints, onSelectComplaint, isOfficer, userRole }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Create marker cluster group
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="background-color:#1e293b; color:white; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; border:2px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.3);">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(34, 34)
        });
      }
    });

    clusterGroupRef.current = clusterGroup;

    complaints.forEach((c) => {
      const color = STATUS_COLORS[c.status] || '#64748b';
      const isOverdue = Boolean(c.is_overdue);

      // Custom marker HTML: dot with color, and if overdue, thick red pulse ring
      const markerHtml = `
        <div style="
          position: relative;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${isOverdue ? `
            <div style="
              position: absolute;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              border: 3px solid #b91c1c;
              box-shadow: 0 0 8px rgba(185, 28, 28, 0.8);
              animation: pulse 1.5s infinite;
            "></div>
          ` : ''}
          <div style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'civic-marker-pin',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12]
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

      // Build popup content
      let popupContent = `
        <div style="min-width: 190px; font-family: Inter, sans-serif; font-size: 13px;">
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px; display:flex; justify-content:space-between; align-items:center;">
            <span>#${c.id} - ${c.category_name || 'Civic Issue'}</span>
            ${isOverdue ? '<span style="background:#b91c1c; color:#fff; font-size:10px; padding:1px 5px; border-radius:4px; font-weight:700;">OVERDUE</span>' : ''}
          </div>
          <div style="color: #475569; margin-bottom: 4px; font-size: 12px;">📍 ${c.locality}</div>
          <div style="display:flex; justify-content:space-between; margin-bottom: 6px; font-size: 12px;">
            <span style="color:${color}; font-weight:600;">● ${c.status}</span>
            <span style="color:#64748b;">${c.age_in_days || 0}d old</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            👥 Affected Citizens: <strong>${c.affected_count || 1}</strong>
          </div>
      `;

      if (userRole) {
        const detailUrl = userRole === 'officer' ? `/officer/complaints/${c.id}` : `/citizen/complaints/${c.id}`;
        popupContent += `
          <a href="${detailUrl}" style="
            display: block;
            text-align: center;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 5px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          ">View Details →</a>
        `;
      }

      popupContent += `</div>`;

      marker.bindPopup(popupContent);
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      if (map && clusterGroup) {
        map.removeLayer(clusterGroup);
      }
    };
  }, [map, complaints, userRole]);

  return null;
}

export default function ComplaintMap({
  complaints = [],
  wards = [],
  wardScores = [],
  categories = [],
  height = '520px',
  userRole = null,
  showFilters = true
}) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showWardCentroids, setShowWardCentroids] = useState(false);

  // Filter complaints client-side or display filtered list
  const filteredComplaints = complaints.filter((c) => {
    if (selectedCategory && String(c.category_id) !== String(selectedCategory)) return false;
    if (selectedStatus && c.status !== selectedStatus) return false;
    if (overdueOnly && !c.is_overdue) return false;
    return true;
  });

  // Create lookup for ward score
  const scoreByWard = {};
  wardScores.forEach((ws) => {
    scoreByWard[ws.ward_id] = ws.performance_score;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Filter Bar */}
      {showFilters && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px'
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px'
              }}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Confirmation">Pending Confirmation</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
            </select>
          </div>

          {/* Overdue Only Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#b91c1c' }}>
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            ⚠️ Overdue Only
          </label>

          {/* Ward Centroids Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#334155', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={showWardCentroids}
              onChange={(e) => setShowWardCentroids(e.target.checked)}
            />
            Show Ward Centroids & Scores
          </label>

          {/* Counts badge */}
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Showing <strong>{filteredComplaints.length}</strong> markers
          </div>
        </div>
      )}

      {/* Map Container */}
      <div style={{ height, borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', position: 'relative' }}>
        <MapContainer
          center={NAGPUR_CENTER}
          zoom={NAGPUR_DEFAULT_ZOOM}
          minZoom={11}
          maxBounds={NAGPUR_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Clustered Complaint Markers */}
          <MarkerClusterLayer
            complaints={filteredComplaints}
            userRole={userRole}
          />

          {/* Optional Ward Centroid Markers Layer */}
          {showWardCentroids && wards.map((w) => {
            const score = scoreByWard[w.id];
            const scoreText = score !== null && score !== undefined ? `${score.toFixed(1)}/100` : 'No data';
            return (
              <CircleMarker
                key={w.id}
                center={[w.latitude, w.longitude]}
                radius={8}
                pathOptions={{
                  fillColor: '#6366f1',
                  fillOpacity: 0.8,
                  color: '#ffffff',
                  weight: 2
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                    <strong>{w.name}</strong><br />
                    Zone: {w.zone_name}<br />
                    Ward Score: <strong>{scoreText}</strong>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Floating Map Legend */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          border: '1px solid #cbd5e1',
          pointerEvents: 'auto'
        }}>
          <span style={{ fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>Status Legend</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: STATUS_COLORS['Open'] }} />
            <span>Open</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: STATUS_COLORS['In Progress'] }} />
            <span>In Progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: STATUS_COLORS['Pending Confirmation'] }} />
            <span>Pending Confirmation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: STATUS_COLORS['Closed'] }} />
            <span>Closed (Verified)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: STATUS_COLORS['Reopened'] }} />
            <span>Reopened</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #b91c1c' }} />
            <span style={{ color: '#b91c1c', fontWeight: '600' }}>Red Ring: Overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
}

