import React from 'react';
import { Trash2, CheckCircle2, RotateCw } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

function bytesHuman(b: number): string {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

export const LimpezaTab: React.FC = () => {
  const { cleanupTasks, runCleanupTask, runAllCleanup, isCleaningAll, totalFreedBytes, t } = useMachCtrl();
  const anyRunning = isCleaningAll || cleanupTasks.some((x) => x.status === 'running');
  const allDone = cleanupTasks.length > 0 && cleanupTasks.every((x) => x.status === 'done');

  return (
    <div className="space-y-6 page-root animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{t('Limpeza & Manutenção do Sistema')}</h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          {t('Manutenção ágil para remover pacotes órfãos, esvaziar cache do Pacman, limpar logs do Journal e lixeira')}
        </p>
      </div>

      <div className="glass-card rounded-[30px] p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-white">{t('Limpeza do Sistema')}</h3>
          <p className="text-xs text-white/50 font-mono mt-0.5">
            {cleanupTasks.length} {t('tarefas disponíveis · remove caches, logs e temporários')}
          </p>
        </div>

        <div className="flex items-center gap-5">
          {totalFreedBytes > 0 && !anyRunning && (
            <div className="text-right font-mono">
              <div className="text-[10px] text-white/40">{t('TOTAL LIBERADO')}</div>
              <div className="text-xl font-extrabold text-emerald-400">{bytesHuman(totalFreedBytes)}</div>
            </div>
          )}
          <button
            onClick={runAllCleanup}
            disabled={anyRunning || cleanupTasks.length === 0}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-lg transition-all active:scale-95 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/30 disabled:opacity-60"
          >
            {isCleaningAll ? (
              <><RotateCw className="w-4 h-4 animate-spin" /><span>{t('Limpando sistema...')}</span></>
            ) : allDone ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-200" /><span>{t('Limpo')}</span></>
            ) : (
              <><Trash2 className="w-4 h-4" /><span>{t('Limpar tudo')}</span></>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {cleanupTasks.map((task) => (
          <div key={task.id} className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all duration-200">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2.5">
                <h4 className="font-bold text-sm text-white">{task.title}</h4>
                {task.isRoot && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">ROOT</span>
                )}
              </div>
              <p className="text-xs text-white/50 font-mono truncate">{task.description}</p>
              {task.resultText && (
                <p className={`text-[11px] font-mono truncate ${task.status === 'failed' ? 'text-rose-400' : 'text-emerald-400'}`}>{task.resultText}</p>
              )}
            </div>

            <button
              onClick={() => runCleanupTask(task.id)}
              disabled={anyRunning}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all shrink-0 border ${
                task.status === 'done'
                  ? 'text-emerald-400 bg-emerald-500/15 font-bold border-emerald-500/25'
                  : task.status === 'failed'
                  ? 'text-rose-400 bg-rose-500/15 font-bold border-rose-500/25'
                  : 'text-white/60 hover:text-white hover:bg-white/10 border-white/10'
              }`}
            >
              {task.status === 'running' ? t('Executando…') : task.status === 'done' ? t('Limpo') : task.status === 'failed' ? t('Falhou') : t('Executar')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
