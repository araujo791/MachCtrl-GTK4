import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

// Confirmação do modo "Máximo" da ventoinha (pode ficar bem barulhenta).
export const ConfirmModal: React.FC = () => {
  const { maxConfirmFan, confirmMax, cancelMax, t } = useMachCtrl();
  if (!maxConfirmFan) return null;
  return (
    <div onClick={cancelMax} className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm glass-panel rounded-[28px] p-6 border border-white/15 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">{t('Ventoinha no máximo?')} ({maxConfirmFan.name})</h3>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">
          {t('A ventoinha vai girar a 100% e pode ficar bem barulhenta. Deseja continuar?')}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={cancelMax} className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 border border-white/15 hover:bg-white/10">
            {t('Cancelar')}
          </button>
          <button onClick={confirmMax} className="px-4 py-2 rounded-xl text-xs font-bold keep-white text-white bg-rose-500 hover:bg-rose-600">
            {t('Continuar')}
          </button>
        </div>
      </div>
    </div>
  );
};
