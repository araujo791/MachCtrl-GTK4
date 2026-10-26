import React from 'react';
import {
  Cpu,
  Layers,
  Battery,
  Activity,
  ArrowDown,
  ArrowUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const OverviewTab: React.FC = () => {
  const { isLaptop, topProcesses, networks, battery } = useMachCtrl();

  // Helper for ultra-smooth spline SVG wave with soft ambient glow
  const renderWave = (data: number[], color: string, height = 40, maxVal = 100) => {
    const width = 240;
    const pts = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - (val / maxVal) * (height - 8) - 4;
      return { x, y };
    });

    const pathD = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id={`glowGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${width} ${height} L 0 ${height} Z`} fill={`url(#glowGrad-${color.replace('#', '')})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 2px 6px ${color}55)` }}
        />
      </svg>
    );
  };

  const cpuData = [12, 16, 14, 18, 22, 19, 15, 17, 13, 9];
  const memData = [43, 43, 44, 43, 43, 44, 43, 43, 43, 43];
  const gpuData = [10, 35, 20, 55, 75, 25, 60, 20, 65, 30, 20];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Title & Platform Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {isLaptop ? 'Inspiron 5552 (1.8.2)' : 'MACHINIST E5-D8-MAX'}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
          {isLaptop
            ? 'CachyOS · Kernel 7.2.7-1-cachyos · Detecção automática de laptop'
            : 'CachyOS · Kernel 7.2.9-1-cachyos · Detecção automática de workstation'}
        </p>
      </div>

      {/* Machine Specs Card - Glassmorphism */}
      <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 sm:p-6 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              PROCESSADOR
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              Intel(R) Pentium(R) CPU N3710 @ 1.60GHz
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              MEMÓRIA
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
              8 GB RAM
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              PLACA-MÃE
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              Dell Inc. 0V89PH
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              GPU
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
              Intel Graphics
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              ARMAZENAMENTO
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
              932 GB
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              BIOS
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              Dell Inc. 03/05/2018
            </span>
          </div>
        </div>
      </div>

      {/* Main 4 Telemetry Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CPU */}
        <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col justify-between hover:border-blue-500/30 transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-cyan-400/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center border border-blue-400/30 shadow-xs">
                  <Cpu className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  CPU
                </span>
              </div>
            </div>

            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-1">
              9 <span className="text-base font-normal text-slate-400">%</span>
            </div>

            <div className="my-2 h-11">{renderWave(cpuData, '#3b82f6')}</div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <div className="truncate text-slate-700 dark:text-slate-300 font-medium">
              Intel(R) Pentium(R) CPU N3710 @ 1.60GHz
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>núcleos: <strong className="text-slate-800 dark:text-slate-200">4</strong></div>
              <div>Threads: <strong className="text-slate-800 dark:text-slate-200">4</strong></div>
              <div>Temp: <strong className="text-emerald-500 font-bold">48°C</strong></div>
              <div>Freq: <strong className="text-slate-800 dark:text-slate-200">1.68 GHz</strong></div>
            </div>
          </div>
        </div>

        {/* Card 2: MEMÓRIA */}
        <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-400/30 shadow-xs">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  MEMÓRIA
                </span>
              </div>
            </div>

            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-1">
              43 <span className="text-base font-normal text-slate-400">%</span>
            </div>

            <div className="my-2 h-11">{renderWave(memData, '#10b981')}</div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                Em uso: <strong className="text-emerald-600 dark:text-emerald-400 block text-xs">3.3 GB</strong>
              </div>
              <div>
                Livre: <strong className="text-slate-800 dark:text-slate-200 block text-xs">4.3 GB</strong>
              </div>
            </div>
            <div className="pt-1 text-[11px]">
              Total: <strong className="text-slate-800 dark:text-slate-200">7.7 GB</strong>
            </div>
          </div>
        </div>

        {/* Card 3: BATERIA */}
        <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col justify-between hover:border-teal-500/30 transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-cyan-400/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-400/30 shadow-xs">
                  <Battery className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  BATERIA
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                NA TOMADA
              </span>
            </div>

            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-1">
              {battery.percent} <span className="text-base font-normal text-slate-400">%</span>
            </div>

            {/* Glowing Smooth Progress Bar */}
            <div className="my-3 w-full bg-slate-100 dark:bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full shadow-xs" style={{ width: `${battery.percent}%` }} />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <div className="text-slate-600 dark:text-slate-300 font-medium">
              {battery.stateText}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>Saúde da bateria: <strong className="text-amber-500 block">{battery.healthPercent}%</strong></div>
              <div>Tensão: <strong className="text-slate-800 dark:text-slate-200 block">{battery.voltage} V</strong></div>
            </div>
          </div>
        </div>

        {/* Card 4: GPU */}
        <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-pink-400/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-400/30 shadow-xs">
                  <Activity className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  GPU
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                INTEL
              </span>
            </div>

            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-1">
              200 <span className="text-base font-normal text-slate-400">MHz</span>
            </div>

            <div className="my-2 h-11">{renderWave(gpuData, '#a855f7')}</div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <div className="text-slate-700 dark:text-slate-300 font-medium">
              Intel Graphics
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>Temp: <strong className="text-emerald-500 font-bold">—</strong></div>
              <div>Freq. máx: <strong className="text-slate-800 dark:text-slate-200">700 MHz</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: TOP PROCESSOS (RAM) + REDE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* TOP PROCESSOS (RAM) - 2 cols */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 sm:p-6 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              TOP PROCESSOS (RAM)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Tempo real</span>
          </div>

          <div className="space-y-3 pt-1">
            {topProcesses.map((proc, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-24 text-right text-slate-600 dark:text-slate-300 font-medium truncate">
                  {proc.name}
                </span>
                <div className="flex-1 bg-slate-100/80 dark:bg-white/5 rounded-full h-5 overflow-hidden p-0.5">
                  <div
                    className="h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2 text-[10px] font-bold text-white shadow-xs"
                    style={{
                      width: `${Math.max(12, proc.ramPercent * 3.5)}%`,
                      backgroundColor: proc.color,
                      boxShadow: `0 2px 8px ${proc.color}44`,
                    }}
                  >
                    <span>{proc.ramMb} MB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* REDE - 1 col */}
        <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 sm:p-6 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              REDE
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Tráfego de E/S</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {networks.map((net) => (
              <div key={net.name} className="p-3.5 bg-slate-50/80 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-2">
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {net.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-blue-500" /> DOWNLOAD
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-cyan-400">
                      {net.downloadKb} KB/s
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-emerald-500" /> UPLOAD
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {net.uploadKb} KB/s
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
