import React from 'react';
import { Fan, Sliders, TrendingUp, Sparkles, Check, Flame } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';
import { FanDevice } from '../../types/machctrl';

export const FansTab: React.FC = () => {
  const { fans, updateFanMode, updateFanPwm, setIsCurveEditorOpen } = useMachCtrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header title info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Controle de Ventoinhas (Fans)</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-700/30">
              PWM / RPM
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Monitoramento de rotação de hardware via ACPI/hwmon e controle dinâmico por curva
          </p>
        </div>

        <button
          onClick={() => setIsCurveEditorOpen(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50 flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Editor de Curvas Térmicas</span>
        </button>
      </div>

      {/* Fan Cards Grid (Matching exact fans.png screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {fans.map((fan) => {
          const isGpu = fan.type === 'GPU';
          const isSpinning = fan.rpm > 0;
          // Calculate spin animation duration (faster when higher RPM)
          const spinDuration = isSpinning ? Math.max(0.25, 2400 / fan.rpm) : 0;

          return (
            <div
              key={fan.id}
              className="bg-white dark:bg-[#141b29] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md"
            >
              {/* Card Header: Spinning Multi-blade Fan + Name + Badge + RPM */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Multi-blade turbine Fan Icon with spin animation */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs relative transition-all ${
                      isGpu
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800 text-purple-600 dark:text-purple-400'
                        : 'bg-orange-50 dark:bg-orange-950/40 border-orange-200/80 dark:border-orange-800 text-orange-600 dark:text-orange-400'
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
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          isGpu
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                            : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                        }`}
                      >
                        {fan.type}
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
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
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {fan.rpm}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
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

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isGpu ? 'bg-purple-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${fan.pwmPercent}%` }}
                  />
                </div>

                {/* If Manual Mode, show quick interactive slider */}
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

              {/* Mode Selection Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center gap-1.5">
                  {(['Automático', 'Manual', 'Máximo'] as const).map((m) => {
                    const isSelected = fan.mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => updateFanMode(fan.id, m)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-all border ${
                          isSelected
                            ? m === 'Automático'
                              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 font-bold'
                              : m === 'Máximo'
                              ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 font-bold'
                              : 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 font-bold'
                            : 'border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}

                  {/* GPU also supports 'Curva' button in screenshot */}
                  {fan.hasCurveSupport && (
                    <button
                      onClick={() => updateFanMode(fan.id, 'Curva')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-all border ${
                        fan.mode === 'Curva'
                          ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 font-bold'
                          : 'border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      Curva
                    </button>
                  )}
                </div>

                {/* If has curve or is GPU, show 'Curva ativa — clique para editar' button as in screenshot */}
                {fan.hasCurveSupport && (
                  <button
                    onClick={() => setIsCurveEditorOpen(true)}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-50/60 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/50 border border-purple-200/80 dark:border-purple-800/80 flex items-center justify-center gap-1.5 transition-all"
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
