import React from 'react';
import {
  LayoutGrid,
  Cpu,
  Layers,
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
  gradient: string;
  activeColor: string;
  activeBorder: string;
  glowColor: string;
}

const ITEMS: SidebarItem[] = [
  {
    id: 'overview',
    label: 'Visão Geral',
    icon: LayoutGrid,
    gradient: 'from-blue-500/15 via-cyan-400/15 to-transparent',
    activeColor: 'text-blue-600 dark:text-cyan-400',
    activeBorder: 'border-blue-500/40 dark:border-cyan-400/40',
    glowColor: 'shadow-blue-500/20',
  },
  {
    id: 'cpu',
    label: 'CPU',
    icon: Cpu,
    gradient: 'from-indigo-500/15 via-purple-500/15 to-transparent',
    activeColor: 'text-indigo-600 dark:text-purple-400',
    activeBorder: 'border-indigo-500/40 dark:border-purple-400/40',
    glowColor: 'shadow-purple-500/20',
  },
  {
    id: 'memoria',
    label: 'Memória',
    icon: Layers,
    gradient: 'from-emerald-500/15 via-teal-400/15 to-transparent',
    activeColor: 'text-emerald-600 dark:text-emerald-400',
    activeBorder: 'border-emerald-500/40 dark:border-emerald-400/40',
    glowColor: 'shadow-emerald-500/20',
  },
  {
    id: 'discos',
    label: 'Discos',
    icon: HardDrive,
    gradient: 'from-amber-500/15 via-orange-400/15 to-transparent',
    activeColor: 'text-amber-600 dark:text-orange-400',
    activeBorder: 'border-amber-500/40 dark:border-orange-400/40',
    glowColor: 'shadow-amber-500/20',
  },
  {
    id: 'fans',
    label: 'Fans',
    icon: Fan,
    gradient: 'from-fuchsia-500/15 via-purple-500/15 to-transparent',
    activeColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    activeBorder: 'border-fuchsia-500/40 dark:border-fuchsia-400/40',
    glowColor: 'shadow-fuchsia-500/20',
  },
  {
    id: 'energia',
    label: 'Energia',
    icon: Zap,
    gradient: 'from-orange-500/15 via-amber-400/15 to-transparent',
    activeColor: 'text-orange-600 dark:text-amber-400',
    activeBorder: 'border-orange-500/40 dark:border-amber-400/40',
    glowColor: 'shadow-orange-500/20',
  },
  {
    id: 'limpeza',
    label: 'Limpeza',
    icon: Trash2,
    gradient: 'from-rose-500/15 via-red-400/15 to-transparent',
    activeColor: 'text-rose-600 dark:text-rose-400',
    activeBorder: 'border-rose-500/40 dark:border-rose-400/40',
    glowColor: 'shadow-rose-500/20',
  },
  {
    id: 'ajuste',
    label: 'Ajuste',
    icon: Gauge,
    gradient: 'from-teal-500/15 via-blue-500/15 to-transparent',
    activeColor: 'text-teal-600 dark:text-blue-400',
    activeBorder: 'border-teal-500/40 dark:border-blue-400/40',
    glowColor: 'shadow-teal-500/20',
  },
  {
    id: 'sobre',
    label: 'Sobre',
    icon: Heart,
    gradient: 'from-pink-500/15 via-purple-400/15 to-transparent',
    activeColor: 'text-pink-600 dark:text-pink-400',
    activeBorder: 'border-pink-500/40 dark:border-pink-400/40',
    glowColor: 'shadow-pink-500/20',
  },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useMachCtrl();

  return (
    <aside className="w-20 lg:w-24 border-r border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-[#0c1019]/75 backdrop-blur-xl flex flex-col items-center py-4 select-none shrink-0 transition-colors">
      <div className="flex flex-col gap-1.5 w-full px-2">
        {ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 relative group active:scale-95 ${
                isActive
                  ? `bg-gradient-to-b ${item.gradient} border ${item.activeBorder} shadow-sm ${item.glowColor} backdrop-blur-md`
                  : 'hover:bg-slate-100/70 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {/* Luminous Glow Dot indicator on active */}
              {isActive && (
                <span
                  className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-gradient-to-b from-blue-500 to-cyan-400 shadow-sm"
                  aria-hidden="true"
                />
              )}

              {/* Glassmorphic Icon Badge */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  isActive
                    ? `${item.activeColor}`
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-all ${
                    isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
              </div>

              <span
                className={`text-[10px] tracking-tight text-center leading-tight transition-colors ${
                  isActive
                    ? `font-bold ${item.activeColor}`
                    : 'text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
