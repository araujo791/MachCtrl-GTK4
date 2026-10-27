import React from 'react';
import { Trash2, CheckCircle2, RotateCw } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const LimpezaTab: React.FC = () => {
  const { cleanupTasks, runCleanupTask, runAllCleanup, isCleaningAll } = useMachCtrl();

  const totalSizeMb = cleanupTasks.reduce((acc, t) => acc + t.sizeMb, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Limpeza & Manutenção do Sistema
        </h2>
        <p className="text-xs text-white/50 font-mono mt-0.5">
          Manutenção ágil para remover pacotes órfãos, esvaziar cache do Pacman, limpar logs do Journal e lixeira
        </p>
      </div>

      {/* Top Action Card */}
      <div className="glass-card rounded-[30px] p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-white">
            Limpeza do Sistema
          </h3>
          <p className="text-xs text-white/50 font-mono mt-0.5">
            8 tarefas ativas · remove caches, logs e temporários ({totalSizeMb} MB recuperáveis)
          </p>
        </div>

        <button
          onClick={runAllCleanup}
          disabled={isCleaningAll || totalSizeMb === 0}
          className={`px-6 py-3 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
            totalSizeMb === 0
              ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
              : 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/30'
          }`}
        >
          {isCleaningAll ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Limpando sistema...</span>
            </>
          ) : totalSizeMb === 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Sistema 100% Limpo</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span>Limpar tudo</span>
            </>
          )}
        </button>
      </div>

      {/* 8 Cleanup Task Rows */}
      <div className="space-y-3">
        {cleanupTasks.map((task) => (
          <div
            key={task.id}
            className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all duration-200"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2.5">
                <h4 className="font-bold text-sm text-white">
                  {task.title}
                </h4>
                {task.isRoot && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    ROOT
                  </span>
                )}
                {task.sizeMb > 0 && (
                  <span className="text-[10px] font-mono font-bold text-white/40">
                    ({task.sizeMb} MB)
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50 font-mono truncate">
                {task.description}
              </p>
            </div>

            <button
              onClick={() => runCleanupTask(task.id)}
              disabled={task.cleaned || task.sizeMb === 0}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all shrink-0 ${
                task.cleaned || task.sizeMb === 0
                  ? 'text-emerald-400 bg-emerald-500/15 font-bold border border-emerald-500/25'
                  : 'text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {task.cleaned || task.sizeMb === 0 ? 'Limpo' : 'Executar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
