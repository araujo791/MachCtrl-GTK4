import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

export const TempAlert: React.FC = () => {
  const { tempAlert, dismissTempAlert, t } = useMachCtrl();
  if (!tempAlert) return null;
  return (
    <div className="keep-white-all absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1a0f0f]/95 border border-red-500 shadow-[0_8px_32px_rgba(239,68,68,0.3)] max-w-md">
      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
      <div className="flex-1">
        <div className="text-sm font-extrabold text-white">{t('Temperatura alta!')}</div>
        <div className="text-xs text-red-200/80 font-mono">
          {tempAlert.kind === 'cpu' ? t('CPU em') : t('GPU em')} {tempAlert.temp.toFixed(0)}°C
        </div>
      </div>
      <button onClick={dismissTempAlert} className="p-1 rounded-lg text-red-200/70 hover:text-white hover:bg-white/10" aria-label="close">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
