import React from 'react';
import { ExternalLink, Github, Cpu, ShieldCheck, Heart, Terminal, Sparkles } from 'lucide-react';

export const SobreTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sobre o MachCtrl
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
          Monitor e Otimizador de Hardware nativo para distribuições Linux
        </p>
      </div>

      <div className="bg-white dark:bg-[#141b29] rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 text-center">
        <div className="flex flex-col items-center">
          <img
            src="/favicon.png"
            alt="MachCtrl 3.0"
            className="w-20 h-20 rounded-2xl shadow-lg ring-2 ring-slate-900/10 dark:ring-white/10 mb-3"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>MachCtrl</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40">
              3.0
            </span>
          </h3>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
            Cada detalhe. Sob seu controle.
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Monitor e Otimizador de Hardware para Linux — versão nativa com Rust + Tauri v2 + React.
          Visual dark/light moderno, backend Rust lendo os sensores direto de <code className="text-slate-700 dark:text-slate-300 font-mono">/proc</code> e <code className="text-slate-700 dark:text-slate-300 font-mono">/sys</code> (sem sysinfo, sem Electron, sem WebView pesado — usa o WebKitGTK do próprio sistema).
        </p>

        {/* Tech Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {['Rust', 'Tauri v2', 'React', 'WebKitGTK', '/proc + /sys', 'CachyOS Builder'].map((chip) => (
            <span
              key={chip}
              className="text-xs font-mono font-medium px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-base">🚀</span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Ultraleve & Nativo</h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Consumo mínimo de CPU e memória RAM com compilação direta em Rust
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-base">🌀</span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Controle de Fans</h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Suporte a PWM por hardware, curvas térmicas personalizadas e modos automático/máximo
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-base">🧹</span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Manutenção Ágil</h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Limpeza de pacotes órfãos, cache do pacman, journald e ajustes finos de I/O
            </p>
          </div>
        </div>

        {/* Official Links */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://covenant.wirebyinfo.com.br/machctrl"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-xs transition-colors"
          >
            <span>Página Oficial Covenant MachCtrl</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://github.com/araujo791/MachCtrl-GTK4"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>Repositório GitHub (araujo791)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
