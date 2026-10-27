import React from 'react';
import { Heart, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

export const SobreTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-xl mx-auto py-6 animate-in fade-in duration-300">
      <div className="glass-card rounded-[36px] p-8 sm:p-10 border border-white/10 text-center space-y-6 relative overflow-hidden">
        {/* Soft Amber Glow behind card */}
        <div className="absolute top-0 right-1/4 w-60 h-60 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo with Soft Glow */}
        <div className="flex flex-col items-center relative z-10">
          <div className="relative group mb-4">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500" />
            <img
              src="/favicon.png"
              alt="MachCtrl 3.0"
              className="relative w-20 h-20 rounded-3xl object-contain bg-[#121620] ring-1 ring-white/15 shadow-2xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>MachCtrl</span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              3.0
            </span>
          </h2>
          <p className="text-xs text-white/50 font-mono mt-1">
            Covenant · CachyOS Linux
          </p>
        </div>

        <p className="text-xs text-white/60 leading-relaxed font-sans max-w-md mx-auto relative z-10">
          Monitor e Otimizador de Hardware nativo para Linux. Projetado com telemetria direta via sysfs/procfs, curvas de ventoinhas e sintonia fina de desempenho.
        </p>

        {/* Radiant Glass Donation Card (Inspired by the glowing Visa card in screenshot) */}
        <div className="relative rounded-[28px] p-6 bg-gradient-to-tr from-amber-500/80 via-orange-500/80 to-rose-500/80 text-white shadow-2xl shadow-orange-500/25 border border-white/20 text-left overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 fill-white text-white drop-shadow-md" />
              <span className="font-bold text-sm tracking-wide uppercase">
                Apoiar o MachCtrl
              </span>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-md border border-white/20 font-bold">
              PayPal Oficial
            </span>
          </div>

          <p className="text-xs text-white/90 leading-relaxed mb-6 font-medium relative z-10">
            Se o MachCtrl te ajuda a extrair o máximo do seu sistema e você deseja incentivar novas melhorias contínuas, faça uma doação via PayPal.
          </p>

          <a
            href="https://www.paypal.com/donate/?business=andersonhenrique23%40gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs text-slate-900 bg-white hover:bg-slate-100 shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 relative z-10"
          >
            <span>Fazer Doação pelo PayPal</span>
            <ExternalLink className="w-4 h-4 text-slate-800" />
          </a>
        </div>

        <div className="text-[11px] font-mono text-white/40 relative z-10">
          Agradecemos imensamente o seu apoio à comunidade Open Source!
        </div>
      </div>
    </div>
  );
};
