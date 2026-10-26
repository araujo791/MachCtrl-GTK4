import React from 'react';
import { Fan, TrendingUp } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const FansTab: React.FC = () => {
  const { fans, updateFanMode, updateFanPwm, setIsCurveEditorOpen } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Controle de Ventoinhas (Fans)</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 font-bold border border-blue-400/20">
              PWM / RPM
            </span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
            Controle de rotação por hardware e curvas térmicas com animação em tempo real
          </p>
        </div>

        <button
          onClick={() => setIsCurveEditorOpen(true)}
          className="px-4 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-600 dark:text-purple-300 border border-purple-400/30 flex items-center gap-2 shadow-xs transition-all active:scale-95 self-start sm:self-auto"
        >
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <span>Editor de Curvas Térmicas</span>
        </button>
      </div>

      {/* Fan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {fans.map((fan) => {
          const isGpu = fan.type === 'GPU';
          const isSpinning = fan.rpm > 0;
          const spinDuration = isSpinning ? Math.max(0.25, 2400 / fan.rpm) : 0;

          return (
            <div
              key={fan.id}
              className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 sm:p-6 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col justify-between space-y-4 hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all duration-300 group"
            >
              {/* Header: Spinning Turbine Fan + Name + Badge + RPM */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  {/* Multi-blade turbine fan with rotating aerodynamic glow */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs relative transition-all ${
                      isGpu
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                        : 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                    }`}
                  >
                    <Fan
                      className="w-6 h-6 stroke-[1.8]"
                      style={{
                        animation: isSpinning ? `spin ${spinDuration}s linear infinite` : 'none',
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md uppercase ${
                          isGpu
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                            : 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
                        }`}
                      >
                        {fan.type}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                        {fan.name}
                      </h3>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      modo:{' '}
                      <strong
                        className={
                          fan.mode === 'Automático'
                            ? 'text-emerald-500'
                            : fan.mode === 'Curva'
                            ? 'text-purple-500'
                            : 'text-blue-500'
                        }
                      >
                        {fan.mode}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Big Bold RPM */}
                <div className="text-right font-mono">
                  <div className="text-xl font-extrabold text-blue-600 dark:text-cyan-400">
                    {fan.rpm}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    RPM
                  </div>
                </div>
              </div>

              {/* PWM Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">PWM atual</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {fan.pwmPercent}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden p-0.5">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      isGpu ? 'bg-purple-500 shadow-sm shadow-purple-500/50' : 'bg-orange-500 shadow-sm shadow-orange-500/50'
                    }`}
                    style={{ width: `${fan.pwmPercent}%` }}
                  />
                </div>

                {fan.mode === 'Manual' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={fan.pwmPercent}
                      onChange={(e) => updateFanPwm(fan.id, parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Mode Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                <div className="flex items-center gap-1.5">
                  {(['Automático', 'Manual', 'Máximo'] as const).map((m) => {
                    const isSelected = fan.mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => updateFanMode(fan.id, m)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? m === 'Automático'
                              ? 'border-emerald-500/80 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shadow-xs'
                              : m === 'Máximo'
                              ? 'border-rose-500/80 text-rose-600 dark:text-rose-400 bg-rose-500/10 shadow-xs'
                              : 'border-blue-500/80 text-blue-600 dark:text-blue-400 bg-blue-500/10 shadow-xs'
                            : 'border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}

                  {fan.hasCurveSupport && (
                    <button
                      onClick={() => updateFanMode(fan.id, 'Curva')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
                        fan.mode === 'Curva'
                          ? 'border-purple-500/80 text-purple-600 dark:text-purple-400 bg-purple-500/10 shadow-xs'
                          : 'border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      Curva
                    </button>
                  )}
                </div>

                {fan.hasCurveSupport && (
                  <button
                    onClick={() => setIsCurveEditorOpen(true)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-400/30 flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                    <span>Curva ativa — clique para editar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
