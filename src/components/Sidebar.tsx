import React from 'react';
import {
  LayoutGrid,
  Cpu,
  MemoryStick,
  HardDrive,
  Fan,
  Zap,
  Trash2,
  Gauge,
  Heart,
} from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeGradient: string;
  shadowGlow: string;
}

const ITEMS: SidebarItem[] = [
  {
    id: 'overview',
    label: 'Visão Geral',
    icon: LayoutGrid,
    activeGradient: 'from-amber-500 to-orange-500',
    shadowGlow: 'shadow-orange-500/40',
  },
  {
    id: 'cpu',
    label: 'CPU',
    icon: Cpu,
    activeGradient: 'from-indigo-500 to-cyan-400',
    shadowGlow: 'shadow-cyan-500/30',
  },
  {
    id: 'memoria',
    label: 'Memória',
    icon: MemoryStick,
    activeGradient: 'from-emerald-500 to-teal-400',
    shadowGlow: 'shadow-emerald-500/30',
  },
  {
    id: 'discos',
    label: 'Discos',
    icon: HardDrive,
    activeGradient: 'from-amber-600 to-yellow-500',
    shadowGlow: 'shadow-amber-500/30',
  },
  {
    id: 'fans',
    label: 'Fans',
    icon: Fan,
    activeGradient: 'from-purple-500 to-fuchsia-500',
    shadowGlow: 'shadow-fuchsia-500/30',
  },
  {
    id: 'energia',
    label: 'Energia',
    icon: Zap,
    activeGradient: 'from-orange-500 to-amber-400',
    shadowGlow: 'shadow-orange-500/30',
  },
  {
    id: 'limpeza',
    label: 'Limpeza',
    icon: Trash2,
    activeGradient: 'from-rose-500 to-red-500',
    shadowGlow: 'shadow-rose-500/30',
  },
  {
    id: 'ajuste',
    label: 'Ajuste',
    icon: Gauge,
    activeGradient: 'from-teal-500 to-emerald-400',
    shadowGlow: 'shadow-teal-500/30',
  },
  {
    id: 'sobre',
    label: 'Sobre',
    icon: Heart,
    activeGradient: 'from-pink-500 to-rose-400',
    shadowGlow: 'shadow-pink-500/30',
  },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, t } = useMachCtrl();

  return (
    <aside className="p-2 sm:p-3 flex flex-col items-center justify-center select-none shrink-0 z-20">
      {/* Floating Modern Glass Capsule Dock - Kezabank & VisionOS Style */}
      <div className="glass-dock rounded-[28px] p-2 max-h-full overflow-y-auto flex flex-col items-center gap-2 border border-white/10 dark:border-white/10 shadow-2xl backdrop-blur-2xl">
        {ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group relative flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-300 active:scale-95 ${
                isActive
                  ? `bg-gradient-to-tr ${item.activeGradient} text-white shadow-lg ${item.shadowGlow} scale-105`
                  : 'text-slate-400 dark:text-white/45 hover:text-slate-800 dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/10'
              }`}
              title={t(item.label)}
              aria-label={t(item.label)}
            >
              <Icon
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform duration-300 ${
                  isActive ? 'stroke-[2.3] scale-105' : 'stroke-[1.8] group-hover:scale-110'
                }`}
              />

              {/* Floating Modern Tooltip Pill on Hover */}
              <div className="absolute left-full ml-3 px-3 py-1 rounded-full bg-[#121622]/90 backdrop-blur-xl border border-white/15 text-white text-[11px] font-medium tracking-tight shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50">
                {t(item.label)}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
