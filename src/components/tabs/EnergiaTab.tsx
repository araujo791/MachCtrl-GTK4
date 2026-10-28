import React from 'react';
import { Battery, Zap } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const EnergiaTab: React.FC = () => {
  const { battery, powerMode, setPowerMode, availableModes, energyError, t } = useMachCtrl();

  const profiles = [
    { id: 'economia' as const, name: t('Economia'), desc: t('Baixo consumo · Silencioso') },
    { id: 'equilibrado' as const, name: t('Equilibrado'), desc: t('Desempenho adaptativo') },
    { id: 'desempenho' as const, name: t('Desempenho'), desc: t('Máximo desempenho · Turbo') },
  ].filter((p) => availableModes.includes(p.id));

  const statusText = battery
    ? battery.status === 'charging' ? t('Carregando')
      : battery.status === 'full' ? t('Carga completa')
      : battery.status === 'discharging' ? t('Descarregando')
      : battery.ac_online ? t('Na tomada') : t('Bateria')
    : '';
  const health = battery?.health_pct != null ? Math.round(battery.health_pct) : null;
  const num = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d));

  return (
    <div className="space-y-6 page-root animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{t('Perfis de Energia & Bateria')}</h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          {t('Ajuste simplificado para os modos de Desempenho, Equilibrado e Economia de Bateria com detalhamento de saúde')}
        </p>
      </div>

      {battery && (
        <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-6">
          <div>
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0 shadow-lg shadow-emerald-500/20">
                <Battery className="w-6 h-6" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white">{battery.percent.toFixed(0)}%</span>
                <span className="text-xs font-mono text-emerald-400">{statusText}</span>
                {battery.power_w != null && battery.power_w > 0 && (
                  <span className="text-xs font-mono text-white/50">· {battery.power_w.toFixed(1)} W</span>
                )}
                {battery.hours_left != null && battery.hours_left > 0 && (
                  <span className="text-xs font-mono text-white/50">· {Math.floor(battery.hours_left)}h{String(Math.round((battery.hours_left % 1) * 60)).padStart(2, '0')}</span>
                )}
              </div>
            </div>
            <div className="mt-4 w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full shadow-xs bg-gradient-to-r ${battery.percent < 20 ? 'from-rose-500 to-red-400' : 'from-emerald-500 to-teal-400'}`}
                style={{ width: `${battery.percent}%` }}
              />
            </div>
          </div>

          {health != null && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white font-medium">{t('Saúde da bateria')}</span>
                <span className={`font-bold ${health >= 80 ? 'text-emerald-400' : health >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{health}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full shadow-xs bg-gradient-to-r ${health >= 80 ? 'from-emerald-500 to-teal-400' : health >= 60 ? 'from-orange-500 to-amber-400' : 'from-rose-500 to-red-400'}`}
                  style={{ width: `${Math.min(100, health)}%` }}
                />
              </div>
              <p className="text-[11px] text-white/45 font-mono">
                {t('Capacidade atual de carga comparada à de fábrica. Abaixo de 60% a bateria já dura bem menos.')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-3 border-t border-white/10 text-xs font-mono">
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">{t('Tensão')}</span>
              <strong className="text-white block mt-0.5">{battery.voltage_v != null ? `${num(battery.voltage_v, 2)} V` : '—'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">{t('Capacidade')}</span>
              <strong className="text-white block mt-0.5">
                {battery.full_wh != null ? `${num(battery.full_wh)} Wh` : '—'}{battery.design_wh != null ? ` / ${num(battery.design_wh)} Wh` : ''}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">{t('Tecnologia')}</span>
              <strong className="text-white block mt-0.5">{battery.technology ?? '—'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">{t('Ciclos')}</span>
              <strong className="text-white block mt-0.5">{battery.cycles ? battery.cycles : '—'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">{t('Modelo')}</span>
              <strong className="text-white block mt-0.5 truncate" title={[battery.manufacturer, battery.model].filter(Boolean).join(' ')}>
                {[battery.manufacturer, battery.model].filter(Boolean).join(' · ') || '—'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">{t('Fonte')}</span>
              <strong className={`block mt-0.5 ${battery.ac_online ? 'text-emerald-400' : 'text-amber-400'}`}>
                {battery.ac_online ? t('NA TOMADA') : t('BATERIA')}
              </strong>
            </div>
          </div>
        </div>
      )}

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
                    {t('ATIVO')}
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
                {isActive ? t('Ativo') : t('Aplicar')}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-mono text-white/40 text-center sm:text-left">
        {energyError ? <span className="text-rose-400">{energyError}</span> : t('Aplicar perfil requer privilégios (escrita em /sys).')}
      </p>
    </div>
  );
};
