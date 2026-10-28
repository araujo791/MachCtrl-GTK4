import React, { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

const SERVICE_TIPS: Record<string, [string, string]> = {
  'ananicy-cpp': ['Ajusta a prioridade dos programas automaticamente pra deixar o sistema mais fluido.', 'Automatically adjusts program priorities to keep the system smooth.'],
  irqbalance: ['Distribui as interrupções de hardware entre os núcleos da CPU.', 'Spreads hardware interrupts across CPU cores.'],
  bluetooth: ['Serviço de Bluetooth. Desligue se não usa, pra economizar recursos.', 'Bluetooth service. Turn off if unused to save resources.'],
  cups: ['Serviço de impressão. Desligue se não tem impressora.', 'Printing service. Turn off if you have no printer.'],
  'fstrim.timer': ['Faz a limpeza (TRIM) dos SSDs periodicamente, mantendo a velocidade.', 'Periodically TRIMs SSDs to keep them fast.'],
  tlp: ['Gerenciador de energia (mais foco em notebooks).', 'Power manager (mostly for laptops).'],
};

const Tip: React.FC<{ text?: string }> = ({ text }) => (
  <span title={text}><HelpCircle className="w-3.5 h-3.5 text-white/40" /></span>
);

// Slider que só envia ao backend ao soltar (evita gravar em /proc a cada pixel).
const CommitSlider: React.FC<{ value: number; min: number; max: number; step?: number; onCommit: (v: number) => void }> = ({ value, min, max, step = 1, onCommit }) => {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="space-y-1.5">
      <input
        type="range" min={min} max={max} step={step} value={v}
        onChange={(e) => setV(parseInt(e.target.value, 10))}
        onPointerUp={() => onCommit(v)}
        onKeyUp={() => onCommit(v)}
        className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
      />
      <div className="text-right text-xs font-mono font-bold text-cyan-400">{v}</div>
    </div>
  );
};

