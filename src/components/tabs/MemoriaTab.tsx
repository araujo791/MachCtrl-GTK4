import React from 'react';
import { Layers } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const MemoriaTab: React.FC = () => {
  const { dimms } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Gestão de Memória RAM
        </h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          Visualização dos pentes instalados via dmidecode, velocidade MT/s, voltagem e slots disponíveis
        </p>
      </div>

      {/* Top Main Memory Bar Card */}
      <div className="glass-card rounded-[30px] p-6 border border-white/10 flex flex-col md:flex-row items-center gap-6">
        {/* Circular indicator */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="100" height="100" className="transform -rotate-90">
            <circle cx="50" cy="50" r="40" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="8" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#10b981"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - 0.43)}
              strokeLinecap="round"
              fill="none"
              style={{ filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.6))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-center">
            <span className="text-base font-extrabold text-white leading-tight">43%</span>
            <span className="text-[10px] text-white/40 uppercase">Uso</span>
          </div>
        </div>

        {/* Big numbers & bar */}
        <div className="flex-1 w-full space-y-3">
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
            3.3 <span className="text-lg font-normal text-white/40">/ 7.7 GB Total</span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full shadow-xs shadow-emerald-500/50" style={{ width: '43%' }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pt-1 text-white/70">
            <div>
              <span className="text-[10px] text-white/40 block uppercase">Total</span>
              <strong className="text-sm text-white">7.7 GB</strong>
            </div>
            <div>
              <span className="text-[10px] text-white/40 block uppercase">Usado</span>
              <strong className="text-sm text-emerald-400">3.3 GB</strong>
            </div>
            <div>
              <span className="text-[10px] text-white/40 block uppercase">Livre</span>
              <strong className="text-sm text-white">4.4 GB</strong>
            </div>
            <div>
              <span className="text-[10px] text-white/40 block uppercase">Slots</span>
              <strong className="text-sm text-cyan-400">1/2</strong>
            </div>
          </div>
        </div>
      </div>

      {/* PENTES INSTALADOS Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">
          PENTES INSTALADOS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dimms.map((dimm, i) =>
            dimm.isEmpty ? (
              <div
                key={i}
                className="rounded-[28px] border-2 border-dashed border-white/10 p-6 flex items-center justify-center text-xs font-mono text-white/30 min-h-[150px]"
              >
                Slot vazio
              </div>
            ) : (
              <div
                key={dimm.slot}
                className="glass-card rounded-[28px] p-5 border border-white/10 flex flex-col justify-between space-y-3 min-h-[150px] hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs font-mono text-white">
                    {dimm.slot}
                  </span>
                  <span className="text-xs font-bold font-mono text-cyan-400">
                    {dimm.sizeGb} GB {dimm.type}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-white/60">
                  <div className="flex justify-between">
                    <span>Fabricante</span>
                    <strong className="text-white">{dimm.manufacturer}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Modelo</span>
                    <strong className="text-white truncate max-w-[130px]">{dimm.model}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Velocidade</span>
                    <strong className="text-cyan-400">{dimm.speedMts} MT/s</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Voltagem</span>
                    <strong className="text-amber-400">{dimm.voltageVolts.toFixed(2)} V</strong>
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
