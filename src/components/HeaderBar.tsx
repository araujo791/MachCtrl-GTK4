import React from 'react';
import { Moon, Sun, Minus, Square, X, Laptop, Server } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

export const HeaderBar: React.FC = () => {
  const {
    theme,
    setTheme,
    lang,
    setLang,
    systemViewMode,
    setSystemViewMode,
  } = useMachCtrl();

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f141f]/95 backdrop-blur-md px-4 flex items-center justify-between select-none shrink-0 sticky top-0 z-40 transition-colors">
      {/* Left: App Logo, Name & Machine Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="MachCtrl Logo"
            className="w-8 h-8 rounded-lg shadow-sm ring-1 ring-slate-900/10 dark:ring-white/10"
            onError={(e) => {
              // fallback if image not loaded
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                MachCtrl
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/50 dark:border-blue-700/30">
                3.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Covenant · CachyOS · Uptime 1h 8m
            </p>
          </div>
        </div>

        {/* System Preset Switcher (Notebook vs Xeon) */}
        <div className="hidden md:flex items-center gap-1 ml-4 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
          <button
            onClick={() => setSystemViewMode('notebook')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              systemViewMode === 'notebook'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Notebook (Inspiron)</span>
          </button>
          <button
            onClick={() => setSystemViewMode('xeon')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              systemViewMode === 'xeon'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Estação Dual Xeon</span>
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Status: Conectado */}
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Conectado</span>
        </div>

        {/* Lang Pill */}
        <button
          onClick={() => setLang(lang === 'BR' ? 'EN' : 'BR')}
          className="px-2 py-1 rounded-lg text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Alternar idioma"
        >
          {lang}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Window Mock Controls */}
        <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 rounded transition-colors" title="Minimizar">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 rounded transition-colors" title="Maximizar">
            <Square className="w-3 h-3" />
          </button>
          <button className="p-1.5 hover:bg-rose-500 hover:text-white rounded transition-colors" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
