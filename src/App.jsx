import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import fanBlade from "./assets/fan-blade.webp";
import appIcon from "./assets/app-icon.png";
import { STRINGS, detectLang } from "./i18n";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Cell,
} from "recharts";
import {
  LayoutDashboard, Cpu, MemoryStick, HardDrive, Fan, Zap,
  Trash2, Gauge, Info, Sun, Moon, Activity, Usb, Database,
  ArrowDown, ArrowUp, Minus, Square, X, Heart,
} from "lucide-react";

// ---------- temas ----------
const THEMES = {
  dark: {
    bg: "#0b0d12", panel: "#12151c", card: "#171b24", stroke: "#232936",
    text: "#e8ebf2", textDim: "#8b93a7", textFaint: "#5a6376",
  },
  light: {
    bg: "#f2f4f8", panel: "#ffffff", card: "#ffffff", stroke: "#e4e8f0",
    text: "#1a1f2b", textDim: "#5a6376", textFaint: "#9aa3b5",
  },
};
const ACCENT = {
  blue: "#3b82f6", cyan: "#22d3ee", green: "#34d399",
  orange: "#fb923c", red: "#f87171", purple: "#a78bfa", pink: "#f472b6",
};

const NAV = [
  { id: "overview", key: "nav_overview", icon: LayoutDashboard, accent: ACCENT.blue },
  { id: "cpu", key: "nav_cpu", icon: Cpu, accent: ACCENT.orange },
  { id: "memory", key: "nav_memory", icon: MemoryStick, accent: ACCENT.green },
  { id: "disks", key: "nav_disks", icon: HardDrive, accent: ACCENT.cyan },
  { id: "fans", key: "nav_fans", icon: Fan, accent: ACCENT.cyan },
  { id: "energy", key: "nav_energy", icon: Zap, accent: ACCENT.orange },
  { id: "cleaner", key: "nav_cleaner", icon: Trash2, accent: ACCENT.red },
  // { id: "tune", key: "nav_tune", icon: Gauge, accent: ACCENT.purple }, // oculto até finalizarmos o Ajuste
  { id: "about", key: "nav_about", icon: Info, accent: ACCENT.textDim },
];

const HISTORY = 40;
const tempColor = (tp) => (tp >= 80 ? ACCENT.red : tp >= 65 ? ACCENT.orange : ACCENT.green);

// ---------- pequenos componentes ----------
function Sparkline({ data, color, height = 48 }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={d} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
          fill={`url(#g-${color})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CoreCell({ t, core }) {
  const tempFrac = core.temp_c != null ? Math.min(100, ((core.temp_c - 30) / 60) * 100) : 0;
  return (
    <div style={{
      background: t.panel, border: `1px solid ${t.stroke}`, borderRadius: 8,
      padding: "6px 4px", position: "relative", overflow: "hidden", minHeight: 44,
    }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%",
        height: `${core.pct}%`, background: `${ACCENT.blue}22`, transition: "height 1s ease" }} />
      <div style={{ position: "absolute", right: 3, top: 4, bottom: 4, width: 3,
        borderRadius: 2, background: t.stroke }}>
        {core.temp_c != null && (
          <div style={{ position: "absolute", bottom: 0, width: "100%", height: `${tempFrac}%`,
            background: tempColor(core.temp_c), borderRadius: 2, transition: "height 1s ease" }} />
        )}
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ color: core.pct > 70 ? ACCENT.orange : ACCENT.blue, fontSize: 12, fontWeight: 700 }}>
          {core.pct.toFixed(0)}%
        </div>
        <div style={{ color: t.textFaint, fontSize: 9 }}>T{core.id}</div>
      </div>
    </div>
  );
}

// ---------- app ----------
export default function App() {
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState(detectLang());
  const [active, setActive] = useState("overview");
  const [snap, setSnap] = useState(null);
  const [sysInfo, setSysInfo] = useState(null);
  const prefsLoaded = useRef(false);
  const t = dark ? THEMES.dark : THEMES.light;
  const tr = (key) => STRINGS[lang][key] || STRINGS.en[key] || key;

  // Carrega preferências salvas (tema, idioma) ao iniciar.
  useEffect(() => {
    invoke("load_ui_prefs").then((raw) => {
      try {
        const p = JSON.parse(raw || "{}");
        if (typeof p.dark === "boolean") setDark(p.dark);
        if (p.lang === "pt-BR" || p.lang === "en") setLang(p.lang);
      } catch { /* usa padrões */ }
      prefsLoaded.current = true;
    }).catch(() => { prefsLoaded.current = true; });
  }, []);

  // Salva sempre que tema ou idioma mudam (depois do carregamento inicial).
  useEffect(() => {
    if (!prefsLoaded.current) return;
    invoke("save_ui_prefs", { prefs: JSON.stringify({ dark, lang }) }).catch(() => {});
  }, [dark, lang]);

  // históricos pra sparklines
  const cpuHist = useRef([]);
  const cpuHist2 = useRef([]);
  const ramHist = useRef([]);
  const gpuHist = useRef([]);
  const cpuSparkHist = useRef([]); // por socket na página CPU, mapeado por índice

  const push = (ref, v) => {
    ref.current = [...ref.current, v].slice(-HISTORY);
  };

  useEffect(() => {
    invoke("get_system_info").then(setSysInfo).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await invoke("get_snapshot");
        if (!alive) return;
        if (s.sockets && s.sockets[0]) push(cpuHist, s.sockets[0].usage_pct);
        else push(cpuHist, s.cpu_usage);
        if (s.sockets && s.sockets[1]) push(cpuHist2, s.sockets[1].usage_pct);
        push(ramHist, s.mem_pct);
        push(gpuHist, s.gpus[0]?.usage_pct ?? 0);
        setSnap(s);
      } catch (e) {
        // silencioso; backend pode ainda não estar pronto
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  return (
    <div style={{ background: t.bg, height: "100%", display: "flex", color: t.text }}>
      {/* Sidebar */}
      <div style={{ width: 92, background: t.panel, borderRight: `1px solid ${t.stroke}`,
        display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0", gap: 4 }}>
        <img src={appIcon} alt="MachCtrl" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 16 }} />
        {NAV.map((n) => {
          const on = active === n.id;
          return (
            <button key={n.id} onClick={() => setActive(n.id)} style={{
              width: 68, padding: "10px 0", borderRadius: 12, border: "none",
              background: on ? `${n.accent}1a` : "transparent", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <n.icon size={20} color={on ? n.accent : t.textDim} />
              <span style={{ fontSize: 10, color: on ? n.accent : t.textFaint, fontWeight: on ? 700 : 500 }}>
                {tr(n.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div data-tauri-drag-region style={{ height: 60, borderBottom: `1px solid ${t.stroke}`, display: "flex",
          alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 26px" }}>
          <div data-tauri-drag-region>
            <div style={{ fontSize: 18, fontWeight: 800 }}>MachCtrl</div>
            <div style={{ fontSize: 11, color: t.textFaint }}>
              {sysInfo ? `${sysInfo.hostname} · ${sysInfo.distro} · ${tr("uptime")} ${sysInfo.uptime}` : "…"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12,
              color: snap ? ACCENT.green : t.textFaint }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: snap ? ACCENT.green : t.textFaint }} />
              {snap ? tr("connected") : "…"}
            </div>
            {/* seletor de idioma */}
            <button onClick={() => setLang((l) => (l === "pt-BR" ? "en" : "pt-BR"))} style={{
              height: 32, padding: "0 10px", borderRadius: 8, border: `1px solid ${t.stroke}`,
              background: t.card, cursor: "pointer", color: t.textDim, fontWeight: 700, fontSize: 12 }}>
              {lang === "pt-BR" ? "PT" : "EN"}
            </button>
            {/* tema */}
            <button onClick={() => setDark((d) => !d)} style={{ width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${t.stroke}`, background: t.card, cursor: "pointer",
              display: "grid", placeItems: "center" }}>
              {dark ? <Sun size={15} color={t.textDim} /> : <Moon size={15} color={t.textDim} />}
            </button>
            {/* controles de janela estilo v2.0 */}
            <WindowControls t={t} />
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {active === "overview" && <Overview t={t} tr={tr} snap={snap} sysInfo={sysInfo} cpuHist={cpuHist.current} cpuHist2={cpuHist2.current} ramHist={ramHist.current} gpuHist={gpuHist.current} />}
          {active === "cpu" && <CpuPage t={t} tr={tr} snap={snap} />}
          {active === "memory" && <MemoryPage t={t} tr={tr} snap={snap} />}
          {active === "disks" && <DisksPage t={t} tr={tr} snap={snap} />}
          {active === "fans" && <FansPage t={t} tr={tr} />}
          {active === "energy" && <EnergyPage t={t} tr={tr} />}
          {active === "cleaner" && <CleanerPage t={t} tr={tr} />}
          {active === "tune" && <Placeholder t={t} title={tr("tune_title")} msg={tr("tune_msg")} />}
          {active === "about" && <AboutPage t={t} tr={tr} sysInfo={sysInfo} />}
        </div>
      </div>
    </div>
  );
}

