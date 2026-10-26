import React from 'react';
import { Battery, Zap, Check } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const EnergiaTab: React.FC = () => {
  const { battery, powerMode, setPowerMode } = useMachCtrl();

  const profiles = [
    {
      id: 'economia' as const,
      name: 'Economia',
      desc: 'Baixo consumo · Silencioso',
    },
    {
      id: 'equilibrado' as const,
      name: 'Equilibrado',
      desc: 'Desempenho adaptativo',
    },
    {
      id: 'desempenho' as const,
      name: 'Desempenho',
      desc: 'Máximo desempenho · Turbo',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Perfis de Energia & Bateria
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
          Ajuste simplificado para os modos de Desempenho, Equilibrado e Economia de Bateria com detalhamento de saúde
        </p>
      </div>

      {/* Main Battery Card */}
      <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-6 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md space-y-6">
        {/* Charge Level */}
        <div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-400/30 shrink-0 shadow-xs">
              <Battery className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                  {battery.percent}%
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {battery.stateText}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full shadow-xs" style={{ width: `${battery.percent}%` }} />
          </div>
        </div>

        {/* Battery Health Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              Saúde da bateria
            </span>
            <span className="font-bold text-orange-500">{battery.healthPercent}%</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-1.5 rounded-full shadow-xs" style={{ width: `${battery.healthPercent}%` }} />
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            Capacidade atual de carga comparada à de fábrica. Abaixo de 60% a bateria já dura bem menos.
          </p>
        </div>

        {/* Specs Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t border-slate-100 dark:border-white/5 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tensão</span>
            <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">{battery.voltage} V</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Capacidade (atual / fábrica)</span>
            <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">{battery.currentWh} Wh / {battery.totalWh} Wh</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tecnologia</span>
            <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">{battery.tech}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Modelo</span>
            <strong className="text-slate-800 dark:text-slate-200 block mt-0.5 truncate">{battery.model}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Fonte de energia</span>
            <strong className="text-emerald-600 dark:text-emerald-400 block mt-0.5">NA TOMADA</strong>
          </div>
        </div>
      </div>

      {/* 3 Power Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {profiles.map((p) => {
          const isActive = powerMode === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between items-center text-center space-y-5 ${
                isActive
                  ? 'bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent border-orange-400/40 shadow-sm shadow-orange-500/10 relative backdrop-blur-md'
                  : 'bg-white/80 dark:bg-[#121826]/80 border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md hover:border-slate-300 dark:hover:border-white/10'
              }`}
            >
              {isActive && (
                <span className="absolute top-4 right-4 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 uppercase border border-orange-400/20">
                  ATIVO
                </span>
              )}

              <div className="flex flex-col items-center pt-2">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${
                    isActive
                      ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-orange-500/30'
                      : 'bg-slate-100/80 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Zap className="w-7 h-7" />
                </div>

                <h3
                  className={`font-extrabold text-base ${
                    isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {p.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">{p.desc}</p>
              </div>

              <button
                onClick={() => setPowerMode(p.id)}
                className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition-all shadow-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/25 cursor-default'
                    : 'bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                }`}
              >
                {isActive ? 'Ativo' : 'Aplicar'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 text-center sm:text-left">
        Aplicar perfil requer root (escrita em /sys). Rode com pkexec/sudo se necessário.
      </p>
    </div>
  );
};
