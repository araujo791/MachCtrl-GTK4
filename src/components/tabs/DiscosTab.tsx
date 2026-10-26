import React from 'react';
import { HardDrive, ArrowDown, ArrowUp } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const DiscosTab: React.FC = () => {
  const { disks } = useMachCtrl();

  const renderSmallWave = (data: number[], color: string) => {
    const width = 140;
    const height = 18;
    const maxVal = Math.max(1, Math.max(...data));
    const pts = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - (val / maxVal) * (height - 4) - 2;
      return `${x},${y}`;
    });
    const pathD = pts.reduce((acc, p, i) => (i === 0 ? `M ${p}` : `${acc} L ${p}`), '');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Métricas de Armazenamento (Discos)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
          Taxa de leitura e escrita em tempo real, capacidade total e sistemas de arquivos (F2FS, BTRFS, NTFS3, etc.)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {disks.map((disk) => {
          const isNvme = disk.mediaType === 'NVMe';
          const isSsd = disk.mediaType === 'SSD';

          const badgeClass = isNvme
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
            : isSsd
            ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300'
            : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';

          const barColor = isNvme ? 'bg-blue-500' : isSsd ? 'bg-cyan-500' : 'bg-orange-500';

          return (
            <div
              key={disk.id}
              className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3.5 hover:shadow-md transition-shadow"
            >
              {/* Header: Badge + Name + % Usage */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${badgeClass}`}>
                      {disk.mediaType}
                    </span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {disk.name}
                    </h3>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {disk.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{disk.device} · {disk.fsType}</span>
                  <span>{disk.usedGb.toFixed(1)}/{disk.totalGb.toFixed(1)} GB</span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${disk.usagePercent}%` }} />
                </div>
              </div>

              {/* Read / Write Stats & Waves */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs font-mono">
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
