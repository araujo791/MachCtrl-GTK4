import React from 'react';
import { Cpu, Layers, Battery, ArrowDown, ArrowUp, Zap, Fan, MonitorPlay } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';
import { StatPills } from '../StatPills';
import { BatteryInfo } from '../../types/machctrl';

const W = 600, H = 180;

// Curva suave (Catmull-Rom → Bézier) para uma série 0..100.
function splinePath(data: number[], max = 100): { line: string; area: string; last: { x: number; y: number } | null } {
  if (data.length < 2) return { line: '', area: '', last: null };
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - 10 - (Math.min(v, max) / max) * (H - 30) }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  const last = pts[pts.length - 1];
  return { line: d, area: `${d} L ${last.x} ${H} L 0 ${H} Z`, last };
}

function NetCard({ net, t }: { net: { name: string; downloadKb: number; uploadKb: number; historyDown: number[]; historyUp: number[] }; t: (s: string) => string }) {
  const max = Math.max(10, ...net.historyDown, ...net.historyUp) * 1.15;
  const down = splinePath(net.historyDown, max);
  const up = splinePath(net.historyUp, max);
  const gd = `nd-${net.name}`, gu = `nu-${net.name}`;
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
      <div className="text-xs font-mono font-bold text-white">{net.name}</div>
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div>
          <span className="text-[10px] text-white/45 flex items-center gap-1"><ArrowDown className="w-3 h-3 text-cyan-400" /> {t('Download').toUpperCase()}</span>
          <span className="text-sm font-bold text-cyan-400">{net.downloadKb.toFixed(0)} KB/s</span>
        </div>
        <div>
          <span className="text-[10px] text-white/45 flex items-center gap-1"><ArrowUp className="w-3 h-3 text-emerald-400" /> {t('Upload').toUpperCase()}</span>
          <span className="text-sm font-bold text-emerald-400">{net.uploadKb.toFixed(0)} KB/s</span>
        </div>
      </div>
      <div className="h-14 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gd} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.30" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient>
            <linearGradient id={gu} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity="0.25" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient>
          </defs>
          {down.area && <path d={down.area} fill={`url(#${gd})`} />}
          {up.area && <path d={up.area} fill={`url(#${gu})`} />}
          {down.line && <path d={down.line} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          {up.line && <path d={up.line} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
      </div>
    </div>
  );
}

function batteryStatusText(b: BatteryInfo, t: (s: string) => string): string {
  if (b.status === 'charging') return t('Carregando');
  if (b.status === 'full') return t('Carga completa');
  if (b.status === 'discharging') return t('Descarregando');
  return b.ac_online ? t('Na tomada') : t('Bateria');
}

export const OverviewTab: React.FC = () => {
  const { snap, sysInfo, hist, topProcesses, networks, battery, fans, sockets, t } = useMachCtrl();

  if (!snap) {
    return <div className="text-sm font-mono text-white/50 p-6">{t('Lendo sensores…')}</div>;
  }

  const cores = sockets.reduce((a, s) => a + s.cores, 0);
  const threads = sockets.reduce((a, s) => a + s.threads, 0);
  const memPct = snap.mem_pct;
  const gpu = snap.gpus[0];
  const gpuLoad = gpu?.usage_pct ?? (gpu?.freq_mhz != null && gpu?.freq_max_mhz ? (gpu.freq_mhz / gpu.freq_max_mhz) * 100 : null);
  const product = sysInfo ? [sysInfo.product_name, sysInfo.distro, `Kernel ${sysInfo.kernel}`].filter(Boolean).join(' · ') : '';

  return (
    <div className="space-y-5 page-root animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            {t('Meu Dashboard')}
          </h2>
          <p className="text-xs text-white/50 font-mono mt-0.5">{product}</p>
        </div>

        <StatPills />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Processadores: uso em tempo real por CPU */}
        <div className="lg:col-span-2 glass-card rounded-[30px] p-6 border border-white/10 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -bottom-10 right-10 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex items-center justify-between relative">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">{t('Processadores')}</h3>
              <p className="text-xs text-white/50 mt-0.5">{cores} {t('núcleos')} / {threads} {t('threads')}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4 relative">
            {sockets.map((s) => {
              const h = hist.sock[s.id] ?? [];
              const pk = Math.max(0, ...h);
              const curve = splinePath(h, Math.max(25, Math.ceil((pk * 1.4) / 5) * 5));
              const gid = `cpuGlow${s.id}`;
              return (
                <div key={s.id} className="flex-1 min-h-[150px] p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-cyan-400/20 text-cyan-400 border border-cyan-400/30 flex flex-col items-center justify-center font-mono font-bold leading-none">
                        <span className="text-[8px] text-white/60">CPU</span>
                        <span className="text-sm">{s.id}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate" title={s.model}>{s.model}</div>
                        <div className="text-[11px] font-mono text-white/50">{s.cores} {t('núcleos')} · {s.threads} {t('threads')} · {s.freqGhz.toFixed(2)} GHz</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 font-mono text-right shrink-0">
                      <div>
                        <span className="text-[10px] text-white/40 uppercase block">{t('Uso')}</span>
                        <span className="text-lg font-extrabold text-cyan-400">{s.usageAvg}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 uppercase block">{t('Temperatura')}</span>
                        <span className="text-lg font-extrabold text-emerald-400">{s.tempAvg != null ? `${s.tempAvg.toFixed(0)}°C` : '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[70px] relative">
                    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff782d" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#ff782d" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {curve.area && <path d={curve.area} fill={`url(#${gid})`} />}
                      {curve.line && (
                        <path d={curve.line} fill="none" stroke="#ff782d" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                          style={{ filter: 'drop-shadow(0 4px 10px rgba(255, 120, 45, 0.55))' }} />
                      )}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna direita */}
        <div className="gap-5 flex flex-col">
          <div className="glass-card rounded-[30px] p-6 border border-white/10 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base">{t('Memória RAM')}</h4>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-bold">
                {snap.mem_total_gb.toFixed(1)} GB
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 my-4">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-white/50 block">{t('Usado')}</span>
                <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-extrabold text-white">{snap.mem_used_gb.toFixed(1)} GB</span>
                  <span className="text-xs text-white/55">{t('em uso')} / {(snap.mem_total_gb - snap.mem_used_gb).toFixed(1)} GB {t('livre')}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mt-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${memPct}%` }} />
                </div>
              </div>
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#f97316" strokeWidth="10"
                    strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - memPct / 100)} strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-lg font-bold">{memPct.toFixed(0)}%</span>
                  <span className="text-[10px] text-white/50">{t('usado')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/5 text-xs font-mono">
              <span className="text-[10px] text-white/40 mr-1.5">{t('Total')}:</span>
              <strong className="text-white">{snap.mem_total_gb.toFixed(1)} GB</strong>
            </div>
          </div>

          {battery && (
            <div className="glass-card rounded-[30px] p-6 border border-white/10 flex flex-col justify-between flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Battery className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{t('Bateria')}</h4>
                    <span className="text-[11px] text-emerald-400 font-medium">{batteryStatusText(battery, t)}</span>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono text-white">{battery.percent.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 my-4 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full shadow-xs bg-gradient-to-r ${battery.percent < 20 ? 'from-rose-500 to-red-400' : 'from-emerald-500 to-teal-400'}`}
                  style={{ width: `${battery.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-white/60">
                {battery.health_pct != null && <span>{t('Saúde')}: <strong className="text-amber-400">{battery.health_pct.toFixed(0)}%</strong></span>}
                {battery.voltage_v != null && <span>{t('Tensão')}: <strong className="text-white">{battery.voltage_v.toFixed(2)} V</strong></span>}
              </div>
            </div>
          )}

          {gpu && (
            <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-3 flex-1 flex flex-col justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <MonitorPlay className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-sm">{t('Placa de vídeo')}</h4>
                  <span className="text-[11px] text-white/50 truncate block">{gpu.name}</span>
                </div>
              </div>
              {gpuLoad != null && (
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full" style={{ width: `${Math.min(100, gpuLoad)}%` }} />
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-white/60">
                {gpu.usage_pct != null && <span>{t('Uso')}: <strong className="text-white">{gpu.usage_pct.toFixed(0)}%</strong></span>}
                {gpu.freq_mhz != null && <span>{t('Frequência')}: <strong className="text-white">{gpu.freq_mhz.toFixed(0)} MHz</strong></span>}
                {gpu.temp_c != null && <span>{t('Temperatura')}: <strong className="text-white">{gpu.temp_c.toFixed(0)}°C</strong></span>}
                {gpu.vram_total_mb != null && gpu.vram_used_mb != null && (
                  <span>{t('VRAM')}: <strong className="text-white">{(gpu.vram_used_mb / 1024).toFixed(1)}/{(gpu.vram_total_mb / 1024).toFixed(1)} GB</strong></span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div className="lg:col-span-2 glass-card rounded-[30px] p-6 border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">{t('Top processos (RAM)')}</h3>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70 font-mono">/proc</span>
          </div>
          <div className="flex-1 flex flex-col justify-around gap-3 pt-1">
            {topProcesses.map((proc) => {
              const max = Math.max(...topProcesses.map((p) => p.ramMb), 1);
              return (
                <div key={proc.pid} className="flex items-center gap-3 text-xs font-mono">
                  <span className="w-28 text-right text-white/80 font-medium truncate">{proc.name}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden p-0.5">
                    <div
                      className="keep-white h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2.5 text-[10px] font-bold text-white shadow-xs whitespace-nowrap"
                      style={{ width: `${Math.max(14, (proc.ramMb / max) * 100)}%`, backgroundColor: proc.color, boxShadow: `0 2px 10px ${proc.color}55` }}
                    >
                      <span>{proc.ramMb.toFixed(0)} MB</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">{t('Rede')}</h3>
          <div className="space-y-3 pt-1">
            {networks.length === 0 && <div className="text-xs font-mono text-white/40">{t('Nenhuma interface de rede ativa')}</div>}
            {[...networks].sort((a, b) => b.downloadKb + b.uploadKb - (a.downloadKb + a.uploadKb)).slice(0, 3).map((net) => (
              <NetCard key={net.name} net={net} t={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
