import React from 'react';
import { HelpCircle, Sliders, Layers, Network, HardDrive, Cpu } from 'lucide-react';
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
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Ajustes do Sistema (Kernel Tuning)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
          Alguns ajustes para melhor aproveitar seu hardware, rede, discos, serviços e memória no Linux CachyOS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col 1: Memória, Rede & Escrita em Disco */}
        <div className="space-y-5">
          {/* MEMÓRIA */}
          <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              MEMÓRIA
            </h3>

            {/* Swappiness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  Swappiness <HelpCircle className="w-3 h-3 text-slate-400" />
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{swappiness}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={swappiness}
                onChange={(e) => setSwappiness(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Pressão de cache (vfs) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  Pressão de cache (vfs) <HelpCircle className="w-3 h-3 text-slate-400" />
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{vfsCachePressure}</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={vfsCachePressure}
                onChange={(e) => setVfsCachePressure(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Huge Pages */}
            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                Huge Pages <HelpCircle className="w-3 h-3 text-slate-400" />
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['always', 'madvise', 'never'] as const).map((hp) => (
                  <button
                    key={hp}
                    onClick={() => setHugePages(hp)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      hugePages === hp
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {hp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* REDE */}
          <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              REDE
            </h3>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                Controle de congestionamento TCP <HelpCircle className="w-3 h-3 text-slate-400" />
              </span>
              <select
                value={tcpCongestion}
                onChange={(e) => setTcpCongestion(e.target.value as any)}
                aria-label="Controle de congestionamento TCP"
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs cursor-pointer"
              >
                <option value="bbr">bbr</option>
                <option value="cubic">cubic</option>
                <option value="reno">reno</option>
              </select>
            </div>
          </div>

          {/* ESCRITA EM DISCO */}
          <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              ESCRITA EM DISCO
            </h3>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  Início da gravação (bg) <HelpCircle className="w-3 h-3 text-slate-400" />
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{dirtyBackgroundRatio}</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={dirtyBackgroundRatio}
                onChange={(e) => setDirtyBackgroundRatio(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  Limite de gravação <HelpCircle className="w-3 h-3 text-slate-400" />
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{dirtyRatio}</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={dirtyRatio}
                onChange={(e) => setDirtyRatio(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Col 2: SERVIÇOS */}
        <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              SERVIÇOS
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Liga/desliga serviços do sistema (aplica agora e no boot).
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                    {svc.name}
                  </span>
                  <span title={svc.tooltip}>
                    <HelpCircle className="w-3 h-3 text-slate-400" />
                  </span>
                </div>

                <button
                  onClick={() => toggleService(svc.name)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    svc.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      svc.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: AGENDADOR DE I/O (POR DISCO) */}
        <div className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300 uppercase">
              AGENDADOR DE I/O (POR DISCO)
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Como o kernel ordena as operações de disco. &apos;none&apos; é ideal pra NVMe; &apos;bfq&apos; pra HDD/desktop.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {diskSchedulers.map((d) => {
              const isNvme = d.mediaType === 'NVMe';
              const isSsd = d.mediaType === 'SSD';
              const badgeClass = isNvme
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : isSsd
                ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300'
                : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';

              return (
                <div
                  key={d.device}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{d.device}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${badgeClass}`}>
                      {d.mediaType}
                    </span>
                  </div>

                  <select
                    value={d.scheduler}
                    onChange={(e) => setDiskScheduler(d.device, e.target.value as any)}
                    aria-label={`Agendador de I/O para ${d.device}`}
                    className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs cursor-pointer"
                  >
                    <option value="none">none</option>
                    <option value="bfq">bfq</option>
                    <option value="mq-deadline">mq-deadline</option>
                    <option value="kyber">kyber</option>
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
