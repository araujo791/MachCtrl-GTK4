import React from 'react';
import {
  Cpu,
  Layers,
  Battery,
  Activity,
  ArrowDown,
  ArrowUp,
  HardDrive,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const OverviewTab: React.FC = () => {
  const { systemViewMode, topProcesses, networks, battery, sockets } = useMachCtrl();

  const isNotebook = systemViewMode === 'notebook';

  // Helper for responsive SVG wave
  const renderWave = (data: number[], color: string, height = 36, maxVal = 100) => {
    const width = 220;
    const pts = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - (val / maxVal) * (height - 6) - 3;
      return `${x},${y}`;
    });
    const pathD = pts.reduce((acc, p, i) => (i === 0 ? `M ${p}` : `${acc} L ${p}`), '');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${width} ${height} L 0 ${height} Z`} fill={`url(#grad-${color.replace('#', '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const cpuData = [14, 18, 12, 16, 22, 19, 15, 18, 14, 9];
  const memData = [44, 43, 43, 44, 43, 43, 43, 43, 43, 43];
  const gpuData = [10, 45, 20, 65, 80, 25, 60, 20, 70, 30, 20];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Title & Platform Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isNotebook ? 'Inspiron 5552 (1.8.2)' : 'MACHINIST E5-D8-MAX'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
          {isNotebook
            ? 'CachyOS · Kernel 7.2.7-1-cachyos · Instalado em 2026-09-29'
            : 'CachyOS · Kernel 7.2.9-1-cachyos · Instalado em 2026-10-08'}
        </p>
      </div>

      {/* Machine Specs Card */}
      <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              PROCESSADOR
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {isNotebook
                ? 'Intel(R) Pentium(R) CPU N3710 @ 1.60GHz'
                : 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              MEMÓRIA
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
              {isNotebook ? '8 GB RAM' : '63 GB RAM'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              PLACA-MÃE
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {isNotebook ? 'Dell Inc. 0V89PH' : 'MACHINIST E5-D8-MAX'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              GPU
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
              {isNotebook ? 'Intel Graphics' : 'AMD GPU'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              ARMAZENAMENTO
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
              {isNotebook ? '932 GB' : '12.3 TB'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              BIOS
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {isNotebook ? 'Dell Inc. 03/05/2018' : 'American Megatrends 12/20/2022'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 4 Telemetry Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CPU */}
        <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  CPU {isNotebook ? '' : '0'}
                </span>
              </div>
              {!isNotebook && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold">
                  SOCKET 0
                </span>
              )}
            </div>

            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-2">
              {isNotebook ? '9' : '1'} <span className="text-base font-normal text-slate-400">%</span>
            </div>

            <div className="my-2 h-10">{renderWave(cpuData, '#3b82f6')}</div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <div className="truncate text-slate-700 dark:text-slate-300 font-medium">
              {isNotebook
                ? 'Intel(R) Pentium(R) CPU N3710 @ 1.60GHz'
                : 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz'}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>núcleos: <strong className="text-slate-800 dark:text-slate-200">{isNotebook ? '4' : '14'}</strong></div>
              <div>Threads: <strong className="text-slate-800 dark:text-slate-200">{isNotebook ? '4' : '28'}</strong></div>
              <div>Temp: <strong className="text-emerald-500 font-bold">48°C</strong></div>
              <div>Freq: <strong className="text-slate-800 dark:text-slate-200">{isNotebook ? '1.68 GHz' : '2.89 GHz'}</strong></div>
            </div>
          </div>
        </div>

        {/* Card 2: MEMÓRIA */}
        <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  MEMÓRIA
                </span>
              </div>
            </div>

            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-2">
              {isNotebook ? '43' : '10'} <span className="text-base font-normal text-slate-400">%</span>
            </div>

            <div className="my-2 h-10">{renderWave(memData, '#10b981')}</div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                Em uso: <strong className="text-emerald-600 dark:text-emerald-400 block text-xs">{isNotebook ? '3.3 GB' : '6.1 GB'}</strong>
              </div>
              <div>
                Livre: <strong className="text-slate-800 dark:text-slate-200 block text-xs">{isNotebook ? '4.3 GB' : '56.7 GB'}</strong>
              </div>
            </div>
            <div className="pt-1 text-[11px]">
              Total: <strong className="text-slate-800 dark:text-slate-200">{isNotebook ? '7.7 GB' : '62.8 GB'}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: BATERIA (Notebook) ou CPU 1 (Xeon) */}
        {isNotebook ? (
          <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-500/20">
                    <Battery className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    BATERIA
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200/40">
                  NA TOMADA
                </span>
              </div>

              <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-2">
                {battery.percent} <span className="text-base font-normal text-slate-400">%</span>
              </div>

              {/* Solid Green Progress Bar */}
              <div className="my-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${battery.percent}%` }} />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
              <div className="text-slate-600 dark:text-slate-300 font-medium">
                {battery.stateText}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>Saúde da bateria: <strong className="text-amber-500 block">{battery.healthPercent}%</strong></div>
                <div>Tensão: <strong className="text-slate-800 dark:text-slate-200 block">{battery.voltage} V</strong></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    CPU 1
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold">
                  SOCKET 1
                </span>
              </div>

              <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-2">
                1 <span className="text-base font-normal text-slate-400">%</span>
              </div>

              <div className="my-2 h-10">{renderWave([10, 15, 12, 10, 8, 9, 8, 9, 10], '#3b82f6')}</div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
              <div className="truncate text-slate-700 dark:text-slate-300 font-medium">
                Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>núcleos: <strong className="text-slate-800 dark:text-slate-200">14</strong></div>
                <div>Threads: <strong className="text-slate-800 dark:text-slate-200">28</strong></div>
                <div>Temp: <strong className="text-emerald-500 font-bold">52°C</strong></div>
                <div>Freq: <strong className="text-slate-800 dark:text-slate-200">2.81 GHz</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: GPU */}
        <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-500/20">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  GPU
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold border border-purple-200/40">
                {isNotebook ? 'INTEL' : 'AMD'}
              </span>
            </div>

            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-2">
              {isNotebook ? '200' : '2'} <span className="text-base font-normal text-slate-400">{isNotebook ? 'MHz' : '%'}</span>
            </div>

            <div className="my-2 h-10">{renderWave(gpuData, '#a855f7')}</div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <div className="text-slate-700 dark:text-slate-300 font-medium">
              {isNotebook ? 'Intel Graphics' : 'AMD GPU'}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>Temp: <strong className="text-emerald-500 font-bold">{isNotebook ? '—' : '45°C'}</strong></div>
              <div>
                {isNotebook ? (
                  <>Freq. máx: <strong className="text-slate-800 dark:text-slate-200">700 MHz</strong></>
                ) : (
                  <>Fan: <strong className="text-slate-800 dark:text-slate-200">1104 RPM</strong></>
                )}
              </div>
            </div>
            {!isNotebook && (
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                VRAM: 0.9/4.0 GB (22%)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: TOP PROCESSOS (RAM) + REDE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* TOP PROCESSOS (RAM) - 2 cols */}
        <div className="lg:col-span-2 bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              TOP PROCESSOS (RAM)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Tempo real</span>
          </div>

          <div className="space-y-3">
            {topProcesses.map((proc, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-24 text-right text-slate-600 dark:text-slate-300 font-medium truncate">
                  {proc.name}
                </span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 rounded-full h-5.5 overflow-hidden p-0.5">
                  <div
                    className="h-4.5 rounded-full transition-all duration-700 flex items-center justify-end pr-2 text-[10px] font-bold text-white shadow-xs"
                    style={{
                      width: `${Math.max(12, proc.ramPercent * 3.5)}%`,
                      backgroundColor: proc.color,
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
        <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              REDE
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Tráfego de E/S</span>
          </div>

          <div className="space-y-4 pt-1">
            {networks.map((net) => (
              <div key={net.name} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/50 space-y-2">
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {net.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-blue-500" /> DOWNLOAD
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
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
