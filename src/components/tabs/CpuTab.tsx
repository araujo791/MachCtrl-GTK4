import React from 'react';
import { Cpu } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const CpuTab: React.FC = () => {
  const { sockets } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Monitoramento de CPU Avançado
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
          Acompanhamento individual de atividade, temperatura e frequência de cada thread e núcleo físico
        </p>
      </div>

      <div className="space-y-6">
        {sockets.map((socket) => (
          <div
            key={socket.id}
            className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 sm:p-6 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md space-y-5"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-purple-400 border border-indigo-400/30 flex flex-col items-center justify-center font-mono font-bold leading-none shadow-xs">
                  <span className="text-[9px]">CPU</span>
                  <span className="text-sm">{socket.id}</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {socket.model}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {socket.cores} núcleos · {socket.threads} threads · {socket.freqGhz.toFixed(2)} GHz
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    USO MÉDIO
                  </span>
                  <span className="text-base font-bold text-blue-600 dark:text-cyan-400">
                    {socket.usageAvg}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    TEMPERATURA
                  </span>
                  <span className="text-base font-bold text-emerald-500">
                    {socket.tempAvg}°C
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    FREQ
                  </span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">
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
                  className="bg-slate-50/70 dark:bg-white/5 p-2 rounded-xl border border-slate-200/50 dark:border-white/5 flex flex-col justify-between h-14 relative overflow-hidden group hover:border-blue-400/40 dark:hover:border-blue-400/30 transition-all shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-blue-600 dark:text-cyan-400">
                      {thread.usage}%
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" title={`Temp: ${thread.temp}°C`} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>T{thread.id}</span>
                  </div>

                  {/* Activity Bar along the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200/60 dark:bg-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${Math.max(8, thread.usage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 rounded-xs bg-gradient-to-r from-blue-500 to-cyan-400 inline-block" />
                <span>Atividade (%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Temperatura (°C)</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
