
import React, { useState } from 'react';
import { Settings, Location } from '../types';

interface SettingsModalProps {
  currentSettings: Settings;
  currentLocation: Location | null;
  onSave: (settings: Settings) => void;
  onClose: () => void;
  onPickOnMap: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentSettings, currentLocation, onSave, onClose, onPickOnMap }) => {
  const [radius, setRadius] = useState(currentSettings.radiusMeters);
  const [phone, setPhone] = useState(currentSettings.caretakerPhone);
  const [name, setName] = useState(currentSettings.caretakerName);
  const [home, setHome] = useState<Location | null>(currentSettings.homeLocation);

  const handleSave = () => {
    onSave({
      radiusMeters: radius,
      caretakerPhone: phone,
      caretakerName: name,
      homeLocation: home
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-800">Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Caretaker Details</label>
              <div className="space-y-3">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Caretaker Name"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number (e.g. +1 234 567 890)"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Safety Radius: <span className="text-blue-600">{radius}m</span></label>
              <input 
                type="range" 
                min="20" 
                max="1000" 
                step="10"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="pt-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Home Location</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Feature 2: Choose from maps and current location */}
                <button 
                  onClick={() => currentLocation && setHome(currentLocation)}
                  disabled={!currentLocation}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="text-lg">📍</span>
                  Current
                </button>
                <button 
                  onClick={onPickOnMap}
                  className="py-3 px-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-sm font-bold text-indigo-700 transition flex items-center justify-center gap-2 border border-indigo-100"
                >
                  <span className="text-lg">🗺️</span>
                  Pick on Map
                </button>
              </div>
              {home && (
                <div className="mt-3 flex items-center justify-center bg-green-50 text-green-700 border border-green-100 py-2 rounded-xl text-xs font-bold animate-pulse">
                   Home Location Locked ✅
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-slate-500 hover:text-slate-800 transition font-bold text-sm"
          >
            Discard
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-200 transition font-black text-sm active:scale-95"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