// Controles de janela (minimizar / maximizar / fechar) estilo v2.0.
function WindowControls({ t }) {
  const win = getCurrentWindow();
  const btn = (onClick, children, hoverBg) => (
    <button onClick={onClick} style={{
      width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent",
      cursor: "pointer", display: "grid", placeItems: "center", color: t.textDim,
    }}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg || t.card)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      {children}
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
      {btn(() => win.minimize(), <Minus size={15} />)}
      {btn(() => win.toggleMaximize(), <Square size={12} />)}
      {btn(() => win.close(), <X size={16} />, "#ef4444")}
    </div>
  );
}

// ---------- páginas ----------
function Overview({ t, tr, snap, sysInfo, cpuHist, cpuHist2, ramHist, gpuHist }) {
  if (!snap) return <Loading t={t} />;
  const gpu = snap.gpus[0];
  const barData = snap.top_procs.slice(0, 6).map((p) => ({ name: p.name, mb: Math.round(p.rss_mb) }));
  const barColors = [ACCENT.blue, ACCENT.cyan, ACCENT.green, ACCENT.orange, ACCENT.purple, ACCENT.pink];
  const vramPct = gpu?.vram_used_mb != null && gpu?.vram_total_mb ? (gpu.vram_used_mb / gpu.vram_total_mb) * 100 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Cabeçalho estilo v2.0: nome da máquina + info em 2 colunas */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: t.text }}>
            {sysInfo?.product_name || sysInfo?.hostname || "Sistema"}
          </span>
        </div>
        <div style={{ fontSize: 13, color: t.textFaint, marginBottom: 18 }}>
          {[sysInfo?.distro, sysInfo?.kernel && `${tr("kernel")} ${sysInfo.kernel}`, sysInfo?.install_date && sysInfo.install_date !== "—" && `${tr("installed_on")} ${sysInfo.install_date}`]
            .filter(Boolean).join(" · ")}
        </div>
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: "20px 24px",
          display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 18, columnGap: 40 }}>
          <InfoField t={t} k={tr("processor")} v={sysInfo?.cpu_model || snap.sockets[0]?.model || "—"} />
          <InfoField t={t} k={tr("gpu")} v={sysInfo?.gpu_name || "—"} />
          <InfoField t={t} k={tr("memory")} v={sysInfo ? `${sysInfo.mem_total_gb.toFixed(0)} GB RAM` : "—"} />
          <InfoField t={t} k={tr("storage")} v={sysInfo?.storage_total_gb ? `${storageHuman(sysInfo.storage_total_gb)}` : "—"} />
          <InfoField t={t} k={tr("motherboard")} v={sysInfo?.motherboard || "—"} />
          <InfoField t={t} k={tr("bios")} v={sysInfo?.bios || "—"} />
        </div>
      </div>

      {/* Cards de destaque: uma CPU por socket + Memória + GPU */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        {/* Um card por socket de CPU */}
        {snap.sockets.map((s, i) => (
          <div key={s.socket_id} style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 20,
            display: "flex", flexDirection: "column", gap: 12 }}>
            <CardHead t={t} icon={Cpu} accent={ACCENT.blue}
              title={snap.sockets.length > 1 ? `CPU ${i}` : "CPU"} badge={snap.sockets.length > 1 ? `SOCKET ${s.socket_id}` : undefined} />
            <BigValue t={t} value={s.usage_pct.toFixed(0)} unit="%" />
            <div style={{ marginTop: -4 }}><Sparkline data={i === 0 ? cpuHist : cpuHist2} color={ACCENT.blue} /></div>
            <div style={{ fontSize: 12, color: t.textFaint, lineHeight: 1.4 }}>{s.model}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
              <MiniStat t={t} k={tr("cores")} v={`${s.phys_cores}`} />
              <MiniStat t={t} k={tr("threads")} v={`${s.threads}`} />
              <MiniStat t={t} k={tr("temp")} v={s.package_temp_c != null ? `${s.package_temp_c.toFixed(0)}°C` : "—"} c={ACCENT.green} />
              <MiniStat t={t} k={tr("freq")} v={`${s.freq_ghz.toFixed(2)} GHz`} />
            </div>
          </div>
        ))}

        {/* Memória */}
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 20,
          display: "flex", flexDirection: "column", gap: 12 }}>
          <CardHead t={t} icon={MemoryStick} accent={ACCENT.green} title={tr("memory")} />
          <BigValue t={t} value={snap.mem_pct.toFixed(0)} unit="%" />
          <div style={{ marginTop: -4 }}><Sparkline data={ramHist} color={ACCENT.green} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
            <MiniStat t={t} k={tr("in_use")} v={`${snap.mem_used_gb.toFixed(1)} GB`} c={ACCENT.green} />
            <MiniStat t={t} k={tr("free")} v={`${(snap.mem_total_gb - snap.mem_used_gb).toFixed(1)} GB`} />
            <MiniStat t={t} k={tr("total")} v={`${snap.mem_total_gb.toFixed(1)} GB`} />
          </div>
        </div>

        {/* GPU detalhado */}
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 20,
          display: "flex", flexDirection: "column", gap: 12 }}>
          <CardHead t={t} icon={Activity} accent={ACCENT.purple} title="GPU" badge={gpu?.vendor?.toUpperCase()} />
          {gpu ? (
            <>
              <BigValue t={t} value={gpu.usage_pct != null ? gpu.usage_pct.toFixed(0) : "—"} unit={gpu.usage_pct != null ? "%" : ""} />
              <div style={{ marginTop: -4 }}><Sparkline data={gpuHist} color={ACCENT.purple} /></div>
              <div style={{ fontSize: 12, color: t.textFaint, lineHeight: 1.4 }}>{gpu.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
                <MiniStat t={t} k={tr("temp")} v={gpu.temp_c != null ? `${gpu.temp_c.toFixed(0)}°C` : "—"} c={ACCENT.green} />
                {gpu.fan_rpm != null && <MiniStat t={t} k={tr("fan")} v={`${gpu.fan_rpm} RPM`} />}
                {gpu.vram_total_mb != null && (
                  <MiniStat t={t} k="VRAM" v={`${(gpu.vram_used_mb / 1024).toFixed(1)}/${(gpu.vram_total_mb / 1024).toFixed(1)} GB`} c={ACCENT.purple} />
                )}
              </div>
              {vramPct != null && (
                <div style={{ marginTop: 2 }}>
                  <div style={{ fontSize: 10, color: t.textFaint, marginBottom: 4 }}>{tr("vram_usage")} · {vramPct.toFixed(0)}%</div>
                  <div style={{ height: 6, background: t.panel, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${vramPct}%`, background: ACCENT.purple, borderRadius: 3 }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: t.textFaint, fontSize: 13, padding: "20px 0", textAlign: "center" }}>{tr("no_gpu")}</div>
          )}
        </div>
      </div>

      {/* Processos + Rede */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 20 }}>
          <div style={{ color: t.textDim, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{tr("top_procs")}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90}
                tick={{ fill: t.textDim, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Bar dataKey="mb" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {barData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 20,
          display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: t.textDim, fontSize: 13, fontWeight: 600 }}>{tr("network")}</div>
          {snap.net.length === 0 && <span style={{ color: t.textFaint, fontSize: 13 }}>{tr("no_iface")}</span>}
          {snap.net.map((n) => (
            <div key={n.name}>
              <div style={{ fontSize: 12, color: t.textFaint, marginBottom: 6 }}>{n.name}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, background: t.panel, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: t.textFaint }}>↓ {tr("download")}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT.blue }}>{n.down_kb.toFixed(0)} KB/s</div>
                </div>
                <div style={{ flex: 1, background: t.panel, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: t.textFaint }}>↑ {tr("upload")}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT.green }}>{n.up_kb.toFixed(0)} KB/s</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helpers da Visão Geral
function InfoField({ t, k, v }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
      <div style={{ fontSize: 14, color: t.text, fontWeight: 600 }} title={v}>{v}</div>
    </div>
  );
}
function storageHuman(gb) {
  return gb >= 1000 ? `${(gb / 1024).toFixed(1)} TB` : `${gb.toFixed(0)} GB`;
}
function bytesHuman(bytes) {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
function CardHead({ t, icon: Icon, accent, title, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}22`, display: "grid", placeItems: "center" }}>
          <Icon size={18} color={accent} />
        </div>
        <span style={{ color: t.textDim, fontSize: 13, fontWeight: 600 }}>{title}</span>
      </div>
      {badge && <span style={{ fontSize: 9, fontWeight: 800, color: accent, background: `${accent}22`, padding: "3px 8px", borderRadius: 5 }}>{badge}</span>}
    </div>
  );
}
function BigValue({ t, value, unit }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ color: t.text, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{value}</span>
      <span style={{ color: t.textDim, fontSize: 16, fontWeight: 600 }}>{unit}</span>
    </div>
  );
}
function MiniStat({ t, k, v, c }) {
  return (
    <div style={{ background: t.panel, borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 9, color: t.textFaint, fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c || t.text }}>{v}</div>
    </div>
  );
}

function CpuPage({ t, tr, snap }) {
  if (!snap) return <Loading t={t} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {snap.sockets.map((s) => (
        <div key={s.socket_id} style={{ background: t.card, border: `1px solid ${t.stroke}`,
          borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14,
                background: `linear-gradient(135deg, ${ACCENT.blue}, ${ACCENT.purple})`,
                display: "grid", placeItems: "center", color: "#fff" }}>
                <div style={{ textAlign: "center", lineHeight: 1 }}>
                  <div style={{ fontSize: 9, opacity: 0.8 }}>CPU</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{s.socket_id}</div>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.model}</div>
                <div style={{ color: t.textFaint, fontSize: 12 }}>
                  {s.phys_cores} {tr("cores")} · {s.threads} threads · {s.freq_ghz.toFixed(2)} GHz
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 30 }}>
              {[[tr("avg_usage"), `${s.usage_pct.toFixed(0)}%`, ACCENT.blue],
                [tr("package"), s.package_temp_c != null ? `${s.package_temp_c.toFixed(0)}°C` : "—", ACCENT.green],
                [tr("freq").toUpperCase(), `${s.freq_ghz.toFixed(2)} GHz`, t.textDim]].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 600 }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 6 }}>
            {s.cores.map((c) => <CoreCell key={c.id} t={t} core={c} />)}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 11 }}>
            <span style={{ color: t.textDim }}>▬ {tr("activity")} (%)</span>
            <span style={{ color: ACCENT.orange }}>▮ {tr("temperature")} (°C)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MemoryPage({ t, tr, snap }) {
  const [mem, setMem] = useState(null);
  const [loadingRoot, setLoadingRoot] = useState(false);
  useEffect(() => { invoke("get_memory_slots").then(setMem).catch(() => setMem({ slots: [], total_slots: 0, occupied_slots: 0 })); }, []);

  const readWithRoot = () => {
    setLoadingRoot(true);
    invoke("get_memory_slots_root")
      .then(setMem)
      .catch(() => {})
      .finally(() => setLoadingRoot(false));
  };

  if (!snap) return <Loading t={t} />;

  const pct = snap.mem_pct;
  const R = 42, C = 2 * Math.PI * R;
  const slots = mem?.slots || [];
  const totalSlots = mem?.total_slots || slots.length;
  const emptySlots = Math.max(0, totalSlots - slots.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Cabeçalho: donut + números */}
      <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 24,
        display: "flex", gap: 32, alignItems: "center" }}>
        <svg width="110" height="110" viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
          <circle cx="55" cy="55" r={R} fill="none" stroke={t.panel} strokeWidth="10" />
          <circle cx="55" cy="55" r={R} fill="none" stroke={ACCENT.green} strokeWidth="10"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} strokeLinecap="round"
            transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
          <text x="55" y="52" textAnchor="middle" fill={t.text} fontSize="20" fontWeight="800">{pct.toFixed(0)}%</text>
          <text x="55" y="68" textAnchor="middle" fill={t.textFaint} fontSize="10">RAM</text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: ACCENT.green }}>{snap.mem_used_gb.toFixed(1)}</span>
            <span style={{ fontSize: 18, color: t.textFaint }}>/ {snap.mem_total_gb.toFixed(1)} GB</span>
          </div>
          <div style={{ height: 8, background: t.panel, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: ACCENT.green, borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", gap: 36 }}>
            <MemHeadStat t={t} k={tr("total")} v={`${snap.mem_total_gb.toFixed(1)} GB`} />
            <MemHeadStat t={t} k="Usado" v={`${snap.mem_used_gb.toFixed(1)} GB`} />
            <MemHeadStat t={t} k={tr("free")} v={`${(snap.mem_total_gb - snap.mem_used_gb).toFixed(1)} GB`} />
            {totalSlots > 0 && <MemHeadStat t={t} k="Slots" v={`${slots.length}/${totalSlots}`} c={ACCENT.blue} />}
          </div>
        </div>
      </div>

      <div style={{ color: t.textDim, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>PENTES INSTALADOS</div>
      {mem === null && <Loading t={t} />}
      {mem && slots.length === 0 && (
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 14, padding: 24,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <span style={{ color: t.textFaint, fontSize: 13, textAlign: "center" }}>
            A leitura automática não conseguiu acessar os slots de memória neste sistema.<br />
            Você pode ler com privilégio de administrador (vai pedir sua senha).
          </span>
          <button onClick={readWithRoot} disabled={loadingRoot} style={{
            padding: "10px 20px", borderRadius: 10, border: "none", background: ACCENT.blue,
            color: "#fff", fontWeight: 700, cursor: loadingRoot ? "default" : "pointer",
            opacity: loadingRoot ? 0.6 : 1 }}>
            {loadingRoot ? "Lendo…" : "Ler slots (requer senha)"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {slots.map((s, i) => (
          <div key={i} style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{s.locator}</span>
              <span style={{ color: ACCENT.blue, fontWeight: 700, fontSize: 13 }}>
                {s.size_gb.toFixed(0)} GB {s.mem_type !== "?" ? s.mem_type : ""}
              </span>
            </div>
            {s.manufacturer !== "?" && <Row t={t} k="Fabricante" v={s.manufacturer} />}
            {s.part_number !== "?" && s.part_number !== "" && <Row t={t} k="Modelo" v={s.part_number} />}
            {s.speed_mhz > 0 && <Row t={t} k="Velocidade" v={`${s.speed_mhz} MT/s`} vc={ACCENT.cyan} />}
            {s.voltage > 0 && <Row t={t} k="Voltagem" v={`${s.voltage.toFixed(2)} V`} vc={ACCENT.orange} />}
          </div>
        ))}
        {/* Slots vazios */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} style={{ background: "transparent", border: `1px dashed ${t.stroke}`,
            borderRadius: 14, padding: 16, display: "grid", placeItems: "center", minHeight: 90 }}>
            <span style={{ color: t.textFaint, fontSize: 13 }}>Slot vazio</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemHeadStat({ t, k, v, c }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: c || t.text }}>{v}</div>
    </div>
  );
}

const DISK_TYPES = {
  nvme: { label: "NVMe", color: "#3b82f6", icon: Zap },
  ssd: { label: "SSD", color: "#22d3ee", icon: Database },
  hdd: { label: "HDD", color: "#fb923c", icon: HardDrive },
  usb: { label: "USB", color: "#a78bfa", icon: Usb },
};

function DisksPage({ t, tr, snap }) {
  const ioHist = useRef({}); // por device: { read: [], write: [] }
  if (!snap) return <Loading t={t} />;

  // acumula histórico de I/O pra mini-gráficos
  snap.disks.forEach((d) => {
    if (!ioHist.current[d.device]) ioHist.current[d.device] = { read: [], write: [] };
    const h = ioHist.current[d.device];
    h.read = [...h.read, d.read_mbs].slice(-30);
    h.write = [...h.write, d.write_mbs].slice(-30);
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
      {snap.disks.map((d) => {
        const info = DISK_TYPES[d.disk_type] || DISK_TYPES.hdd;
        const Icon = info.icon;
        const h = ioHist.current[d.device] || { read: [], write: [] };
        return (
          <div key={d.device} style={{ background: t.card, border: `1px solid ${t.stroke}`,
            borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${info.color}22`,
                  display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon size={18} color={info.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: info.color,
                      background: `${info.color}22`, padding: "2px 7px", borderRadius: 5 }}>{info.label}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden",
                      textOverflow: "ellipsis" }} title={d.mountpoint}>{d.mountpoint}</span>
                  </div>
                  <div style={{ color: t.textFaint, fontSize: 11, marginTop: 2 }}>{d.device} · {d.fstype}</div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: info.color }}>{d.usage_pct.toFixed(1)}%</div>
                <div style={{ fontSize: 11, color: t.textFaint }}>{d.used_gb.toFixed(1)}/{d.total_gb.toFixed(1)} GB</div>
              </div>
            </div>

            {/* barra de uso */}
            <div style={{ height: 6, background: t.panel, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${d.usage_pct}%`, background: info.color, borderRadius: 3 }} />
            </div>

            {/* I/O: leitura e escrita */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <IoRow t={t} icon={ArrowDown} label="Leitura" value={d.read_mbs} color={ACCENT.green} hist={h.read} />
              <IoRow t={t} icon={ArrowUp} label="Escrita" value={d.write_mbs} color={ACCENT.orange} hist={h.write} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IoRow({ t, icon: Icon, label, value, color, hist }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: t.textFaint }}>
          <Icon size={13} color={color} /> {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value.toFixed(1)} MB/s</span>
      </div>
      <div style={{ height: 24 }}>
        <Sparkline data={hist} color={color} height={24} />
      </div>
    </div>
  );
}

function fanRole(f) {
  const c = (f.chip || "").toLowerCase();
  const l = (f.label || "").toLowerCase();
  if (c.includes("amdgpu") || c.includes("nvidia") || c.includes("nouveau") || c.includes("radeon") || l.includes("gpu"))
    return { name: "GPU", color: "#a78bfa" };
  // Super I/O da placa-mãe (nct67xx, it87, f71xxx) controlam os coolers de CPU/gabinete.
  if (c.includes("k10temp") || c.includes("coretemp") || c.startsWith("nct") || c.startsWith("it87")
    || c.startsWith("f71") || c.includes("cpu") || l.includes("cpu"))
    return { name: "CPU", color: "#fb923c" };
  return { name: "Sistema", color: "#22d3ee" };
}

function FanImage({ rpm, size = 48, color = "#a78bfa" }) {
  // anel externo com glow + pás girando dentro; velocidade proporcional ao RPM
  const dur = rpm > 0 ? Math.max(0.35, 2200 / rpm) : 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0,
      display: "grid", placeItems: "center" }}>
      {/* anel externo com brilho */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `2px solid ${color}`, boxShadow: `0 0 8px ${color}88, inset 0 0 6px ${color}55`,
        opacity: rpm > 0 ? 1 : 0.4,
      }} />
      {/* pás girando */}
      <img src={fanBlade} alt="" style={{
        width: "72%", height: "72%",
        animation: dur ? `spin ${dur}s linear infinite` : "none",
      }} />
    </div>
  );
}

function FansPage({ t, tr }) {
  const [fans, setFans] = useState(null);
  const [modes, setModes] = useState({}); // id -> 'auto' | 'manual' | 'max'
  const [manualPct, setManualPct] = useState({}); // id -> valor do slider
  const [curveModal, setCurveModal] = useState(null); // fan cujo modal de curva está aberto
  const load = useCallback(() => {
    invoke("get_fans")
      .then((list) => setFans((list || []).slice().sort((a, b) => a.id.localeCompare(b.id))))
      .catch(() => setFans([]));
  }, []);
  // Restaura o estado REAL que o backend mantém (modo + manual + curva),
  // pra que sair e voltar da tela não "esqueça" que havia uma curva/modo ativo.
  useEffect(() => {
    invoke("get_fan_modes").then((list) => {
      const m = {}, mp = {};
      (list || []).forEach((fm) => {
        m[fm.fan_id] = fm.mode;
        if (fm.manual_pct != null) mp[fm.fan_id] = fm.manual_pct;
      });
      setModes(m);
      setManualPct((prev) => ({ ...mp, ...prev }));
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); const iv = setInterval(load, 2000); return () => clearInterval(iv); }, [load]);
  if (fans === null) return <Loading t={t} />;
  if (fans.length === 0) return <Empty t={t} msg={tr("no_fans")} />;

  const setMode = (f, mode) => {
    setModes((m) => ({ ...m, [f.id]: mode }));
    const base = { fanId: f.id, pwmPath: f.pwm_path, pwmEnablePath: f.pwm_enable_path, chip: f.chip };
    if (mode === "auto") {
      invoke("set_fan_auto", base).catch(() => {});
    } else if (mode === "max") {
      invoke("set_fan", { ...base, speed: 100, max: true }).catch(() => {});
    } else if (mode === "manual") {
      const v = manualPct[f.id] ?? f.pct;
      invoke("set_fan", { ...base, speed: v, max: false }).catch(() => {});
    }
    // modo "curve" é aplicado pelo modal (set_fan_curve)
  };

  // Pré-computa o nome de exibição de cada fan (CPU 1, GPU, Sistema 2...) de forma
  // determinística, baseada na ordem estável por id — evita cards trocando de nome.
  const roleTotals = {};
  fans.forEach((f) => { const r = fanRole(f).name; roleTotals[r] = (roleTotals[r] || 0) + 1; });
  const roleSeen = {};
  const displayNames = {};
  fans.forEach((f) => {
    const r = fanRole(f).name;
    roleSeen[r] = (roleSeen[r] || 0) + 1;
    displayNames[f.id] = roleTotals[r] > 1 ? `${r} ${roleSeen[r]}` : r;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
      {fans.map((f) => {
        const mode = modes[f.id] || "auto";
        const spinning = f.rpm > 0;
        const role = fanRole(f);
        const displayName = displayNames[f.id];
        return (
          <div key={f.id} style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 16,
            padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* header: ventilador (imagem animada) + nome + RPM */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <FanImage rpm={f.rpm} size={48} color={role.color} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: role.color,
                      background: `${role.color}22`, padding: "2px 7px", borderRadius: 5 }}>{role.name}</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{displayName}</span>
                  </div>
                  <div style={{ color: t.textFaint, fontSize: 11, marginTop: 2 }}>
                    modo: <span style={{ color: mode === "auto" ? ACCENT.green : mode === "max" ? ACCENT.red : ACCENT.blue, fontWeight: 600 }}>
                      {mode === "auto" ? "Automático" : mode === "max" ? "Máximo" : "Manual"}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: spinning ? ACCENT.blue : t.textFaint }}>{f.rpm}</div>
                <div style={{ fontSize: 10, color: t.textFaint }}>RPM</div>
              </div>
            </div>

            {/* barra de PWM atual */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.textFaint, marginBottom: 4 }}>
                <span>PWM atual</span><span>{f.pct}%</span>
              </div>
              <div style={{ height: 6, background: t.panel, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${f.pct}%`, background: role.color, borderRadius: 3, transition: "width 0.5s" }} />
              </div>
            </div>

            {f.controllable ? (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["auto", "Automático", ACCENT.green], ["manual", "Manual", ACCENT.blue], ["max", "Máximo", ACCENT.red],
                    ...(role.name === "GPU" ? [["curve", "Curva", ACCENT.purple]] : [])].map(([m, label, c]) => {
                    const on = mode === m;
                    return (
                      <button key={m} onClick={() => setMode(f, m)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${on ? c : t.stroke}`,
                        background: on ? `${c}1a` : "transparent",
                        color: on ? c : t.textDim }}>{label}</button>
                    );
                  })}
                </div>
                {mode === "manual" && (
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input type="range" min="0" max="100" value={manualPct[f.id] ?? f.pct}
                      onChange={(e) => setManualPct((p) => ({ ...p, [f.id]: Number(e.target.value) }))}
                      onMouseUp={(e) => invoke("set_fan", { fanId: f.id, pwmPath: f.pwm_path, pwmEnablePath: f.pwm_enable_path, chip: f.chip, speed: Number(e.target.value), max: false }).catch(() => {})}
                      style={{ flex: 1, accentColor: ACCENT.blue }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT.blue, minWidth: 40, textAlign: "right" }}>
                      {manualPct[f.id] ?? f.pct}%
                    </span>
                  </div>
                )}
                {mode === "curve" && (
                  <button onClick={() => setCurveModal(f)} style={{
                    padding: "10px 0", borderRadius: 8, border: `1px solid ${ACCENT.purple}44`,
                    background: `${ACCENT.purple}12`, color: ACCENT.purple, fontWeight: 700,
                    fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 6 }}>
                    📈 {tr("curve_active")}
                  </button>
                )}
              </>
            ) : (
              <div style={{ color: t.textFaint, fontSize: 12 }}>{tr("read_only")}</div>
            )}
          </div>
        );
      })}
      {curveModal && (
        <FanCurveModal t={t} fan={curveModal} role={fanRole(curveModal)}
          displayName={displayNames[curveModal.id]} onClose={() => setCurveModal(null)} />
      )}
    </div>
  );
}

