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
  Fan,
  ChevronDown,
  HardDrive,
} from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const OverviewTab: React.FC = () => {
  const { isLaptop, topProcesses, networks, battery, fans } = useMachCtrl();

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Top Header: Title + Telemetry Stat Pills Strip (Inspired by Kezabank Top Bar) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Meu Dashboard
          </h2>
          <p className="text-xs text-white/50 font-mono mt-0.5">
            {isLaptop
              ? 'Inspiron 5552 · CachyOS Kernel 7.2 · Detecção Automática (Notebook)'
              : 'MACHINIST E5-D8-MAX · CachyOS Kernel 7.2 · Detecção Automática (Workstation)'}
          </p>
        </div>

        {/* Top Summary Glass Pills (Total Balance / Earnings style in screenshot) */}
        <div className="flex flex-wrap items-center gap-2.5 p-1.5 glass-card rounded-2xl border border-white/10">
          {/* Metric 1 */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-cyan-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-white/50 block leading-tight">CPU Global</span>
              <span className="text-xs font-bold text-white font-mono">9% · 1.68 GHz</span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-emerald-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-white/50 block leading-tight">Memória RAM</span>
              <span className="text-xs font-bold text-white font-mono">3.3 / 7.7 GB</span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-amber-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-white/50 block leading-tight">Temperatura</span>
              <span className="text-xs font-bold text-amber-400 font-mono">48°C (Normal)</span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-purple-400">
              <Fan className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-white/50 block leading-tight">Fans PWM</span>
              <span className="text-xs font-bold text-white font-mono">
                {fans[0]?.rpm || 1850} RPM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Statistic Wave Chart + Right Column Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Main Statistic Chart (Faithful recreation of orange wave in screenshot) */}
        <div className="lg:col-span-2 glass-card rounded-[30px] p-6 border border-white/10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle warm orange ambient flare inside the card */}
          <div className="absolute -bottom-10 right-10 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Card Header with Dropdown */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Estatísticas em Tempo Real
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Monitoramento contínuo de carga e telemetria CachyOS
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-white cursor-pointer transition">
              <span>Últimos 60 segundos</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/60" />
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-xs mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff782d] shadow-xs shadow-orange-500/50" />
              <span className="text-white/80 font-medium">Carga CPU Ativa</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/50" />
              <span className="text-white/60">Média Geral do Sistema</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-white/60">Frequência Dinâmica</span>
            </div>
          </div>

          {/* Spline Wave Graphic (With glowing orange curve & dotted reference line) */}
          <div className="relative py-4 my-auto">
            {/* Value Marker Badge (like 18,256,598 pill in screenshot) */}
            <div className="absolute top-2 left-[58%] -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
              <div className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono font-bold shadow-xl">
                48°C · Pico 22%
              </div>
              <div className="w-2 h-2 rounded-full bg-white ring-4 ring-[#ff782d] shadow-lg mt-1" />
            </div>

            <svg viewBox="0 0 600 180" className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="orangeGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff782d" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ff782d" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Dotted Reference Wave */}
              <path
                d="M 0 120 C 100 80, 200 140, 300 100 C 400 60, 500 130, 600 90"
                fill="none"
                stroke="rgba(255, 255, 255, 0.28)"
                strokeWidth="2"
                strokeDasharray="6 6"
              />

              {/* Orange Wave Gradient Fill */}
              <path
                d="M 0 130 C 90 145, 170 125, 260 70 C 350 15, 430 85, 520 95 L 600 90 L 600 180 L 0 180 Z"
                fill="url(#orangeGlow)"
              />

              {/* Main Glowing Orange Bezier Curve */}
              <path
                d="M 0 130 C 90 145, 170 125, 260 70 C 350 15, 430 85, 520 95 L 600 90"
                fill="none"
                stroke="#ff782d"
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(255, 120, 45, 0.6))' }}
              />
            </svg>

            {/* Time Axis Labels */}
            <div className="flex justify-between text-[11px] font-mono text-white/40 pt-2 border-t border-white/5">
              <span>00s</span>
              <span>10s</span>
              <span>20s</span>
              <span>30s</span>
              <span>40s</span>
              <span>50s</span>
              <span>60s</span>
            </div>
          </div>

          {/* Quick Stats Grid at bottom of card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs font-mono">
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Núcleos</span>
              <span className="font-bold text-white mt-0.5 block">4 Cores / 4 Threads</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Frequência Base</span>
              <span className="font-bold text-white mt-0.5 block">1.60 GHz</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Frequência Turbo</span>
              <span className="font-bold text-cyan-400 mt-0.5 block">2.56 GHz</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Governador</span>
              <span className="font-bold text-emerald-400 mt-0.5 block">schedutil</span>
            </div>
          </div>
        </div>

        {/* Right Col: Donut Rings + Battery & RAM Cards */}
        <div className="space-y-5 flex flex-col justify-between">
          {/* Circular Donut Gauge Card (Like Target Savings 65% in screenshot) */}
          <div className="glass-card rounded-[30px] p-6 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base">Alocação de Memória</h4>
                <p className="text-xs text-white/50">Uso do pool de RAM</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-bold">
                7.7 GB Total
              </span>
            </div>

            <div className="flex items-center justify-between my-4">
              <div>
                <span className="text-xs text-white/50 block">RAM Alocada</span>
                <span className="text-2xl font-extrabold text-white font-mono">3.3 GB</span>
                <div className="w-24 h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: '43%' }} />
                </div>
              </div>

              {/* Glowing Donut Ring with 43% in center */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset="143"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-lg font-bold font-mono">43%</span>
                  <span className="text-[9px] text-white/50 uppercase">Em Uso</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-white/40">Livre:</span>{' '}
                <strong className="text-white">4.3 GB</strong>
              </div>
              <div>
                <span className="text-[10px] text-white/40">Cache:</span>{' '}
                <strong className="text-white">1.1 GB</strong>
              </div>
            </div>
          </div>

          {/* Battery / Energy Status Card */}
          <div className="glass-card rounded-[30px] p-6 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Battery className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Alimentação & AC</h4>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {battery.stateText}
                  </span>
                </div>
              </div>

              <span className="text-xl font-bold font-mono text-white">
                {battery.percent}%
              </span>
            </div>

            <div className="w-full bg-white/10 rounded-full h-2 my-4 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-xs"
                style={{ width: `${battery.percent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-mono text-white/60">
              <span>Saúde: <strong className="text-amber-400">{battery.healthPercent}%</strong></span>
              <span>Tensão: <strong className="text-white">{battery.voltage} V</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Processos (RAM) + Tráfego de Rede */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Processos (RAM) */}
        <div className="lg:col-span-2 glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                TOP PROCESSOS (RAM)
              </h3>
              <p className="text-xs text-white/45">Consumo dinâmico por processo Linux</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70 font-mono">
              kernel /proc/meminfo
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {topProcesses.map((proc, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-28 text-right text-white/80 font-medium truncate">
                  {proc.name}
                </span>
                <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden p-0.5">
                  <div
                    className="h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2.5 text-[10px] font-bold text-white shadow-xs"
                    style={{
                      width: `${Math.max(14, proc.ramPercent * 3.4)}%`,
                      backgroundColor: proc.color,
                      boxShadow: `0 2px 10px ${proc.color}55`,
                    }}
                  >
                    <span>{proc.ramMb} MB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rede / E-S */}
        <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              TRÁFEGO DE REDE
            </h3>
            <span className="text-[11px] text-white/50 font-mono">E/S Real</span>
          </div>

          <div className="space-y-3 pt-1">
            {networks.map((net) => (
              <div
                key={net.name}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5"
              >
                <div className="text-xs font-mono font-bold text-white flex items-center justify-between">
                  <span>{net.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-emerald-400">
                    Ativo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-white/45 flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-cyan-400" /> DOWNLOAD
                    </span>
                    <span className="text-sm font-bold text-cyan-400">
                      {net.downloadKb} KB/s
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/45 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-emerald-400" /> UPLOAD
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
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
