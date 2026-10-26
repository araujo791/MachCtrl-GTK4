import React from 'react';
import { Trash2, CheckCircle2, RotateCw } from 'lucide-react';
import { useMachCtrl } from '../../context/MachCtrlContext';

export const LimpezaTab: React.FC = () => {
  const { cleanupTasks, runCleanupTask, runAllCleanup, isCleaningAll } = useMachCtrl();

  const totalSizeMb = cleanupTasks.reduce((acc, t) => acc + t.sizeMb, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Limpeza do Sistema
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
          Manutenção ágil para remover pacotes órfãos, esvaziar cache do Pacman, limpar logs do Journal e lixeira
        </p>
      </div>

      {/* Top Action Card */}
      <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-5 sm:p-6 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Limpeza do sistema
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
            8 tarefas de limpeza · remove caches, logs e arquivos temporários ({totalSizeMb} MB recuperáveis)
          </p>
        </div>

        <button
          onClick={runAllCleanup}
          disabled={isCleaningAll || totalSizeMb === 0}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-xs transition-all active:scale-95 ${
            totalSizeMb === 0
              ? 'bg-slate-300 dark:bg-white/10 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/25'
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
            className="bg-white/80 dark:bg-[#121826]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                  {task.title}
                </h4>
                {task.isRoot && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                    ROOT
                  </span>
                )}
                {task.sizeMb > 0 && (
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    ({task.sizeMb} MB)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
                {task.description}
              </p>
            </div>

            <button
              onClick={() => runCleanupTask(task.id)}
              disabled={task.cleaned || task.sizeMb === 0}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
                task.cleaned || task.sizeMb === 0
                  ? 'text-emerald-500 bg-emerald-500/10 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {task.cleaned || task.sizeMb === 0 ? 'Limpo' : '—'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
