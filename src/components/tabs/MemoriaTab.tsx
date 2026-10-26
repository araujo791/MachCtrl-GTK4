import React from 'react';
import { Layers } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const MemoriaTab: React.FC = () => {
  const { dimms } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Gestão de Memória
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
          Visualização dos pentes instalados via dmidecode, velocidade MT/s, voltagem e slots disponíveis
        </p>
      </div>

      {/* Top Main Memory Bar Card */}
      <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-6 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col md:flex-row items-center gap-6">
        {/* Circular indicator */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="92" height="92" className="transform -rotate-90">
            <circle cx="46" cy="46" r="38" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-100 dark:text-white/5" />
            <circle
              cx="46"
              cy="46"
              r="38"
              stroke="#10b981"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 38}
              strokeDashoffset={2 * Math.PI * 38 * (1 - 0.1)}
              strokeLinecap="round"
              fill="none"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.4))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-center">
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-tight">10%</span>
            <span className="text-[9px] text-slate-400">RAM</span>
          </div>
        </div>

        {/* Big numbers & bar */}
        <div className="flex-1 w-full space-y-3">
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            6.3 <span className="text-lg font-normal text-slate-400">/ 62.8 GB</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full shadow-xs" style={{ width: '10%' }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pt-1 text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Total</span>
              <strong className="text-sm text-slate-800 dark:text-slate-100">62.8 GB</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Usado</span>
              <strong className="text-sm text-slate-800 dark:text-slate-100">6.3 GB</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Livre</span>
              <strong className="text-sm text-slate-800 dark:text-slate-100">56.5 GB</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Slots</span>
              <strong className="text-sm text-blue-600 dark:text-cyan-400">4/8</strong>
            </div>
          </div>
        </div>
      </div>

      {/* PENTES INSTALADOS Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
          PENTES INSTALADOS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dimms.map((dimm, i) =>
            dimm.isEmpty ? (
              <div
                key={i}
                className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 p-6 flex items-center justify-center text-xs font-mono text-slate-400 dark:text-slate-600 min-h-[140px]"
              >
                Slot vazio
              </div>
            ) : (
              <div
                key={dimm.slot}
                className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col justify-between space-y-3 min-h-[140px] hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs font-mono text-slate-800 dark:text-slate-100">
                    {dimm.slot}
                  </span>
                  <span className="text-xs font-bold font-mono text-blue-600 dark:text-cyan-400">
                    {dimm.sizeGb} GB {dimm.type}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Fabricante</span>
                    <strong className="text-slate-700 dark:text-slate-200">{dimm.manufacturer}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Modelo</span>
                    <strong className="text-slate-700 dark:text-slate-200 truncate max-w-[130px]">{dimm.model}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Velocidade</span>
                    <strong className="text-blue-600 dark:text-cyan-400">{dimm.speedMts} MT/s</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Voltagem</span>
                    <strong className="text-amber-500">{dimm.voltageVolts.toFixed(2)} V</strong>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
