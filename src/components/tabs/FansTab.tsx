import React from 'react';
import { Fan, TrendingUp } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';
import { FanMode } from '../../types/machctrl';

const MODE_LABEL: Record<FanMode, string> = { auto: 'Automático', manual: 'Manual', max: 'Máximo', curve: 'Curva' };

export const FansTab: React.FC = () => {
  const { fans, fansLoaded, setFanMode, setFanManualPct, openCurveEditor, t } = useMachCtrl();

  return (
    <div className="space-y-6 page-root animate-in fade-in duration-300">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{t('Controle de Ventoinhas (Fans)')}</span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/25">
              PWM / RPM
            </span>
          </h2>
          <p className="text-xs text-white/50 font-mono mt-0.5">
            {t('Controle de rotação por hardware e curvas térmicas com animação fluida')}
          </p>
        </div>

      </div>

      {fansLoaded && fans.length === 0 && (
        <div className="text-sm font-mono text-white/50">{t('Nenhuma ventoinha detectada')}</div>
      )}

      {/* Fan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {fans.map((fan) => {
          const isGpu = fan.type === 'GPU';
          const isSpinning = fan.rpm > 0;
          const spinDuration = isSpinning ? Math.max(0.25, 2400 / fan.rpm) : 0;

          return (
            <div
              key={fan.id}
              className="glass-card rounded-[30px] p-6 border border-white/10 flex flex-col justify-between space-y-5 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle ambient backlight inside card */}
              <div
                className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-[60px] pointer-events-none ${
                  isGpu ? 'bg-purple-500/15' : 'bg-orange-500/15'
                }`}
              />

              {/* Header: Spinning Turbine Fan + Name + Badge + RPM */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3.5">
                  {/* Multi-blade turbine fan with rotating aerodynamic animation */}
                  <div
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center border shadow-lg relative transition-all ${
                      isGpu
                        ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 shadow-purple-500/20'
                        : 'bg-orange-500/15 border-orange-500/30 text-orange-400 shadow-orange-500/20'
                    }`}
                  >
                    <Fan
                      className="w-7 h-7 stroke-[1.8]"
                      style={{
                        animation: isSpinning ? `spin ${spinDuration}s linear infinite` : 'none',
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                          isGpu
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        }`}
                      >
                        {fan.type}
                      </span>
                      <h3 className="font-bold text-sm text-white">
                        {fan.name}
                      </h3>
                    </div>
                    <div className="text-[11px] font-mono text-white/50 mt-1">
                      {t('modo:')}{' '}
                      <strong
                        className={
                          !fan.controllable
                            ? 'text-white/40'
                            : fan.mode === 'auto'
                            ? 'text-emerald-400'
                            : fan.mode === 'curve'
                            ? 'text-purple-400'
                            : 'text-cyan-400'
                        }
                      >
                        {fan.controllable ? t(MODE_LABEL[fan.mode]) : t('somente leitura')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Bold RPM Counter */}
                <div className="text-right font-mono">
                  <div className="text-2xl font-extrabold text-cyan-400">
                    {fan.rpm}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">
                    RPM
                  </div>
                </div>
              </div>

              {/* PWM Progress Bar */}
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/50">{t('PWM atual')}</span>
                  <span className="font-bold text-white">
                    {fan.pwmPercent}%
                  </span>
                </div>

                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isGpu
                        ? 'bg-gradient-to-r from-purple-500 to-fuchsia-400 shadow-xs shadow-purple-500/50'
                        : 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-xs shadow-orange-500/50'
                    }`}
                    style={{ width: `${fan.pwmPercent}%` }}
                  />
                </div>

                {fan.controllable && fan.mode === 'manual' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={fan.pwmPercent}
                      onChange={(e) => setFanManualPct(fan.id, parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Mode Buttons */}
              {fan.controllable && (
              <div className="pt-3 border-t border-white/10 space-y-2.5 relative z-10">
                <div className="flex items-center gap-1.5">
                  {(['auto', 'manual', 'max'] as const).map((m) => {
                    const isSelected = fan.mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setFanMode(fan.id, m)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? m === 'auto'
                              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/15 shadow-sm shadow-emerald-500/20'
                              : m === 'max'
                              ? 'border-rose-500 text-rose-400 bg-rose-500/15 shadow-sm shadow-rose-500/20'
                              : 'border-cyan-500 text-cyan-400 bg-cyan-500/15 shadow-sm shadow-cyan-500/20'
                            : 'border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {t(MODE_LABEL[m])}
                      </button>
                    );
                  })}

                  <button
                      onClick={() => setFanMode(fan.id, 'curve')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
                        fan.mode === 'curve'
                          ? 'border-purple-500 text-purple-400 bg-purple-500/15 shadow-sm shadow-purple-500/20'
                          : 'border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {t('Curva')}
                    </button>
                </div>

                {fan.mode === 'curve' && (
                  <button
                    onClick={() => openCurveEditor(fan.id)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t('Curva ativa — clique para editar')}</span>
                  </button>
                )}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
