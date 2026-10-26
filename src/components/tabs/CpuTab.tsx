import React from 'react';
import { Cpu } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const CpuTab: React.FC = () => {
  const { sockets } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Monitoramento de CPU Avançado
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
          Acompanhamento individual de atividade, temperatura e frequência de cada thread e núcleo físico
        </p>
      </div>

      <div className="space-y-6">
        {sockets.map((socket) => (
          <div
            key={socket.id}
            className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-mono font-bold leading-none shadow-xs">
                  <span className="text-[9px]">CPU</span>
                  <span className="text-sm">{socket.id}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
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
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
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
                  className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between h-14 relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-blue-600 dark:text-blue-400">
                      {thread.usage}%
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`Temp: ${thread.temp}°C`} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>T{thread.id}</span>
                  </div>

                  {/* Activity Bar along the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.max(8, thread.usage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 rounded-xs bg-blue-500 inline-block" />
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
