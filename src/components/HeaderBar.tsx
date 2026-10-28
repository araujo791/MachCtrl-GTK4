import React from 'react';
import { Lock, RotateCw, Minus, Square, X, Moon, Sun } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useMachCtrl } from '../context/MachCtrlContext';

export const HeaderBar: React.FC = () => {
  const { lang, setLang, theme, setTheme, sysInfo, snap, isMaximized, refresh, t } = useMachCtrl();
  const win = () => { try { return getCurrentWindow(); } catch { return null; } };

  return (
    <header data-tauri-drag-region className="relative px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between select-none shrink-0 z-30">
      {/* Esquerda: marca */}
      <div data-tauri-drag-region className="flex items-center gap-2 text-xs">
        <img src="/favicon.png" alt="" className="w-8 h-8 rounded-lg" draggable={false} />
        <span className="font-extrabold tracking-tight text-white text-sm">MachCtrl</span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-amber-400 font-bold border border-white/10">v3.0</span>
      </div>

      {/* Centro: sistema real */}
      <div data-tauri-drag-region className="hidden md:flex items-center">
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/12 shadow-sm text-xs font-mono text-white/80">
          <Lock className={`w-3 h-3 ${snap ? 'text-emerald-500' : 'text-white/30'}`} />
          <span className="text-white font-medium">{sysInfo?.hostname ?? '…'}</span>
          {sysInfo && (
            <>
              <span className="text-white/30">·</span>
              <span className="text-amber-400 font-semibold">{sysInfo.distro}</span>
              <span className="text-white/30">·</span>
              <span className="text-[11px] text-white/60">{t('Uptime')} {sysInfo.uptime}</span>
            </>
          )}
          <button type="button" onClick={refresh} title={t('Atualizar dados')} className="inline-flex items-center text-white/40 hover:text-white transition-transform hover:rotate-180 duration-500">
            <RotateCw className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>

      {/* Direita: idioma + controles da janela */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'pt-BR' ? 'en' : 'pt-BR')}
          className="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-white/[0.06] hover:bg-white/12 text-white border border-white/10 transition-all active:scale-95"
          title={t('Alternar idioma')}
        >
          {lang === 'pt-BR' ? 'BR' : 'EN'}
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? t('Modo Claro') : t('Modo Escuro')}
          className="p-2 rounded-full bg-white/[0.06] hover:bg-white/12 border border-white/10 transition-all active:scale-95"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
        <div className="flex items-center gap-0.5 ml-1">
          <button onClick={() => win()?.minimize()} title={t('Minimizar')} className="w-8 h-8 rounded-lg grid place-items-center text-white/60 hover:bg-white/10 hover:text-white">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => win()?.toggleMaximize()} title={t('Maximizar')} className="w-8 h-8 rounded-lg grid place-items-center text-white/60 hover:bg-white/10 hover:text-white">
            <Square className={isMaximized ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          </button>
          <button onClick={() => win()?.close()} title={t('Fechar')} className="w-8 h-8 rounded-lg grid place-items-center text-white/60 hover:bg-red-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
