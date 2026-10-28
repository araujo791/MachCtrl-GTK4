import React from 'react';
import { Cpu, Layers, Battery, ArrowDown, ArrowUp, Zap, Fan, MonitorPlay } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';
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

  const cpuT = Math.max(0, ...snap.sockets.map((k) => k.package_temp_c || 0), snap.cpu_temp_c || 0);
  const tempLabel = cpuT <= 0 ? '—' : `${cpuT.toFixed(0)}°C (${cpuT < 70 ? t('Normal') : cpuT < 85 ? t('Morno') : t('Quente')})`;
  const tempColor = cpuT >= 85 ? 'text-rose-400' : cpuT >= 70 ? 'text-orange-400' : 'text-amber-400';
  const maxRpm = Math.max(0, ...fans.map((f) => f.rpm));
  const cores = sockets.reduce((a, s) => a + s.cores, 0);
  const threads = sockets.reduce((a, s) => a + s.threads, 0);
  const peak = Math.round(Math.max(0, ...hist.cpu));
  const chartMax = Math.max(20, Math.ceil(Math.max(peak, ...hist.ram, 0) / 10) * 10);
  const cpuCurve = splinePath(hist.cpu, chartMax);
  const ramCurve = splinePath(hist.ram, chartMax);
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Gráfico em tempo real */}
        <div className="lg:col-span-2 glass-card rounded-[30px] p-6 border border-white/10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-10 right-10 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">{t('Uso da CPU')}</h3>
              <p className="text-xs text-white/50 mt-0.5">{sysInfo?.cpu_model}</p>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-white font-mono">60s · 0–{chartMax}%</div>
          </div>

          <div className="flex items-center gap-5 text-xs mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff782d] shadow-xs shadow-orange-500/50" />
              <span className="text-white/80 font-medium">{t('Uso da CPU')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/50" />
              <span className="text-white/60">{t('Memória RAM')}</span>
            </div>
          </div>

          <div className="relative py-4 my-auto">
            {cpuCurve.last && (
              <div
                className="absolute top-2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
                style={{ left: '92%' }}
              >
                <div className="keep-white px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono font-bold shadow-xl whitespace-nowrap">
                  {cpuT > 0 ? `${cpuT.toFixed(0)}°C · ` : ''}{t('Pico')} {peak}%
                </div>
                <div className="w-2 h-2 rounded-full bg-white ring-4 ring-[#ff782d] shadow-lg mt-1" />
              </div>
            )}

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56 overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="orangeGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff782d" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ff782d" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {ramCurve.line && (
                <path d={ramCurve.line} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
              )}
              {cpuCurve.area && <path d={cpuCurve.area} fill="url(#orangeGlow)" />}
              {cpuCurve.line && (
                <path
                  d={cpuCurve.line}
                  fill="none"
                  stroke="#ff782d"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(255, 120, 45, 0.6))' }}
                />
              )}
            </svg>

            <div className="flex justify-between text-[11px] font-mono text-white/40 pt-2 border-t border-white/5">
              {['60s', '50s', '40s', '30s', '20s', '10s', '0s'].map((l) => <span key={l}>{l}</span>)}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs font-mono">
            <div>
              <span className="text-[10px] text-white/40 uppercase block">{t('Núcleos')}</span>
              <span className="font-bold text-white mt-0.5 block">{cores} / {threads} {t('Threads')}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">{t('Frequência')}</span>
              <span className="font-bold text-cyan-400 mt-0.5 block">{(snap.cpu_freq_mhz / 1000).toFixed(2)} GHz</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">{t('Pico')}</span>
              <span className="font-bold text-white mt-0.5 block">{peak}%</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">{t('Temperatura')}</span>
              <span className={`font-bold mt-0.5 block ${tempColor}`}>{cpuT > 0 ? `${cpuT.toFixed(0)}°C` : '—'}</span>
            </div>
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

            <div className="flex items-center justify-between my-4">
              <div>
                <span className="text-xs text-white/50 block">{t('Usado')}</span>
                <span className="text-2xl font-extrabold text-white font-mono">{snap.mem_used_gb.toFixed(1)} GB</span>
                <div className="w-24 h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${memPct}%` }} />
                </div>
              </div>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#f97316" strokeWidth="10"
                    strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - memPct / 100)} strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-lg font-bold font-mono">{memPct.toFixed(0)}%</span>
                  <span className="text-[9px] text-white/50 uppercase">{t('Uso')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-white/40">{t('Livre')}:</span>{' '}
                <strong className="text-white">{(snap.mem_total_gb - snap.mem_used_gb).toFixed(1)} GB</strong>
              </div>
              <div>
                <span className="text-[10px] text-white/40">{t('Total')}:</span>{' '}
                <strong className="text-white">{snap.mem_total_gb.toFixed(1)} GB</strong>
              </div>
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
              <div key={net.name} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
