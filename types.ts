
export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface Alert {
  id: string;
  timestamp: number;
  message: string;
  location: Location;
  type: 'SAFE' | 'WANDERING' | 'CRITICAL';
}

export interface Settings {
  homeLocation: Location | null;
  radiusMeters: number;
  caretakerPhone: string;
  caretakerName: string;
}

export interface AppState {
  currentLocation: Location | null;
  history: Location[];
  settings: Settings;
  alerts: Alert[];
  isTracking: boolean;
}
