import React from 'react';
import { MachCtrlProvider, useMachCtrl } from './context/MachCtrlContext';
import { HeaderBar } from './components/HeaderBar';
import { Sidebar } from './components/Sidebar';
import { TempAlert } from './components/TempAlert';
import { ConfirmModal } from './components/ConfirmModal';
import { OverviewTab } from './components/tabs/OverviewTab';
import { CpuTab } from './components/tabs/CpuTab';
import { MemoriaTab } from './components/tabs/MemoriaTab';
import { DiscosTab } from './components/tabs/DiscosTab';
import { FansTab } from './components/tabs/FansTab';
import { EnergiaTab } from './components/tabs/EnergiaTab';
import { LimpezaTab } from './components/tabs/LimpezaTab';
import { AjustesTab } from './components/tabs/AjustesTab';
import { SobreTab } from './components/tabs/SobreTab';
import { CurveModal } from './components/CurveModal';

const MainShell: React.FC = () => {
  const { activeTab, isMaximized, theme, wallpaper } = useMachCtrl();

  return (
    <div className={`${theme === 'light' ? 'light' : 'dark'} h-screen w-screen`}>
      {/* A janela do Tauri é transparente: este contêiner pinta o fundo e arredonda os cantos (sem raio quando maximizada). */}
      <div
        style={wallpaper ? ({ '--wp': `url("${wallpaper}")` } as React.CSSProperties) : undefined}
        className={`relative h-full w-full overflow-hidden flex flex-col font-sans select-none antialiased ambient-bg text-slate-100 ${wallpaper ? 'wp' : ''} ${
          isMaximized ? '' : 'rounded-[14px] border border-white/12'
        }`}
      >

        <TempAlert />
        <HeaderBar />

        <div className="relative flex-1 min-h-0 flex p-2 sm:p-4 gap-3 sm:gap-4">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-y-auto pr-2 pb-2 custom-scrollbar page-scroll">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'cpu' && <CpuTab />}
            {activeTab === 'memoria' && <MemoriaTab />}
            {activeTab === 'discos' && <DiscosTab />}
            {activeTab === 'fans' && <FansTab />}
            {activeTab === 'energia' && <EnergiaTab />}
            {activeTab === 'limpeza' && <LimpezaTab />}
            {activeTab === 'ajuste' && <AjustesTab />}
            {activeTab === 'sobre' && <SobreTab />}
          </main>
        </div>

        <CurveModal />
        <ConfirmModal />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <MachCtrlProvider>
      <MainShell />
    </MachCtrlProvider>
  );
}
