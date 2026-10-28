import React from 'react';
import { Cpu } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const CpuTab: React.FC = () => {
  const { sockets, t } = useMachCtrl();

  return (
    <div className="space-y-6 page-root animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {t('Monitoramento de CPU Avançado')}
        </h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          {t('Acompanhamento individual de atividade, temperatura e frequência de cada thread e núcleo físico')}
        </p>
      </div>

      {sockets.length === 0 && <div className="text-sm font-mono text-white/50">{t('Aguardando leitura…')}</div>}
      <div className="space-y-6">
        {sockets.map((socket) => (
          <div
            key={socket.id}
            className="glass-card rounded-[30px] p-6 border border-white/10 space-y-5"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-400/20 text-cyan-400 border border-cyan-400/30 flex flex-col items-center justify-center font-mono font-bold leading-none shadow-lg shadow-cyan-500/10">
                  <span className="text-[9px] text-white/60">CPU</span>
                  <span className="text-sm text-cyan-400">{socket.id}</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {socket.model}
                  </h3>
                  <p className="text-xs text-white/50 font-mono">
                    {socket.cores} {t('núcleos')} · {socket.threads} {t('threads')} · {socket.freqGhz.toFixed(2)} GHz
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                    {t('USO MÉDIO')}
                  </span>
                  <span className="text-base font-bold text-cyan-400">
                    {socket.usageAvg}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                    {t('TEMPERATURA')}
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    {socket.tempAvg != null ? `${socket.tempAvg.toFixed(0)}°C` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                    {t('FREQ')}
                  </span>
                  <span className="text-base font-bold text-white">
                    {socket.freqGhz.toFixed(2)} GHz
                  </span>
                </div>
              </div>
            </div>

            {/* Grade de threads: barra de atividade vertical (sobe de baixo para cima) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 xl:grid-cols-14 gap-2.5">
              {socket.threadList.map((thread) => (
                <div
                  key={thread.id}
                  className="bg-white/[0.04] rounded-2xl border border-white/[0.07] flex items-stretch h-[76px] overflow-hidden group hover:border-cyan-400/40 hover:bg-white/[0.07] transition-all shadow-sm"
                  title={`T${thread.id} · ${thread.usage}% · ${thread.temp != null ? thread.temp.toFixed(0) : '—'}°C`}
                >
                  <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                    <span className="text-sm font-bold font-mono text-cyan-400 leading-none">{thread.usage}%</span>
                    <div className="space-y-0.5 font-mono leading-none">
                      <div className="text-[10px] text-white/45">T{thread.id}</div>
                      <div className="text-[10px] text-emerald-400/80">{thread.temp != null ? `${thread.temp.toFixed(0)}°C` : '—'}</div>
                    </div>
                  </div>
                  <div className="w-2 m-1.5 ml-0 rounded-full bg-white/10 relative overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-blue-500 to-cyan-300 transition-all duration-500"
                      style={{ height: `${Math.max(6, thread.usage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] font-mono text-white/50 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 rounded-xs bg-gradient-to-r from-cyan-400 to-blue-500 inline-block" />
                <span>{t('Atividade (%)')}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>{t('Temperatura (°C)')}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
