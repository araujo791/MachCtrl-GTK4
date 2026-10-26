import React from 'react';
import { HardDrive, ArrowDown, ArrowUp } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const DiscosTab: React.FC = () => {
  const { disks } = useMachCtrl();

  const renderSmallWave = (data: number[], color: string) => {
    const width = 140;
    const height = 20;
    const maxVal = Math.max(1, Math.max(...data));
    const pts = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - (val / maxVal) * (height - 4) - 2;
      return { x, y };
    });
    const pathD = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 1px 4px ${color}55)` }}
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Métricas de Armazenamento (Discos)
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
          Taxa de leitura e escrita em tempo real, capacidade total e sistemas de arquivos (F2FS, BTRFS, NTFS3, etc.)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {disks.map((disk) => {
          const isNvme = disk.mediaType === 'NVMe';
          const isSsd = disk.mediaType === 'SSD';

          const badgeClass = isNvme
            ? 'bg-blue-500/15 text-blue-600 dark:text-cyan-400 border border-blue-400/30'
            : isSsd
            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30'
            : 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-400/30';

          const barColor = isNvme ? 'bg-blue-500' : isSsd ? 'bg-cyan-500' : 'bg-orange-500';

          return (
            <div
              key={disk.id}
              className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col justify-between space-y-3.5 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300"
            >
              {/* Header: Badge + Name + % Usage */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md uppercase ${badgeClass}`}>
                      {disk.mediaType}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {disk.name}
                    </h3>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {disk.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{disk.device} · {disk.fsType}</span>
                  <span>{disk.usedGb.toFixed(1)}/{disk.totalGb.toFixed(1)} GB</span>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden p-0.2">
                  <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${disk.usagePercent}%` }} />
                </div>
              </div>

              {/* Read / Write Stats & Waves */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <ArrowDown className="w-3 h-3 text-emerald-500" /> Leitura
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {disk.readMb.toFixed(1)} MB/s
                    </span>
                    {renderSmallWave(disk.readHistory, '#10b981')}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <ArrowUp className="w-3 h-3 text-orange-500" /> Escrita
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-600 dark:text-orange-400 font-bold">
                      {disk.writeMb.toFixed(1)} MB/s
                    </span>
                    {renderSmallWave(disk.writeHistory, '#f97316')}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
