
import React, { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import { Location, Settings, Alert, AppState } from './types';
import { calculateDistance } from './utils';
import { generateSmsContent, getSafetyTips, getDetailedLocation } from './services/geminiService';
import SettingsModal from './components/SettingsModal';
import AlertFeed from './components/AlertFeed';
import StatsCard from './components/StatsCard';

const INITIAL_SETTINGS: Settings = {
  homeLocation: null,
  radiusMeters: 100,
  caretakerPhone: '',
  caretakerName: 'Caretaker'
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentLocation: null,
    history: [],
    settings: INITIAL_SETTINGS,
    alerts: [],
    isTracking: false
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isPickingHome, setIsPickingHome] = useState(false);
  const [safetyTip, setSafetyTip] = useState<string>("Initializing...");
  const [showSafetyTip, setShowSafetyTip] = useState(true);
  const [distanceFromHome, setDistanceFromHome] = useState<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const homeMarkerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([0, 0], 2);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapRef.current);
      
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
    }
  }, []);

  // Sync map click for picking home
  useEffect(() => {
    if (!mapRef.current) return;
    
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickingHome) {
        const newHome: Location = {
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          timestamp: Date.now()
        };
        setState(prev => ({
          ...prev,
          settings: { ...prev.settings, homeLocation: newHome }
        }));
        setIsPickingHome(false);
        setShowSettings(true);
      }
    };

    mapRef.current.on('click', handleMapClick);
    return () => {
      mapRef.current?.off('click', handleMapClick);
    };
  }, [isPickingHome]);

  // Update AI Safety Tip
  useEffect(() => {
    const fetchTip = async () => {
      const tip = await getSafetyTips(state.history);
      setSafetyTip(tip);
    };
    if (state.history.length > 0 && state.history.length % 8 === 0) {
      fetchTip();
    }
  }, [state.history.length]);

  const sendAlert = async (loc: Location, dist: number) => {
    const detailedLoc = await getDetailedLocation(loc);
    const msg = await generateSmsContent("Patient", loc, state.settings, dist, detailedLoc);
    
    console.log(`[REAL-TIME ALERT to ${state.settings.caretakerPhone}]: ${msg}`);

    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message: msg,
      location: loc,
      type: dist > state.settings.radiusMeters * 2 ? 'CRITICAL' : 'WANDERING'
    };

    setState(prev => ({
      ...prev,
      alerts: [...prev.alerts, newAlert]
    }));
  };

  const handleLocationUpdate = useCallback((pos: GeolocationPosition) => {
    const newLoc: Location = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: Date.now()
    };

    if (newLoc.accuracy && newLoc.accuracy > 100 && state.currentLocation) return;

    setState(prev => ({
      ...prev,
      currentLocation: newLoc,
      history: [...prev.history, newLoc].slice(-50),
      isTracking: true
    }));

    if (mapRef.current) {
      const latlng: L.LatLngExpression = [newLoc.lat, newLoc.lng];
      
      if (!markerRef.current) {
        markerRef.current = L.marker(latlng, {
          zIndexOffset: 1000,
          icon: L.divIcon({
            className: '',
            html: `
              <div class="relative flex items-center justify-center w-6 h-6">
                <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-25"></div>
                <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(mapRef.current);
        mapRef.current.setView(latlng, 17);
      } else {
        markerRef.current.setLatLng(latlng);
        if (!mapRef.current.getBounds().contains(latlng) && !isPickingHome) {
          mapRef.current.panTo(latlng);
        }
      }

      if (state.settings.homeLocation) {
        const dist = calculateDistance(newLoc, state.settings.homeLocation);
        setDistanceFromHome(dist);

        if (dist > state.settings.radiusMeters && Date.now() - lastAlertTimeRef.current > 60000) {
          lastAlertTimeRef.current = Date.now();
          sendAlert(newLoc, dist);
        }
      }
    }
  }, [state.settings, state.currentLocation, isPickingHome]);

  useEffect(() => {
    let watchId: number;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        handleLocationUpdate,
        (err) => console.error("GPS Accuracy Error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [handleLocationUpdate]);

  // Handle Circle Management (Initialization)
  useEffect(() => {
    if (mapRef.current && state.settings.homeLocation) {
      const homeLatLng: L.LatLngExpression = [state.settings.homeLocation.lat, state.settings.homeLocation.lng];
      
      if (homeMarkerRef.current) homeMarkerRef.current.remove();
      homeMarkerRef.current = L.marker(homeLatLng, {
        icon: L.divIcon({
          className: 'flex items-center justify-center bg-white w-10 h-10 rounded-full border-4 border-indigo-600 shadow-2xl',
          html: '<span class="text-xl">🏠</span>',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(mapRef.current);

      if (circleRef.current) circleRef.current.remove();
      circleRef.current = L.circle(homeLatLng, {
        radius: state.settings.radiusMeters,
        color: '#4f46e5',
        fillColor: '#4f46e5',
        fillOpacity: 0.05,
        weight: 2,
        dashArray: '8, 8'
      }).addTo(mapRef.current);
    }
  }, [state.settings.homeLocation, state.settings.radiusMeters]);

  // Handle Circle Visual Highlighting (Pulsing Red when Alerting)
  useEffect(() => {
    if (circleRef.current) {
      const isOutside = distanceFromHome !== null && distanceFromHome > state.settings.radiusMeters;
      
      if (isOutside) {
        circleRef.current.setStyle({
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.15,
          dashArray: '', // Solid border for pulsing effect
        });
        
        const el = circleRef.current.getElement();
        if (el) el.classList.add('pulse-red-geofence');
      } else {
        circleRef.current.setStyle({
          color: '#4f46e5',
          fillColor: '#4f46e5',
          fillOpacity: 0.05,
          dashArray: '8, 8',
        });
        
        const el = circleRef.current.getElement();
        if (el) el.classList.remove('pulse-red-geofence');
      }
    }
  }, [distanceFromHome, state.settings.radiusMeters]);

  const initiateCall = () => {
    if (state.settings.caretakerPhone) {
      window.location.href = `tel:${state.settings.caretakerPhone}`;
    } else {
      alert("Please set a caretaker phone number in settings first.");
      setShowSettings(true);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 font-sans">
      <header className="bg-gradient-to-r from-indigo-700 to-blue-800 text-white p-4 shadow-lg flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
            <span className="text-2xl drop-shadow-sm">📍</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none">SafeStep Pro</h1>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">Grounded Tracking Active</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={initiateCall}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl font-bold text-sm shadow-lg shadow-green-900/20 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 005.474 5.474l.772-1.547a1 1 0 011.06-.539l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span className="hidden sm:inline">Call Caretaker</span>
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 active:scale-90"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 min-h-[300px]">
          <StatsCard 
            distance={distanceFromHome} 
            radius={state.settings.radiusMeters} 
            status={distanceFromHome && distanceFromHome > state.settings.radiusMeters ? 'ALERT' : 'SAFE'}
          />
          
          <div className={`flex-1 relative bg-white rounded-3xl shadow-xl border-2 overflow-hidden transition-colors duration-300 ${isPickingHome ? 'border-orange-400 ring-4 ring-orange-100 cursor-crosshair' : 'border-slate-200 ring-1 ring-black/5'}`}>
            <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
            
            {isPickingHome && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-orange-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold animate-bounce border-2 border-white">
                Tap on map to set Home Location
              </div>
            )}

            {!state.isTracking && (
              <div className="absolute inset-0 z-10 bg-slate-50/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                  <div className="relative flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg border border-blue-100">
                    <span className="text-3xl">📡</span>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-800">Calibrating Signal</h3>
                <p className="text-slate-500 max-w-xs mt-3 font-medium">We're pinpointing the exact location using high-accuracy GPS and Maps grounding.</p>
              </div>
            )}

            {showSafetyTip && !isPickingHome && (
              <div className="absolute bottom-6 left-6 right-6 z-20 bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/50 max-w-md mx-auto transform transition-all duration-500 group">
                <button 
                  onClick={() => setShowSafetyTip(false)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-md rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:scale-110 transition pointer-events-auto"
                  aria-label="Close insight"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-start gap-4 pointer-events-none">
                  <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Safety Insight</span>
                      <div className="h-px flex-1 bg-indigo-100"></div>
                    </div>
                    <p className="text-sm text-slate-800 font-bold leading-relaxed">"{safetyTip}"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-96 flex flex-col h-full gap-4">
          <div className="flex-1 min-h-0">
            <AlertFeed alerts={state.alerts} />
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Emergency Protocol
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="text-lg">📱</div>
                <p className="text-xs text-slate-600 leading-tight">SMS alerts will include a <strong>Google Maps link</strong> and <strong>exact landmarks</strong> for immediate rescue.</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="text-lg">🎯</div>
                <p className="text-xs text-slate-600 leading-tight">The safety circle is grounded using <strong>high-accuracy sensors</strong> for minimal false positives.</p>
              </div>
              {!showSafetyTip && (
                <button 
                  onClick={() => setShowSafetyTip(true)}
                  className="w-full py-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition"
                >
                  Show Safety Insights
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {showSettings && (
        <SettingsModal 
          currentSettings={state.settings}
          currentLocation={state.currentLocation}
          onSave={(newSettings) => setState(prev => ({ ...prev, settings: newSettings }))}
          onClose={() => setShowSettings(false)}
          onPickOnMap={() => {
            setShowSettings(false);
            setIsPickingHome(true);
          }}
        />
      )}
    </div>
  );
};

export default App;
