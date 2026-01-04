
import React from 'react';
import { Alert } from '../types';
import { formatDate } from '../utils';

interface AlertFeedProps {
  alerts: Alert[];
}

const AlertFeed: React.FC<AlertFeedProps> = ({ alerts }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 overflow-hidden flex flex-col h-full">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        Alert History
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {alerts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 italic">No alerts recorded yet.</div>
        ) : (
          alerts.slice().reverse().map(alert => (
            <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
              alert.type === 'WANDERING' ? 'bg-amber-50 border-amber-400' : 'bg-red-50 border-red-400'
            }`}>
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  alert.type === 'WANDERING' ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'
                }`}>
                  {alert.type}
                </span>
                <span className="text-xs text-slate-500">{formatDate(alert.timestamp)}</span>
              </div>
              <p className="text-sm text-slate-700 line-clamp-2">{alert.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertFeed;
