import React from 'react';
import { Moon, Sun, Lock, RotateCw, Sparkles, Activity } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

export const HeaderBar: React.FC = () => {
  const { theme, setTheme, lang, setLang, isLaptop } = useMachCtrl();

  return (
    <header className="px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between select-none shrink-0 z-30">
      {/* Left: Window Dots & App Badge */}
      <div className="flex items-center gap-3">
        {/* Mac/Linux Glass Window Dots */}
        <div className="flex items-center gap-2 px-1">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-xs shadow-red-500/50 hover:opacity-80 transition cursor-pointer" title="Fechar" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-xs shadow-amber-500/50 hover:opacity-80 transition cursor-pointer" title="Minimizar" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f] shadow-xs shadow-emerald-500/50 hover:opacity-80 transition cursor-pointer" title="Maximizar" />
        </div>

        {/* Brand Tag */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/10 text-xs">
          <span className="font-extrabold tracking-tight text-slate-800 dark:text-white">
            MachCtrl
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 dark:bg-white/10 text-amber-500 dark:text-amber-400 font-bold border border-white/10">
            v3.0
          </span>
        </div>
      </div>

      {/* Center: Frosted Glass Address / System Pill (Directly inspired by Kezabank print) */}
      <div className="flex items-center">
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 dark:bg-white/[0.06] backdrop-blur-xl border border-white/12 shadow-sm text-xs font-mono text-slate-700 dark:text-white/80 transition-all hover:bg-white/15 dark:hover:bg-white/[0.09]">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span className="text-slate-900 dark:text-white font-medium">machctrl.system</span>
          <span className="text-slate-400 dark:text-white/40">/</span>
          <span className="text-amber-500 dark:text-amber-400 font-semibold">
            {isLaptop ? 'laptop-covenant' : 'workstation-covenant'}
          </span>
          <span className="text-slate-400 dark:text-white/30 hidden sm:inline">·</span>
          <span className="text-[11px] text-slate-500 dark:text-white/60 hidden sm:inline">
            Kernel CachyOS
          </span>
          <button type="button" title="Atualizar dados" className="inline-flex items-center text-slate-400 dark:text-white/40 hover:text-white transition-transform hover:rotate-180 duration-500 cursor-pointer">
            <RotateCw className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>

      {/* Right: Actions, Language & Theme Controls */}
      <div className="flex items-center gap-2">
        {/* Language Pill */}
        <button
          onClick={() => setLang(lang === 'BR' ? 'EN' : 'BR')}
          className="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-white/10 dark:bg-white/[0.06] hover:bg-white/20 dark:hover:bg-white/12 text-slate-800 dark:text-white border border-white/10 transition-all shadow-xs active:scale-95"
          title="Alternar idioma"
        >
          {lang}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-full text-slate-700 dark:text-amber-400 bg-white/10 dark:bg-white/[0.06] hover:bg-white/20 dark:hover:bg-white/12 border border-white/10 transition-all shadow-xs active:scale-95"
          title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-800" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
};
