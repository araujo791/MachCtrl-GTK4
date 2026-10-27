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
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Perfis de Energia & Bateria
        </h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          Ajuste simplificado para os modos de Desempenho, Equilibrado e Economia de Bateria com detalhamento de saúde
        </p>
      </div>

      {/* Main Battery Card */}
      <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-6">
        {/* Charge Level */}
        <div>
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0 shadow-lg shadow-emerald-500/20">
              <Battery className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white">
                  {battery.percent}%
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  {battery.stateText}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full shadow-xs shadow-emerald-500/50" style={{ width: `${battery.percent}%` }} />
          </div>
        </div>

        {/* Battery Health Bar */}
        <div className="space-y-2 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-medium">
              Saúde da bateria
            </span>
            <span className="font-bold text-amber-400">{battery.healthPercent}%</span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full shadow-xs shadow-orange-500/50" style={{ width: `${battery.healthPercent}%` }} />
          </div>

          <p className="text-[11px] text-white/45 font-mono">
            Capacidade atual de carga comparada à de fábrica. Abaixo de 60% a bateria já dura bem menos.
          </p>
        </div>

        {/* Specs Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-white/10 text-xs font-mono">
          <div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Tensão</span>
            <strong className="text-white block mt-0.5">{battery.voltage} V</strong>
          </div>
          <div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Capacidade</span>
            <strong className="text-white block mt-0.5">{battery.currentWh} Wh / {battery.totalWh} Wh</strong>
          </div>
          <div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Tecnologia</span>
            <strong className="text-white block mt-0.5">{battery.tech}</strong>
          </div>
          <div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Modelo</span>
            <strong className="text-white block mt-0.5 truncate">{battery.model}</strong>
          </div>
          <div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Fonte</span>
            <strong className="text-emerald-400 block mt-0.5">NA TOMADA</strong>
          </div>
        </div>
      </div>

      {/* 3 Power Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {profiles.map((p) => {
          const isActive = powerMode === p.id;
          return (
            <div
              key={p.id}
              className={`glass-card rounded-[30px] p-6 border transition-all duration-300 flex flex-col justify-between items-center text-center space-y-5 relative overflow-hidden ${
                isActive
                  ? 'border-orange-500/50 shadow-lg shadow-orange-500/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {isActive && (
                <>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />
                  <span className="absolute top-4 right-4 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 uppercase border border-orange-500/30">
                    ATIVO
                  </span>
                </>
              )}

              <div className="flex flex-col items-center pt-2 relative z-10">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
                    isActive
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-orange-500/40'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  <Zap className="w-7 h-7" />
                </div>

                <h3
                  className={`font-bold text-base ${
                    isActive ? 'text-white' : 'text-white/80'
                  }`}
                >
                  {p.name}
                </h3>
                <p className="text-xs text-white/45 font-mono mt-1">{p.desc}</p>
              </div>

              <button
                onClick={() => setPowerMode(p.id)}
                className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition-all shadow-md relative z-10 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-orange-500/30 cursor-default'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
              >
                {isActive ? 'Ativo' : 'Aplicar'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-mono text-white/40 text-center sm:text-left">
        Aplicar perfil requer privilégios (escrita em /sys).
      </p>
    </div>
  );
};
