import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';
import { DiskScheduler } from '../../types/machctrl';

export const AjustesTab: React.FC = () => {
  const {
    swappiness,
    setSwappiness,
    vfsCachePressure,
    setVfsCachePressure,
    hugePages,
    setHugePages,
    tcpCongestion,
    setTcpCongestion,
    dirtyBackgroundRatio,
    setDirtyBackgroundRatio,
    dirtyRatio,
    setDirtyRatio,
    services,
    toggleService,
    diskSchedulers,
    setDiskScheduler,
  } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Ajustes do Sistema (Kernel Tuning)
        </h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          Otimizações de baixo nível para memória, rede, dirty pages e agendadores de E/S no Linux CachyOS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col 1: Memória, Rede & Escrita em Disco */}
        <div className="space-y-5">
          {/* MEMÓRIA */}
          <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
            <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">
              MEMÓRIA & SWAP
            </h3>

            {/* Swappiness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/70 flex items-center gap-1.5">
                  Swappiness <HelpCircle className="w-3.5 h-3.5 text-white/40" />
                </span>
                <span className="font-bold text-cyan-400">{swappiness}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={swappiness}
                onChange={(e) => setSwappiness(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Pressão de cache (vfs) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/70 flex items-center gap-1.5">
                  Pressão de cache (vfs) <HelpCircle className="w-3.5 h-3.5 text-white/40" />
                </span>
                <span className="font-bold text-cyan-400">{vfsCachePressure}</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={vfsCachePressure}
                onChange={(e) => setVfsCachePressure(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Huge Pages */}
            <div className="flex items-center justify-between text-xs font-mono pt-2">
              <span className="text-white/70 flex items-center gap-1.5">
                Huge Pages <HelpCircle className="w-3.5 h-3.5 text-white/40" />
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-xl border border-white/10">
                {(['always', 'madvise', 'never'] as const).map((hp) => (
                  <button
                    key={hp}
                    onClick={() => setHugePages(hp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      hugePages === hp
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-xs'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {hp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* REDE */}
          <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
            <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">
              REDE & TCP
            </h3>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/70 flex items-center gap-1.5">
                Controle de congestionamento TCP <HelpCircle className="w-3.5 h-3.5 text-white/40" />
              </span>
              <select
                value={tcpCongestion}
                onChange={(e) => setTcpCongestion(e.target.value as any)}
                aria-label="Controle de congestionamento TCP"
                className="bg-white/10 text-white px-3 py-1.5 rounded-xl border border-white/15 font-mono text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="bbr" className="bg-[#121622] text-white">bbr</option>
                <option value="cubic" className="bg-[#121622] text-white">cubic</option>
                <option value="reno" className="bg-[#121622] text-white">reno</option>
              </select>
            </div>
          </div>

          {/* ESCRITA EM DISCO */}
          <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
            <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">
              ESCRITA EM DISCO (DIRTY PAGES)
            </h3>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/70 flex items-center gap-1.5">
                  Início da gravação (bg) <HelpCircle className="w-3.5 h-3.5 text-white/40" />
                </span>
                <span className="font-bold text-cyan-400">{dirtyBackgroundRatio}</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={dirtyBackgroundRatio}
                onChange={(e) => setDirtyBackgroundRatio(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/70 flex items-center gap-1.5">
                  Limite de gravação <HelpCircle className="w-3.5 h-3.5 text-white/40" />
                </span>
                <span className="font-bold text-cyan-400">{dirtyRatio}</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={dirtyRatio}
                onChange={(e) => setDirtyRatio(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Col 2: SERVIÇOS */}
        <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">
              SERVIÇOS SYSTEMD
            </h3>
            <p className="text-[11px] text-white/45 font-mono mt-0.5">
              Liga/desliga daemons do sistema em tempo real e na inicialização.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">
                    {svc.name}
                  </span>
                  <span title={svc.tooltip}>
                    <HelpCircle className="w-3.5 h-3.5 text-white/40" />
                  </span>
                </div>

                <button
                  onClick={() => toggleService(svc.name)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shadow-sm ${
                    svc.enabled ? 'bg-emerald-500' : 'bg-white/15'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      svc.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: AGENDADOR DE I/O */}
        <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">
              AGENDADOR DE I/O
            </h3>
            <p className="text-[11px] text-white/45 font-mono mt-0.5">
              Como o kernel ordena E/S. &apos;none&apos; é ideal para NVMe; &apos;bfq&apos; para HDD.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {diskSchedulers.map((d) => {
              const isNvme = d.mediaType === 'NVMe';
              const isSsd = d.mediaType === 'SSD';
              const badgeClass = isNvme
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : isSsd
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'bg-orange-500/15 text-orange-400 border border-orange-500/30';

              return (
                <div
                  key={d.device}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5"
                >
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-white">{d.device}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeClass}`}>
                      {d.mediaType}
                    </span>
                  </div>

                  <select
                    value={d.scheduler}
                    onChange={(e) => setDiskScheduler(d.device, e.target.value as any)}
                    aria-label={`Agendador de I/O para ${d.device}`}
                    className="bg-white/10 text-white px-3 py-1.5 rounded-xl border border-white/15 font-mono text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="none" className="bg-[#121622] text-white">none</option>
                    <option value="bfq" className="bg-[#121622] text-white">bfq</option>
                    <option value="mq-deadline" className="bg-[#121622] text-white">mq-deadline</option>
                    <option value="kyber" className="bg-[#121622] text-white">kyber</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