const badge = (type: string) => {
  const k = type.toLowerCase();
  const label = k === 'nvme' ? 'NVMe' : k === 'ssd' ? 'SSD' : k === 'usb' ? 'USB' : 'HDD';
  const cls = k === 'nvme'
    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
    : k === 'ssd'
    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
    : k === 'usb'
    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
    : 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${cls}`}>{label}</span>;
};

const selectCls = '[color-scheme:dark] bg-[#1b2132] text-white px-3 py-1.5 rounded-xl border border-white/15 font-mono text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-400';
const optCls = 'bg-[#121622] text-white';

export const AjustesTab: React.FC = () => {
  const { tune, applyTune, lang, t } = useMachCtrl();

  if (!tune) return <div className="text-sm font-mono text-white/50 p-6">{t('Lendo sensores…')}</div>;

  const ccOptions = Array.from(new Set([...(tune.network.available_cc || []), ...(tune.network.bbr_available ? ['bbr'] : [])]));
  const hasMemory = tune.swappiness != null || tune.cache_pressure != null || tune.thp != null;
  const hasDirty = tune.dirty_ratio != null || tune.dirty_bg_ratio != null;

  return (
    <div className="space-y-6 page-root animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{t('Ajustes do Sistema (Kernel Tuning)')}</h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          {t('Otimizações de baixo nível para memória, rede, dirty pages e agendadores de E/S no Linux CachyOS')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="space-y-5">
          {hasMemory && (
            <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
              <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">{t('MEMÓRIA & SWAP')}</h3>

              {tune.swappiness != null && (
                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                    {t('Swappiness')} <Tip text={t('Quanto o kernel prefere usar swap em vez de liberar cache.')} />
                  </div>
                  <CommitSlider value={tune.swappiness} min={0} max={100} onCommit={(v) => applyTune('set_swappiness', { value: v })} />
                </div>
              )}

              {tune.cache_pressure != null && (
                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                    {t('Pressão de cache (vfs)')} <Tip text={t('Quão rápido o kernel recupera cache de diretórios/inodes.')} />
                  </div>
                  <CommitSlider value={tune.cache_pressure} min={0} max={200} onCommit={(v) => applyTune('set_cache_pressure', { value: v })} />
                </div>
              )}

              {tune.thp != null && (
                <div className="flex items-center justify-between text-xs font-mono pt-2">
                  <span className="text-white/70 flex items-center gap-1.5">
                    {t('Huge Pages')} <Tip text={t('Usa páginas grandes de memória: bom para jogos/bancos de dados.')} />
                  </span>
                  <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-xl border border-white/10">
                    {(['always', 'madvise', 'never'] as const).map((hp) => (
                      <button
                        key={hp}
                        onClick={() => applyTune('set_thp', { mode: hp })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          tune.thp === hp ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-xs' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {hp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tune.network.current_cc && (
            <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
              <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">{t('REDE & TCP')}</h3>
              <div className="flex items-center justify-between gap-3 text-xs font-mono">
                <span className="text-white/70 flex items-center gap-1.5">
                  {t('Controle de congestionamento TCP')} <Tip text={t('Algoritmo que decide como a conexão reage a congestionamento.')} />
                </span>
                <select
                  value={tune.network.current_cc}
                  onChange={(e) => applyTune('set_congestion_control', { algo: e.target.value })}
                  aria-label={t('Controle de congestionamento TCP')}
                  className={selectCls}
                >
                  {ccOptions.map((c) => <option key={c} value={c} className={optCls}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {hasDirty && (
            <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
              <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">{t('ESCRITA EM DISCO (DIRTY PAGES)')}</h3>
              {tune.dirty_bg_ratio != null && (
                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                    {t('Início da gravação (bg)')} <Tip text={t('% de memória suja que dispara a gravação em segundo plano.')} />
                  </div>
                  <CommitSlider value={tune.dirty_bg_ratio} min={1} max={50} onCommit={(v) => applyTune('set_dirty_bg_ratio', { value: v })} />
                </div>
              )}
              {tune.dirty_ratio != null && (
                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                    {t('Limite de gravação')} <Tip text={t('% de memória suja em que programas passam a esperar a gravação.')} />
                  </div>
                  <CommitSlider value={tune.dirty_ratio} min={1} max={80} onCommit={(v) => applyTune('set_dirty_ratio', { value: v })} />
                </div>
              )}
            </div>
          )}
        </div>

        {tune.services.length > 0 && (
          <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
            <div>
              <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">{t('SERVIÇOS SYSTEMD')}</h3>
              <p className="text-[11px] text-white/45 font-mono mt-0.5">{t('Liga/desliga daemons do sistema em tempo real e na inicialização.')}</p>
            </div>
            <div className="space-y-3 pt-2">
              {tune.services.map((svc) => {
                const tip = SERVICE_TIPS[svc.name]?.[lang === 'en' ? 1 : 0];
                return (
                  <div key={svc.name} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{svc.name}</span>
                      {tip && <Tip text={tip} />}
                    </div>
                    <button
                      onClick={() => applyTune('set_service', { name: svc.name, enable: !svc.active })}
                      aria-label={svc.name}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shadow-sm ${svc.active ? 'bg-emerald-500' : 'bg-white/15'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${svc.active ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tune.io_schedulers.length > 0 && (
          <div className="glass-card rounded-[30px] p-6 border border-white/10 space-y-4">
            <div>
              <h3 className="text-xs font-bold font-mono tracking-wider text-white/70 uppercase">{t('AGENDADOR DE I/O')}</h3>
              <p className="text-[11px] text-white/45 font-mono mt-0.5">{t("Como o kernel ordena E/S. 'none' é ideal para NVMe; 'bfq' para HDD.")}</p>
            </div>
            <div className="space-y-2.5 pt-1">
              {tune.io_schedulers.map((d) => (
                <div key={d.device} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-white">{d.device}</span>
                    {badge(d.disk_type)}
                  </div>
                  <select
                    value={d.current}
                    onChange={(e) => applyTune('set_io_scheduler', { device: d.device, scheduler: e.target.value })}
                    aria-label={`I/O ${d.device}`}
                    className={selectCls}
                  >
                    {d.available.map((s) => <option key={s} value={s} className={optCls}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
