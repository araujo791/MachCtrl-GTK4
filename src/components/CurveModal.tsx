import React from 'react';
import { X, RotateCcw, Check, Sparkles, Fan } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

export const CurveModal: React.FC = () => {
  const { isCurveEditorOpen, setIsCurveEditorOpen, fanCurve, updateFanCurvePoint } = useMachCtrl();

  if (!isCurveEditorOpen) return null;

  const svgWidth = 500;
  const svgHeight = 220;
  const padding = 36;

  const getCoordinates = (temp: number, speed: number) => {
    const x = padding + (temp / 100) * (svgWidth - padding * 2);
    const y = svgHeight - padding - (speed / 100) * (svgHeight - padding * 2);
    return { x, y };
  };

  const pathPoints = fanCurve.map((pt) => getCoordinates(pt.temp, pt.speed));
  const lineD = pathPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const areaD = `${lineD} L ${pathPoints[pathPoints.length - 1].x} ${svgHeight - padding} L ${pathPoints[0].x} ${svgHeight - padding} Z`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-[#141b29] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-700/40">
              <Fan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Editor de Curva Térmica (PWM vs Temp °C)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Ajuste os nós de disparo térmico para a GPU e ventoinhas da CPU
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCurveEditorOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SVG Viewport */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-[#0c121e] rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="modalCurveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[25, 50, 75, 100].map((val) => {
                const y = svgHeight - padding - (val / 100) * (svgHeight - padding * 2);
                return (
                  <g key={`y-${val}`}>
                    <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="0.8" className="dark:stroke-slate-800" />
                    <text x={padding - 6} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      {val}%
                    </text>
                  </g>
                );
              })}

              {[30, 50, 70, 90].map((temp) => {
                const x = padding + (temp / 100) * (svgWidth - padding * 2);
                return (
                  <g key={`x-${temp}`}>
                    <line x1={x} y1={padding} x2={x} y2={svgHeight - padding} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="0.8" className="dark:stroke-slate-800" />
                    <text x={x} y={svgHeight - padding + 14} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      {temp}°C
                    </text>
                  </g>
                );
              })}

              <path d={areaD} fill="url(#modalCurveGrad)" />
              <path d={lineD} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {fanCurve.map((pt, idx) => {
                const { x, y } = getCoordinates(pt.temp, pt.speed);
                return (
                  <g key={idx}>
                    <circle cx={x} cy={y} r="6" fill="#8b5cf6" stroke="#ffffff" strokeWidth="2" className="dark:stroke-slate-900 shadow-sm" />
                    <text x={x} y={y - 10} textAnchor="middle" fill="#8b5cf6" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {pt.speed}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Node Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {fanCurve.map((pt, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400">{pt.temp}°C</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{pt.speed}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={pt.speed}
                  onChange={(e) => updateFanCurvePoint(idx, parseInt(e.target.value, 10))}
                  className="w-full accent-purple-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={() => setIsCurveEditorOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar e Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
