import React from 'react';
import { Layers } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const MemoriaTab: React.FC = () => {
  const { dimms } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Gestão de Memória
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
          Visualização dos pentes instalados via dmidecode, velocidade MT/s, voltagem e slots disponíveis
        </p>
      </div>

      {/* Top Main Memory Bar Card */}
      <div className="bg-white dark:bg-[#141b29] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-6">
        {/* Circular indicator */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="88" height="88" className="transform -rotate-90">
            <circle cx="44" cy="44" r="36" stroke="#e2e8f0" strokeWidth="6" fill="none" className="dark:stroke-slate-800" />
            <circle
              cx="44"
              cy="44"
              r="36"
              stroke="#10b981"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 36}
              strokeDashoffset={2 * Math.PI * 36 * (1 - 0.1)}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-center">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">10%</span>
            <span className="text-[9px] text-slate-400">RAM</span>
          </div>
        </div>

        {/* Big numbers & bar */}
        <div className="flex-1 w-full space-y-3">
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            6.3 <span className="text-lg font-normal text-slate-400">/ 62.8 GB</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '10%' }} />
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
              <strong className="text-sm text-blue-600 dark:text-blue-400">4/8</strong>
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
                className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 flex items-center justify-center text-xs font-mono text-slate-400 dark:text-slate-500 min-h-[140px]"
              >
                Slot vazio
              </div>
            ) : (
              <div
                key={dimm.slot}
                className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 min-h-[140px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs font-mono text-slate-800 dark:text-slate-100">
                    {dimm.slot}
                  </span>
                  <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                    {dimm.sizeGb} GB {dimm.type}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Fabricante</span>
                    <strong className="text-slate-700 dark:text-slate-300">{dimm.manufacturer}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Modelo</span>
                    <strong className="text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{dimm.model}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Velocidade</span>
                    <strong className="text-blue-600 dark:text-blue-400">{dimm.speedMts} MT/s</strong>
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
