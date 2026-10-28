import React from 'react';
import { HardDrive, ArrowDown, ArrowUp } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const DiscosTab: React.FC = () => {
  const { disks, t } = useMachCtrl();

  const renderSmallWave = (data: number[], color: string) => {
    if (data.length < 2) return <svg width={140} height={20} />;
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
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6 page-root animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {t('Armazenamento & Discos')}
        </h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          {t('Taxa de leitura e escrita em tempo real, capacidade total e sistemas de arquivos (F2FS, BTRFS, EXT4, etc.)')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {disks.map((disk) => {
          const isNvme = disk.mediaType === 'NVMe';
          const isSsd = disk.mediaType === 'SSD';
          const isUsb = disk.mediaType === 'USB';

          const badgeClass = isNvme
            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            : isSsd
            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
            : isUsb
            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
            : 'bg-orange-500/15 text-orange-400 border border-orange-500/30';

          const barColor = isNvme
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/50'
            : isSsd
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/50'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/50';

          return (
            <div
              key={disk.id}
              className="glass-card rounded-[28px] p-5.5 border border-white/10 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all duration-300"
            >
              {/* Header: Badge + Name + % Usage */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${badgeClass}`}>
                      {disk.mediaType}
                    </span>
                    <h3 className="font-bold text-sm text-white truncate" title={disk.mountPoint}>
                      {disk.name}
                    </h3>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-white">
                      {disk.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-white/45">
                  <span>{disk.device} · {disk.fsType}</span>
                  <span>{disk.usedGb.toFixed(1)}/{disk.totalGb.toFixed(1)} GB</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5">
                  <div className={`h-full rounded-full shadow-xs ${barColor}`} style={{ width: `${disk.usagePercent}%` }} />
                </div>
              </div>

              {/* Read / Write Stats & Waves */}
              <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-white/45 flex items-center gap-1.5 text-[11px]">
                    <ArrowDown className="w-3.5 h-3.5 text-emerald-400" /> {t('Leitura')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">
                      {disk.readMb.toFixed(1)} MB/s
                    </span>
                    {renderSmallWave(disk.readHistory, '#10b981')}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/45 flex items-center gap-1.5 text-[11px]">
                    <ArrowUp className="w-3.5 h-3.5 text-orange-400" /> {t('Escrita')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-bold">
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
