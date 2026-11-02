// Nagpur Geographic Constants & Calculations
export const NAGPUR_CENTER = [21.1458, 79.0882];
export const NAGPUR_DEFAULT_ZOOM = 12;

// Bounding box: roughly [[20.95, 78.90], [21.30, 79.30]]
export const NAGPUR_BOUNDS = [
  [20.95, 78.90],
  [21.30, 79.30]
];

export function isInsideNagpur(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  if (isNaN(latitude) || isNaN(longitude)) return false;

  return (
    latitude >= NAGPUR_BOUNDS[0][0] &&
    latitude <= NAGPUR_BOUNDS[1][0] &&
    longitude >= NAGPUR_BOUNDS[0][1] &&
    longitude <= NAGPUR_BOUNDS[1][1]
  );
}

export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest ward to the given coordinates using Haversine distance from centroid
 */
export function findNearestWard(lat, lng, wards = []) {
  if (!wards || wards.length === 0) return null;

  let nearestWard = null;
  let minDistance = Infinity;

  for (const ward of wards) {
    const dist = haversineDistanceMeters(lat, lng, ward.latitude, ward.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestWard = ward;
    }
  }

  return nearestWard;
}

