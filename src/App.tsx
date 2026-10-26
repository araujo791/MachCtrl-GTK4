import React from 'react';
import { MachCtrlProvider, useMachCtrl } from './context/MachCtrlContext';
import { HeaderBar } from './components/HeaderBar';
import { Sidebar } from './components/Sidebar';
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
  const { activeTab, theme } = useMachCtrl();

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col font-sans select-none antialiased bg-[#f6f8fb] dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header Bar */}
        <HeaderBar />

        {/* Main Workspace: Sidebar + Viewport */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Active View Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
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

        {/* Fan Curve Editor Modal */}
        <CurveModal />
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
