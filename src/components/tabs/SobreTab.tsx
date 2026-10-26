import React from 'react';
import { Heart, ExternalLink, ShieldCheck } from 'lucide-react';

export const SobreTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-xl mx-auto py-8 animate-in fade-in duration-300">
      <div className="bg-white/80 dark:bg-[#121826]/80 rounded-3xl p-8 border border-slate-200/70 dark:border-white/5 shadow-xs backdrop-blur-md text-center space-y-6">
        {/* Logo with Soft Glow */}
        <div className="flex flex-col items-center">
          <div className="relative group mb-4">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl blur-md opacity-40 group-hover:opacity-75 transition duration-500" />
            <img
              src="/favicon.png"
              alt="MachCtrl 3.0"
              className="relative w-20 h-20 rounded-3xl object-contain bg-slate-900 ring-1 ring-white/10 shadow-lg"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>MachCtrl</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-400/20">
              3.0
            </span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
            Covenant · CachyOS
          </p>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans max-w-md mx-auto">
          Monitor e Otimizador de Hardware nativo para Linux. Desenvolvido para oferecer controle total sobre frequências, ventoinhas, energia e manutenção do sistema.
        </p>

        {/* Exclusive PayPal Donation Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-500/5 via-cyan-500/5 to-transparent border border-blue-500/20 dark:border-cyan-400/20 space-y-4">
          <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-cyan-400 font-bold text-sm">
            <Heart className="w-5 h-5 fill-current text-rose-500" />
            <span>Apoie o Projeto</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Se o MachCtrl é útil para o seu dia a dia e você deseja incentivar as melhorias contínuas, faça uma doação através do PayPal.
          </p>

          <a
            href="https://www.paypal.com/donate/?business=andersonhenrique23%40gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-6 rounded-2xl font-extrabold text-xs text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 group"
          >
            <span>Doar com PayPal</span>
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
          Muito obrigado pelo seu apoio e incentivo ao código aberto!
        </div>
      </div>
    </div>
  );
};
