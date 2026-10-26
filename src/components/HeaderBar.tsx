import React from 'react';
import { Moon, Sun, Minus, Square, X } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

export const HeaderBar: React.FC = () => {
  const { theme, setTheme, lang, setLang } = useMachCtrl();

  return (
    <header className="h-14 border-b border-slate-200/60 dark:border-white/5 bg-white/75 dark:bg-[#0c1019]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between select-none shrink-0 sticky top-0 z-40 transition-colors shadow-xs">
      {/* Left: App Logo & Clean Subtitle */}
      <div className="flex items-center gap-3">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur-xs opacity-50 group-hover:opacity-80 transition duration-300" />
          <img
            src="/favicon.png"
            alt="MachCtrl Logo"
            className="relative w-8 h-8 rounded-xl object-contain bg-slate-900 ring-1 ring-white/10 shadow-sm"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
              MachCtrl
            </h1>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 text-blue-600 dark:text-cyan-400 border border-blue-400/20 dark:border-cyan-400/20">
              3.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-tight">
            Covenant · CachyOS · Uptime 1h 8m
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Language Pill */}
        <button
          onClick={() => setLang(lang === 'BR' ? 'EN' : 'BR')}
          className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 transition-all shadow-2xs active:scale-95"
          title="Alternar idioma"
        >
          {lang}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 transition-all shadow-2xs active:scale-95"
          title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-700 transition-transform hover:rotate-12" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          )}
        </button>

        {/* Window Mock Controls */}
        <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-200/60 dark:border-white/10 text-slate-400 dark:text-slate-500">
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors" title="Minimizar">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors" title="Maximizar">
            <Square className="w-3 h-3" />
          </button>
          <button className="p-1.5 hover:bg-rose-500 hover:text-white rounded-lg transition-colors" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
