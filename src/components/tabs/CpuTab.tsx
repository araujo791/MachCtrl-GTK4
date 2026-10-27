import React from 'react';
import { Cpu } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const CpuTab: React.FC = () => {
  const { sockets } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Monitoramento de CPU Avançado
        </h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          Acompanhamento individual de atividade, temperatura e frequência de cada thread e núcleo físico
        </p>
      </div>

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
                    {socket.cores} núcleos · {socket.threads} threads · {socket.freqGhz.toFixed(2)} GHz
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                    USO MÉDIO
                  </span>
                  <span className="text-base font-bold text-cyan-400">
                    {socket.usageAvg}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                    TEMPERATURA
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    {socket.tempAvg}°C
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">
                    FREQ
                  </span>
                  <span className="text-base font-bold text-white">
                    {socket.freqGhz.toFixed(2)} GHz
                  </span>
                </div>
              </div>
            </div>

            {/* Thread Grid (T0, T1, ... T27) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-14 gap-2">
              {socket.threadList.map((thread) => (
                <div
                  key={thread.id}
                  className="bg-white/[0.03] p-2.5 rounded-2xl border border-white/5 flex flex-col justify-between h-16 relative overflow-hidden group hover:border-cyan-400/40 hover:bg-white/[0.06] transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-cyan-400">
                      {thread.usage}%
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" title={`Temp: ${thread.temp}°C`} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>T{thread.id}</span>
                    <span className="text-[9px] text-white/30">{thread.temp}°C</span>
                  </div>

                  {/* Activity Bar along the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.max(8, thread.usage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] font-mono text-white/50 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 rounded-xs bg-gradient-to-r from-cyan-400 to-blue-500 inline-block" />
                <span>Atividade (%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Temperatura (°C)</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
