import React from 'react';
import { Cpu, MonitorPlay } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

const tone = (c: number) => (c >= 85 ? 'text-rose-400' : c >= 70 ? 'text-orange-400' : 'text-emerald-400');

/** Temperaturas ao vivo (cada CPU detectada + GPU) no cabeçalho fixo de todas as telas. */
export const StatPills: React.FC = () => {
  const { snap, sockets } = useMachCtrl();
  if (!snap) return null;

  const items: { key: string; label: string; icon: React.ReactNode; temp: number | null; color: string }[] = [];
  if (sockets.length > 0) {
    sockets.forEach((s) =>
      items.push({
        key: `cpu${s.id}`,
        label: sockets.length > 1 ? `CPU ${s.id}` : 'CPU',
        icon: <Cpu className="w-3 h-3" />,
        temp: s.tempAvg,
        color: 'text-cyan-400',
      }),
    );
  } else {
    items.push({ key: 'cpu', label: 'CPU', icon: <Cpu className="w-3 h-3" />, temp: snap.cpu_temp_c || null, color: 'text-cyan-400' });
  }
  snap.gpus.forEach((g, i) =>
    items.push({
      key: `gpu${i}`,
      label: snap.gpus.length > 1 ? `GPU ${i}` : 'GPU',
      icon: <MonitorPlay className="w-3 h-3" />,
      temp: g.temp_c ?? null,
      color: 'text-purple-400',
    }),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 glass-card rounded-xl border border-white/10">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
          <div className={`w-5 h-5 rounded-full bg-white/10 flex items-center justify-center ${it.color}`}>{it.icon}</div>
          <div>
            <span className="text-[9px] text-white/50 block leading-none">{it.label}</span>
            <span className={`text-[11px] font-bold font-mono leading-tight ${it.temp != null && it.temp > 0 ? tone(it.temp) : 'text-white/40'}`}>
              {it.temp != null && it.temp > 0 ? `${it.temp.toFixed(0)}°C` : '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
