
import React from 'react';
import { formatDistance } from '../utils';

interface StatsCardProps {
  distance: number | null;
  radius: number;
  status: 'SAFE' | 'ALERT';
}

const StatsCard: React.FC<StatsCardProps> = ({ distance, radius, status }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <div className="bg-white p-4 rounded-xl shadow-sm border-b-4 border-blue-500">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Current Distance</p>
        <p className="text-2xl font-bold text-slate-800">{distance !== null ? formatDistance(distance) : '---'}</p>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border-b-4 border-indigo-500">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Safety Limit</p>
        <p className="text-2xl font-bold text-slate-800">{radius}m</p>
      </div>

      <div className={`p-4 rounded-xl shadow-sm border-b-4 transition-all ${
        status === 'SAFE' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500 animate-pulse'
      }`}>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Status</p>
        <p className={`text-2xl font-bold ${status === 'SAFE' ? 'text-green-700' : 'text-red-700'}`}>
          {status}
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border-b-4 border-slate-300">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Geofence</p>
        <p className="text-2xl font-bold text-slate-800">Active</p>
      </div>
    </div>
  );
};

export default StatsCard;
