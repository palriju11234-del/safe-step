
import { Location } from './types';

/**
 * Calculates the distance between two points in meters using the Haversine formula.
 */
export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (loc1.lat * Math.PI) / 180;
  const phi2 = (loc2.lat * Math.PI) / 180;
  const deltaPhi = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const deltaLambda = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
