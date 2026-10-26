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
  Info,
} from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ITEMS: SidebarItem[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutGrid },
  { id: 'cpu', label: 'CPU', icon: Cpu },
  { id: 'memoria', label: 'Memória', icon: Layers },
  { id: 'discos', label: 'Discos', icon: HardDrive },
  { id: 'fans', label: 'Fans', icon: Fan },
  { id: 'energia', label: 'Energia', icon: Zap },
  { id: 'limpeza', label: 'Limpeza', icon: Trash2 },
  { id: 'ajuste', label: 'Ajuste', icon: Gauge },
  { id: 'sobre', label: 'Sobre', icon: Info },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useMachCtrl();

  return (
    <aside className="w-20 lg:w-24 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f141f]/95 flex flex-col items-center py-4 select-none shrink-0 transition-colors">
      <div className="flex flex-col gap-1 w-full px-2">
        {ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                  isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'
                }`}
              />
              <span className="text-[10px] tracking-tight text-center leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