function FanCurveModal({ t, fan, role, displayName, onClose }) {
  // Pontos: [temperatura°C, velocidade%]. Editor visual + campos editáveis.
  const [points, setPoints] = useState([
    [30, 30], [50, 40], [65, 60], [75, 80], [85, 100],
  ]);
  const W = 520, H = 300, padL = 44, padB = 34, padT = 20, padR = 20;
  const xToPx = (temp) => padL + ((temp - 20) / 80) * (W - padL - padR);
  const yToPx = (spd) => H - padB - (spd / 100) * (H - padB - padT);
  const dragging = useRef(null);
  const curTemp = fan.rpm > 0 ? 46 : 40; // placeholder de temp atual da GPU

  const onMove = (e) => {
    if (dragging.current === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const px = (e.clientX - rect.left) * scaleX, py = (e.clientY - rect.top) * scaleY;
    let temp = Math.round(20 + ((px - padL) / (W - padL - padR)) * 80);
    let spd = Math.round(((H - padB - py) / (H - padB - padT)) * 100);
    temp = Math.max(20, Math.min(100, temp));
    spd = Math.max(0, Math.min(100, spd));
    setPoints((pts) => pts.map((p, i) => (i === dragging.current ? [temp, spd] : p)));
  };
  const commitSort = () => { setPoints((pts) => [...pts].sort((a, b) => a[0] - b[0])); dragging.current = null; };

  const editPoint = (i, field, val) => {
    const v = Math.max(0, Math.min(field === 0 ? 100 : 100, Number(val) || 0));
    setPoints((pts) => pts.map((p, idx) => (idx === i ? (field === 0 ? [v, p[1]] : [p[0], v]) : p)));
  };

  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const path = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${xToPx(p[0])} ${yToPx(p[1])}`).join(" ");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "grid", placeItems: "center", zIndex: 100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: t.card, border: `1px solid ${t.stroke}`,
        borderRadius: 18, padding: 26, width: "min(600px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Curva de Fan — {displayName || fan.label}</div>
            <div style={{ fontSize: 13, color: t.textFaint, marginTop: 4 }}>
              {role.name}: <span style={{ color: ACCENT.orange, fontWeight: 700 }}>{curTemp}°C</span>
              {" → "}Fan: <span style={{ color: ACCENT.blue, fontWeight: 700 }}>{fan.pct}%</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textDim,
            fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* gráfico grande */}
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ cursor: "crosshair", touchAction: "none", marginTop: 12 }}
          onMouseMove={onMove} onMouseUp={commitSort} onMouseLeave={commitSort}>
          {/* grades horizontais + labels % */}
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={padL} y1={yToPx(g)} x2={W - padR} y2={yToPx(g)} stroke={t.stroke} strokeWidth="1" />
              <text x={padL - 8} y={yToPx(g) + 3} fill={t.textFaint} fontSize="10" textAnchor="end">{g}%</text>
            </g>
          ))}
          {/* grades verticais + labels °C */}
          {[20, 40, 60, 80, 100].map((tp) => (
            <text key={tp} x={xToPx(tp)} y={H - padB + 16} fill={t.textFaint} fontSize="10" textAnchor="middle">{tp}°</text>
          ))}
          {/* linha vertical da temperatura atual */}
          <line x1={xToPx(curTemp)} y1={padT} x2={xToPx(curTemp)} y2={H - padB}
            stroke={ACCENT.orange} strokeWidth="1.5" strokeDasharray="4 4" />
          {/* área + linha da curva */}
          <path d={`${path} L ${xToPx(sorted[sorted.length - 1][0])} ${H - padB} L ${xToPx(sorted[0][0])} ${H - padB} Z`}
            fill={`${ACCENT.blue}22`} />
          <path d={path} fill="none" stroke={ACCENT.blue} strokeWidth="2.5" />
          {/* pontos com rótulo */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={xToPx(p[0])} cy={yToPx(p[1])} r="7" fill={ACCENT.blue} stroke="#fff" strokeWidth="2"
                style={{ cursor: "grab" }} onMouseDown={() => (dragging.current = i)} />
              <text x={xToPx(p[0])} y={yToPx(p[1]) - 12} fill={t.text} fontSize="10" textAnchor="middle" fontWeight="700">{p[1]}%</text>
            </g>
          ))}
        </svg>

        {/* campos editáveis por ponto */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: t.textDim, marginBottom: 10 }}>
            Pontos de controle — arraste no gráfico ou edite abaixo:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${points.length}, 1fr)`, gap: 8 }}>
            {points.map((p, i) => (
              <div key={i} style={{ background: t.panel, borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 700, marginBottom: 6 }}>Ponto {i + 1}</div>
                <div style={{ fontSize: 9, color: t.textFaint }}>Temp °C</div>
                <input type="number" value={p[0]} onChange={(e) => editPoint(i, 0, e.target.value)}
                  style={{ width: "100%", background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 6,
                    color: ACCENT.orange, textAlign: "center", fontWeight: 700, padding: "4px 0", marginBottom: 6 }} />
                <div style={{ fontSize: 9, color: t.textFaint }}>Fan %</div>
                <input type="number" value={p[1]} onChange={(e) => editPoint(i, 1, e.target.value)}
                  style={{ width: "100%", background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 6,
                    color: ACCENT.blue, textAlign: "center", fontWeight: 700, padding: "4px 0" }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${t.stroke}`,
            background: "transparent", color: t.textDim, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => {
            const pts = points.map(([temp, pct]) => ({ temp, pct }));
            invoke("set_fan_curve", {
              fanId: fan.id, pwmPath: fan.pwm_path, pwmEnablePath: fan.pwm_enable_path,
              chip: fan.chip, points: pts,
            }).catch(() => {});
            onClose();
          }} style={{ padding: "10px 20px", borderRadius: 10, border: "none",
            background: ACCENT.blue, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Aplicar curva</button>
        </div>
      </div>
    </div>
  );
}

function EnergyPage({ t, tr }) {
  const [info, setInfo] = useState(null);
  const load = useCallback(() => { invoke("get_profiles").then(setInfo).catch(() => setInfo(null)); }, []);
  useEffect(() => { load(); }, [load]);
  const DEFS = [
    { id: "silent", name: "Economia", desc: "Baixo consumo · Silencioso", c: ACCENT.green },
    { id: "balanced", name: "Equilibrado", desc: "Desempenho adaptativo", c: ACCENT.blue },
    { id: "performance", name: "Desempenho", desc: "Máximo desempenho · Turbo", c: ACCENT.orange },
  ];
  if (!info) return <Loading t={t} />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      {DEFS.filter((d) => info.available.includes(d.id)).map((d) => {
        const on = info.current === d.id;
        return (
          <div key={d.id} style={{ background: on ? `${d.c}12` : t.card,
            border: `1px solid ${on ? d.c + "66" : t.stroke}`, borderRadius: 18, padding: 24,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative" }}>
            {on && <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 800,
              color: d.c, background: `${d.c}22`, padding: "3px 10px", borderRadius: 6 }}>ATIVO</span>}
            <div style={{ width: 56, height: 56, borderRadius: 16, marginTop: 8,
              background: on ? `linear-gradient(135deg, ${d.c}, ${ACCENT.red})` : t.panel,
              display: "grid", placeItems: "center" }}>
              <Zap size={26} color={on ? "#fff" : t.textDim} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, color: on ? d.c : t.text }}>{d.name}</div>
            <div style={{ fontSize: 12, color: t.textFaint, textAlign: "center" }}>{d.desc}</div>
            <button disabled={on} onClick={() => invoke("apply_profile", { name: d.id }).then(load).catch(() => {})}
              style={{ marginTop: 8, width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                background: on ? d.c : t.panel, color: on ? "#fff" : t.textDim, fontWeight: 700,
                cursor: on ? "default" : "pointer" }}>{on ? "Ativo" : "Aplicar"}</button>
          </div>
        );
      })}
      <div style={{ gridColumn: "1 / -1", color: t.textFaint, fontSize: 12 }}>
        Aplicar perfil requer root (escrita em /sys). Rode com pkexec/sudo se necessário.
      </div>
    </div>
  );
}

function CleanerPage({ t, tr }) {
  const [tasks, setTasks] = useState(null);
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [totalFreed, setTotalFreed] = useState(0);
  useEffect(() => { invoke("get_clean_tasks").then(setTasks).catch(() => setTasks([])); }, []);
  if (tasks === null) return <Loading t={t} />;

  const cleanAll = async () => {
    setRunning(true);
    setResults({});
    let total = 0;
    for (const task of tasks) {
      setCurrentTask(task.id);
      try {
        const r = await invoke("run_clean", { taskId: task.id });
        total += r.bytes || 0;
        setResults((prev) => ({ ...prev, [task.id]: {
          ok: r.ok, text: `${r.result}${r.cleaned ? " (" + r.cleaned + ")" : ""}`,
        } }));
      } catch {
        setResults((prev) => ({ ...prev, [task.id]: { ok: false, text: "Falhou" } }));
      }
    }
    setTotalFreed(total);
    setCurrentTask(null);
    setRunning(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Botão único Limpar tudo */}
      <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 16, padding: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{tr("cleanup")}</div>
          <div style={{ color: t.textFaint, fontSize: 13, marginTop: 2 }}>
            {tasks.length} {tr("cleanup_desc")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {totalFreed > 0 && !running && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 600 }}>{tr("total_freed") || "TOTAL LIBERADO"}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT.green }}>{bytesHuman(totalFreed)}</div>
            </div>
          )}
          <button onClick={cleanAll} disabled={running} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10,
            border: "none", background: running ? t.panel : ACCENT.red, color: running ? t.textDim : "#fff",
            fontWeight: 700, fontSize: 14, cursor: running ? "default" : "pointer", whiteSpace: "nowrap" }}>
            <Trash2 size={16} color={running ? t.textDim : "#fff"} />
            {running ? tr("cleaning") : tr("clean_all")}
          </button>
        </div>
      </div>

      {/* Lista de tarefas (sem botões individuais) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map((task) => {
          const res = results[task.id];
          const isCurrent = currentTask === task.id;
          return (
            <div key={task.id} style={{ background: t.card, border: `1px solid ${isCurrent ? ACCENT.red + "66" : t.stroke}`,
              borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{task.label}</span>
                  {task.needs_root && <span style={{ fontSize: 9, fontWeight: 800, color: ACCENT.orange,
                    background: `${ACCENT.orange}22`, padding: "2px 8px", borderRadius: 5 }}>ROOT</span>}
                </div>
                <div style={{ color: t.textFaint, fontSize: 12, marginTop: 2 }}>{task.description}</div>
                {res && <div style={{ color: res.ok ? ACCENT.green : ACCENT.red, fontSize: 12, marginTop: 4 }}>
                  {res.ok ? "✓ " : "✗ "}{res.text}</div>}
              </div>
              {/* indicador de estado por tarefa */}
              <div style={{ flexShrink: 0 }}>
                {isCurrent ? (
                  <span style={{ fontSize: 12, color: ACCENT.red, fontWeight: 700 }}>limpando…</span>
                ) : res ? (
                  <span style={{ fontSize: 16, color: res.ok ? ACCENT.green : ACCENT.red }}>{res.ok ? "✓" : "✗"}</span>
                ) : (
                  <span style={{ fontSize: 12, color: t.textFaint }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AboutPage({ t, tr, sysInfo }) {
  const paypalEmail = "anderson.henrique.araujo@hotmail.com";
  const paypalUrl = `https://www.paypal.com/donate/?business=${encodeURIComponent(paypalEmail)}&item_name=${encodeURIComponent("Apoie o MachCtrl")}&currency_code=BRL`;
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <img src={appIcon} alt="MachCtrl" style={{ width: 128, height: 128, borderRadius: 28, margin: "0 auto 20px", display: "block" }} />
        <div style={{ fontSize: 28, fontWeight: 800 }}>MachCtrl</div>
        <div style={{ color: t.textDim, fontSize: 14, marginTop: 6 }}>{tr("about_subtitle")}</div>
        <div style={{ display: "inline-block", marginTop: 14, fontSize: 12, fontWeight: 700, color: ACCENT.blue,
          background: `${ACCENT.blue}18`, padding: "5px 14px", borderRadius: 20 }}>
          v3.0.0
        </div>
        <div style={{ color: t.textFaint, fontSize: 12, marginTop: 10 }}>
          Rust + Tauri + React{sysInfo ? ` · ${sysInfo.distro}` : ""}
        </div>

        {/* Doação */}
        <div style={{ marginTop: 28, padding: 20, background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            {tr("support_project") || "Gostou do MachCtrl?"}
          </div>
          <div style={{ fontSize: 12, color: t.textFaint, marginBottom: 14 }}>
            {tr("support_desc") || "Se este app te ajudou, considere apoiar o desenvolvimento com uma doação."}
          </div>
          <button onClick={() => invoke("open_url", { url: paypalUrl }).catch(() => {})} style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 10,
            background: "#0070ba", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none" }}>
            <Heart size={16} color="#fff" fill="#fff" /> {tr("donate") || "Doar via PayPal"}
          </button>
        </div>

        <div style={{ color: t.textFaint, fontSize: 11, marginTop: 20 }}>
          © 2026 Anderson Araújo
        </div>
      </div>
    </div>
  );
}

// ---------- utilitários ----------
function Placeholder({ t, title, msg }) {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.textDim, marginBottom: 8 }}>{title}</div>
        <div style={{ color: t.textFaint, fontSize: 14 }}>{msg}</div>
      </div>
    </div>
  );
}
function Loading({ t }) {
  return <div style={{ display: "grid", placeItems: "center", height: 200, color: t.textFaint, fontSize: 13 }}>Lendo sensores…</div>;
}
function Empty({ t, msg }) {
  return <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 14, padding: 24,
    color: t.textFaint, fontSize: 13, textAlign: "center" }}>{msg}</div>;
}
function Row({ t, k, v, vc }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
      <span style={{ color: t.textFaint }}>{k}</span>
      <span style={{ color: vc || t.textDim, fontWeight: 600 }}>{v}</span>
    </div>
  );
}
