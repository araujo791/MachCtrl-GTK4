import React from 'react';
import { Cpu, Layers, Zap, Fan } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

/** Resumo ao vivo (CPUs, RAM, temperatura, fans) exibido no cabeçalho fixo de todas as telas. */
export const StatPills: React.FC = () => {
  const { snap, fans, sockets, t } = useMachCtrl();
  if (!snap) return null;
  const cpuT = Math.max(0, ...snap.sockets.map((k) => k.package_temp_c || 0), snap.cpu_temp_c || 0);
  const tempLabel = cpuT <= 0 ? '—' : `${cpuT.toFixed(0)}°C (${cpuT < 70 ? t('Normal') : cpuT < 85 ? t('Morno') : t('Quente')})`;
  const tempColor = cpuT >= 85 ? 'text-rose-400' : cpuT >= 70 ? 'text-orange-400' : 'text-amber-400';
  const maxRpm = Math.max(0, ...fans.map((f) => f.rpm));
  return (
    <div className="flex flex-wrap items-center gap-2.5 p-1.5 glass-card rounded-2xl border border-white/10">
    {sockets.length > 1 ? sockets.map((s) => (
      <div key={s.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-cyan-400"><Cpu className="w-3.5 h-3.5" /></div>
        <div>
          <span className="text-[10px] text-white/50 block leading-tight">CPU {s.id}</span>
          <span className="text-xs font-bold text-white font-mono">{s.usageAvg}% · {s.freqGhz.toFixed(2)} GHz</span>
        </div>
      </div>
    )) : (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-cyan-400"><Cpu className="w-3.5 h-3.5" /></div>
        <div>
          <span className="text-[10px] text-white/50 block leading-tight">{t('CPU Global')}</span>
          <span className="text-xs font-bold text-white font-mono">{snap.cpu_usage.toFixed(0)}% · {(snap.cpu_freq_mhz / 1000).toFixed(2)} GHz</span>
        </div>
      </div>
    )}
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-emerald-400"><Layers className="w-3.5 h-3.5" /></div>
      <div>
        <span className="text-[10px] text-white/50 block leading-tight">{t('Memória RAM')}</span>
        <span className="text-xs font-bold text-white font-mono">{snap.mem_used_gb.toFixed(1)} / {snap.mem_total_gb.toFixed(1)} GB</span>
      </div>
    </div>
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-amber-400"><Zap className="w-3.5 h-3.5" /></div>
      <div>
        <span className="text-[10px] text-white/50 block leading-tight">{t('Temperatura')}</span>
        <span className={`text-xs font-bold font-mono ${tempColor}`}>{tempLabel}</span>
      </div>
    </div>
    {fans.length > 0 && (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-purple-400"><Fan className="w-3.5 h-3.5" /></div>
        <div>
          <span className="text-[10px] text-white/50 block leading-tight">{t('Fans PWM')}</span>
          <span className="text-xs font-bold text-white font-mono">{maxRpm} RPM</span>
        </div>
      </div>
    )}
  </div>
  );
};
