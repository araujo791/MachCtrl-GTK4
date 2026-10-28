import React from 'react';
import { X, Check, Fan } from 'lucide-react';
import { useMachCtrl } from '../context/MachCtrlContext';

export const CurveModal: React.FC = () => {
  const { curveFanId, closeCurveEditor, curvePoints, setCurvePoint, applyCurve, fans, t } = useMachCtrl();
  const fan = fans.find((f) => f.id === curveFanId);

  if (!curveFanId || !fan) return null;
  const fanCurve = [...curvePoints];

  const svgWidth = 500;
  const svgHeight = 220;
  const padding = 36;

  const getCoordinates = (temp: number, speed: number) => {
    const x = padding + (Math.max(0, Math.min(100, temp)) / 100) * (svgWidth - padding * 2);
    const y = svgHeight - padding - (speed / 100) * (svgHeight - padding * 2);
    return { x, y };
  };

  const pathPoints = fanCurve.map((pt) => getCoordinates(pt.temp, pt.pct));
  const lineD = pathPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const areaD = `${lineD} L ${pathPoints[pathPoints.length - 1].x} ${svgHeight - padding} L ${pathPoints[0].x} ${svgHeight - padding} Z`;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl glass-panel rounded-[32px] border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Fan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {t('Editor de Curva Térmica (PWM vs Temp °C)')} · {fan.name}
              </h3>
              <p className="text-xs text-white/50 font-mono">
                {t('Ajuste os nós de disparo térmico para as ventoinhas')}
              </p>
            </div>
          </div>

          <button
            onClick={closeCurveEditor}
            className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SVG Viewport */}
        <div className="p-6 space-y-4">
          <div className="curve-box bg-black/30 rounded-2xl p-4 border border-white/10 flex flex-col items-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="modalCurveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[25, 50, 75, 100].map((val) => {
                const y = svgHeight - padding - (val / 100) * (svgHeight - padding * 2);
                return (
                  <g key={`y-${val}`}>
                    <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" strokeWidth="0.8" />
                    <text x={padding - 6} y={y + 3} textAnchor="end" fill="rgba(255, 255, 255, 0.4)" fontSize="9" fontFamily="monospace">
                      {val}%
                    </text>
                  </g>
                );
              })}

              {[30, 50, 70, 90].map((temp) => {
                const x = padding + (temp / 100) * (svgWidth - padding * 2);
                return (
                  <g key={`x-${temp}`}>
                    <line x1={x} y1={padding} x2={x} y2={svgHeight - padding} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" strokeWidth="0.8" />
                    <text x={x} y={svgHeight - padding + 14} textAnchor="middle" fill="rgba(255, 255, 255, 0.4)" fontSize="9" fontFamily="monospace">
                      {temp}°C
                    </text>
                  </g>
                );
              })}

              <path d={areaD} fill="url(#modalCurveGrad)" />
              <path d={lineD} fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' }} />

              {fanCurve.map((pt, idx) => {
                const { x, y } = getCoordinates(pt.temp, pt.pct);
                return (
                  <g key={idx}>
                    <circle cx={x} cy={y} r="6" fill="#a855f7" stroke="#ffffff" strokeWidth="2" />
                    <text x={x} y={y - 10} textAnchor="middle" fill="#c084fc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {pt.pct}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Node Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {fanCurve.map((pt, idx) => (
              <div key={idx} className="p-3 bg-white/[0.04] rounded-2xl border border-white/10 text-center space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[9px] text-white/40 uppercase">{t('Ponto')} {idx + 1}</span>
                  <span className="font-bold text-purple-400">{pt.pct}%</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-white/60">
                  <input
                    type="number"
                    min={20}
                    max={100}
                    value={pt.temp}
                    onChange={(e) => setCurvePoint(idx, { temp: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                    aria-label="°C"
                    className="w-12 bg-white/10 border border-white/15 rounded-lg text-center text-orange-300 py-0.5"
                  />
                  <span>°C</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={pt.pct}
                  onChange={(e) => setCurvePoint(idx, { pct: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-400 h-1.5 bg-white/15 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 flex justify-end">
          <button
            onClick={applyCurve}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg shadow-purple-500/25 transition-all active:scale-95 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{t('Aplicar e Fechar')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
