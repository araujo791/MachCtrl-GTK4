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
      {/* Ambient Atmospheric Backdrop - Inspired directly by Kezabank / VisionOS */}
      <div className="min-h-screen relative overflow-hidden font-sans select-none antialiased bg-[#0e121a] text-slate-100 transition-colors p-2 sm:p-4 md:p-6 flex flex-col justify-center items-center">
        {/* Warm Ambient Glowing Orbs in the background */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Floating Glass Application Window */}
        <div className="relative w-full max-w-[1520px] h-[95vh] max-h-[1050px] glass-panel rounded-[32px] sm:rounded-[38px] flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.7)] border border-white/12">
          {/* Header Bar */}
          <HeaderBar />

          {/* Main Content Area: Floating Glass Dock on Left + Scrollable Content */}
          <div className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-3 sm:gap-4">
            {/* Floating Glass Dock */}
            <Sidebar />

            {/* Scrollable Main Viewport with Frosted Glass Components */}
            <main className="flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar">
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
