import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  NAGPUR_CENTER,
  NAGPUR_BOUNDS,
  NAGPUR_DEFAULT_ZOOM,
  isInsideNagpur,
  findNearestWard
} from '../utils/nagpur';

// Fix Leaflet's default icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map click handler component
function LocationMarker({ position, setPosition, onLocationChange }) {
  const markerRef = useRef(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (isInsideNagpur(lat, lng)) {
        setPosition([lat, lng]);
        onLocationChange(lat, lng);
      } else {
        alert('Please pin within Nagpur municipal boundary');
      }
    }
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          if (isInsideNagpur(lat, lng)) {
            setPosition([lat, lng]);
            onLocationChange(lat, lng);
          } else {
            alert('Cannot place pin outside Nagpur');
            // Revert marker to previous position
            marker.setLatLng(position);
          }
        }
      }
    }),
    [position, onLocationChange, setPosition]
  );

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={defaultIcon}
    />
  );
}

export default function MapPicker({
  latitude,
  longitude,
  onLocationSelect,
  wards = [],
  onWardAutoSelect
}) {
  const [position, setPosition] = useState(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [geoError, setGeoError] = useState('');
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handleLocationUpdate = (lat, lng) => {
    setGeoError('');
    onLocationSelect(lat, lng);

    if (wards.length > 0 && onWardAutoSelect) {
      const nearest = findNearestWard(lat, lng, wards);
      if (nearest) {
        onWardAutoSelect(nearest);
      }
    }
  };

  const handleUseCurrentLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (isInsideNagpur(lat, lng)) {
          setPosition([lat, lng]);
          handleLocationUpdate(lat, lng);
          if (mapInstance) {
            mapInstance.setView([lat, lng], 15);
          }
        } else {
          setGeoError(`Your current coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) are outside the Nagpur city boundary.`);
        }
      },
      (err) => {
        setGeoError(`Could not retrieve location: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
          📍 Click map or drag marker to set exact problem location
        </span>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: '#f1f5f9',
            color: '#1e293b',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🎯 Use My Current Location
        </button>
      </div>

      {geoError && (
        <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>
          ⚠️ {geoError}
        </div>
      )}

      <div style={{ height: '320px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
        <MapContainer
          center={position || NAGPUR_CENTER}
          zoom={NAGPUR_DEFAULT_ZOOM}
          minZoom={11}
          maxBounds={NAGPUR_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
          ref={setMapInstance}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={position}
            setPosition={setPosition}
            onLocationChange={handleLocationUpdate}
          />
        </MapContainer>
      </div>

      {/* Read-only Coordinates display */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Latitude</label>
          <input
            type="text"
            readOnly
            value={position ? position[0].toFixed(6) : ''}
            placeholder="Click map to pin"
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '13px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '4px'
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Longitude</label>
          <input
            type="text"
            readOnly
            value={position ? position[1].toFixed(6) : ''}
            placeholder="Click map to pin"
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '13px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
    </div>
  );
}
