import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Cell,
} from "recharts";
import {
  LayoutDashboard, Cpu, MemoryStick, HardDrive, Fan, Zap,
  Trash2, Gauge, Info, Sun, Moon, Activity, Usb, Database,
  ArrowDown, ArrowUp,
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
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard, accent: ACCENT.blue },
  { id: "cpu", label: "CPU", icon: Cpu, accent: ACCENT.orange },
  { id: "memory", label: "Memória", icon: MemoryStick, accent: ACCENT.green },
  { id: "disks", label: "Discos", icon: HardDrive, accent: ACCENT.cyan },
  { id: "fans", label: "Fans", icon: Fan, accent: ACCENT.cyan },
  { id: "energy", label: "Energia", icon: Zap, accent: ACCENT.orange },
  { id: "cleaner", label: "Limpeza", icon: Trash2, accent: ACCENT.red },
  { id: "tune", label: "Ajuste", icon: Gauge, accent: ACCENT.purple },
  { id: "about", label: "Sobre", icon: Info, accent: ACCENT.textDim },
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
  const [active, setActive] = useState("overview");
  const [snap, setSnap] = useState(null);
  const [sysInfo, setSysInfo] = useState(null);
  const t = dark ? THEMES.dark : THEMES.light;

  // históricos pra sparklines
  const cpuHist = useRef([]);
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
        push(cpuHist, s.cpu_usage);
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
        <div style={{ width: 40, height: 40, borderRadius: 12, marginBottom: 16,
          background: `linear-gradient(135deg, ${ACCENT.blue}, ${ACCENT.purple})`,
          display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18, color: "#fff" }}>M</div>
        {NAV.map((n) => {
          const on = active === n.id;
          return (
            <button key={n.id} onClick={() => setActive(n.id)} style={{
              width: 68, padding: "10px 0", borderRadius: 12, border: "none",
              background: on ? `${n.accent}1a` : "transparent", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <n.icon size={20} color={on ? n.accent : t.textDim} />
              <span style={{ fontSize: 10, color: on ? n.accent : t.textFaint, fontWeight: on ? 700 : 500 }}>
                {n.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 60, borderBottom: `1px solid ${t.stroke}`, display: "flex",
          alignItems: "center", justifyContent: "space-between", padding: "0 26px" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>MachCtrl</div>
            <div style={{ fontSize: 11, color: t.textFaint }}>
              {sysInfo ? `${sysInfo.hostname} · ${sysInfo.distro} · Uptime ${sysInfo.uptime}` : "carregando…"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12,
              color: snap ? ACCENT.green : t.textFaint }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: snap ? ACCENT.green : t.textFaint }} />
              {snap ? "Conectado" : "…"}
            </div>
            <button onClick={() => setDark((d) => !d)} style={{ width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${t.stroke}`, background: t.card, cursor: "pointer",
              display: "grid", placeItems: "center" }}>
              {dark ? <Sun size={16} color={t.textDim} /> : <Moon size={16} color={t.textDim} />}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {active === "overview" && <Overview t={t} snap={snap} sysInfo={sysInfo} cpuHist={cpuHist.current} ramHist={ramHist.current} gpuHist={gpuHist.current} />}
          {active === "cpu" && <CpuPage t={t} snap={snap} />}
          {active === "memory" && <MemoryPage t={t} snap={snap} />}
          {active === "disks" && <DisksPage t={t} snap={snap} />}
          {active === "fans" && <FansPage t={t} />}
          {active === "energy" && <EnergyPage t={t} />}
          {active === "cleaner" && <CleanerPage t={t} />}
          {active === "tune" && <Placeholder t={t} title="Ajuste" msg="Otimizações do sistema — em construção. Vamos montar essa tela juntos na próxima etapa." />}
          {active === "about" && <AboutPage t={t} sysInfo={sysInfo} />}
        </div>
      </div>
    </div>
  );
}

// ---------- páginas ----------
function Overview({ t, snap, sysInfo, cpuHist, ramHist, gpuHist }) {
  if (!snap) return <Loading t={t} />;
  const gpu = snap.gpus[0];
  const barData = snap.top_procs.slice(0, 6).map((p) => ({ name: p.name, mb: Math.round(p.rss_mb) }));
  const barColors = [ACCENT.blue, ACCENT.cyan, ACCENT.green, ACCENT.orange, ACCENT.purple, ACCENT.pink];
  const vramPct = gpu?.vram_used_mb != null && gpu?.vram_total_mb ? (gpu.vram_used_mb / gpu.vram_total_mb) * 100 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Cabeçalho estilo v2.0: nome da máquina + watts + info em 2 colunas */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: t.text }}>
            {sysInfo?.product_name || sysInfo?.hostname || "Sistema"}
          </span>
          {snap.cpu_watts != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 700,
              color: ACCENT.green, background: `${ACCENT.green}1a`, border: `1px solid ${ACCENT.green}44`,
              padding: "5px 12px", borderRadius: 10 }}>
              <Zap size={14} color={ACCENT.green} /> {snap.cpu_watts.toFixed(1)} W
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: t.textFaint, marginBottom: 18 }}>
          {[sysInfo?.distro, sysInfo?.kernel && `Kernel ${sysInfo.kernel}`, sysInfo?.install_date && sysInfo.install_date !== "—" && `Instalado em ${sysInfo.install_date}`]
            .filter(Boolean).join(" · ")}
        </div>
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: "20px 24px",
          display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 18, columnGap: 40 }}>
          <InfoField t={t} k="PROCESSADOR" v={sysInfo?.cpu_model || snap.sockets[0]?.model || "—"} />
          <InfoField t={t} k="GPU" v={sysInfo?.gpu_name || "—"} />
          <InfoField t={t} k="MEMÓRIA" v={sysInfo ? `${sysInfo.mem_total_gb.toFixed(0)} GB RAM` : "—"} />
          <InfoField t={t} k="ARMAZENAMENTO" v={sysInfo?.storage_total_gb ? `${storageHuman(sysInfo.storage_total_gb)}` : "—"} />
          <InfoField t={t} k="PLACA-MÃE" v={sysInfo?.motherboard || "—"} />
          <InfoField t={t} k="BIOS" v={sysInfo?.bios || "—"} />
        </div>
      </div>

      {/* Três cards de destaque: CPU, Memória, GPU */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {/* CPU detalhado */}
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 20,
          display: "flex", flexDirection: "column", gap: 12 }}>
          <CardHead t={t} icon={Cpu} accent={ACCENT.blue} title="CPU" />
          <BigValue t={t} value={snap.cpu_usage.toFixed(0)} unit="%" />
          <div style={{ marginTop: -4 }}><Sparkline data={cpuHist} color={ACCENT.blue} /></div>
          <div style={{ fontSize: 12, color: t.textFaint, lineHeight: 1.4 }}>{snap.sockets[0]?.model || "CPU"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
            <MiniStat t={t} k="Sockets" v={`${snap.sockets.length}`} />
            <MiniStat t={t} k="Threads" v={`${snap.sockets.reduce((a, s) => a + s.threads, 0)}`} />
            <MiniStat t={t} k="Temp" v={snap.cpu_temp_c != null ? `${snap.cpu_temp_c.toFixed(0)}°C` : "—"} c={ACCENT.green} />
            <MiniStat t={t} k="Freq" v={`${(snap.cpu_freq_mhz / 1000).toFixed(2)} GHz`} />
            {snap.cpu_watts != null && <MiniStat t={t} k="Consumo" v={`${snap.cpu_watts.toFixed(1)} W`} c={ACCENT.orange} />}
          </div>
        </div>

        {/* Memória */}
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 20,
          display: "flex", flexDirection: "column", gap: 12 }}>
          <CardHead t={t} icon={MemoryStick} accent={ACCENT.green} title="MEMÓRIA" />
          <BigValue t={t} value={snap.mem_pct.toFixed(0)} unit="%" />
          <div style={{ marginTop: -4 }}><Sparkline data={ramHist} color={ACCENT.green} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
            <MiniStat t={t} k="Em uso" v={`${snap.mem_used_gb.toFixed(1)} GB`} c={ACCENT.green} />
            <MiniStat t={t} k="Livre" v={`${(snap.mem_total_gb - snap.mem_used_gb).toFixed(1)} GB`} />
            <MiniStat t={t} k="Total" v={`${snap.mem_total_gb.toFixed(1)} GB`} />
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
                <MiniStat t={t} k="Temp" v={gpu.temp_c != null ? `${gpu.temp_c.toFixed(0)}°C` : "—"} c={ACCENT.green} />
                {gpu.fan_rpm != null && <MiniStat t={t} k="Fan" v={`${gpu.fan_rpm} RPM`} />}
                {gpu.vram_total_mb != null && (
                  <MiniStat t={t} k="VRAM" v={`${(gpu.vram_used_mb / 1024).toFixed(1)}/${(gpu.vram_total_mb / 1024).toFixed(1)} GB`} c={ACCENT.purple} />
                )}
              </div>
              {vramPct != null && (
                <div style={{ marginTop: 2 }}>
                  <div style={{ fontSize: 10, color: t.textFaint, marginBottom: 4 }}>USO DE VRAM · {vramPct.toFixed(0)}%</div>
                  <div style={{ height: 6, background: t.panel, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${vramPct}%`, background: ACCENT.purple, borderRadius: 3 }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: t.textFaint, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Nenhuma GPU detectada</div>
          )}
        </div>
      </div>

      {/* Processos + Rede */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 18, padding: 20 }}>
          <div style={{ color: t.textDim, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>TOP PROCESSOS (RAM)</div>
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
          <div style={{ color: t.textDim, fontSize: 13, fontWeight: 600 }}>REDE</div>
          {snap.net.length === 0 && <span style={{ color: t.textFaint, fontSize: 13 }}>Nenhuma interface</span>}
          {snap.net.map((n) => (
            <div key={n.name}>
              <div style={{ fontSize: 12, color: t.textFaint, marginBottom: 6 }}>{n.name}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, background: t.panel, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: t.textFaint }}>↓ DOWNLOAD</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT.blue }}>{n.down_kb.toFixed(0)} KB/s</div>
                </div>
                <div style={{ flex: 1, background: t.panel, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: t.textFaint }}>↑ UPLOAD</div>
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

function CpuPage({ t, snap }) {
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
                  {s.phys_cores} núcleos · {s.threads} threads · {s.freq_ghz.toFixed(2)} GHz
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 30 }}>
              {[["USO MÉDIO", `${s.usage_pct.toFixed(0)}%`, ACCENT.blue],
                ["PACKAGE", s.package_temp_c != null ? `${s.package_temp_c.toFixed(0)}°C` : "—", ACCENT.green],
                ["FREQ", `${s.freq_ghz.toFixed(2)} GHz`, t.textDim]].map(([l, v, c]) => (
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
            <span style={{ color: t.textDim }}>▬ Atividade (%)</span>
            <span style={{ color: ACCENT.orange }}>▮ Temperatura (°C)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MemoryPage({ t, snap }) {
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
            <MemHeadStat t={t} k="Total" v={`${snap.mem_total_gb.toFixed(1)} GB`} />
            <MemHeadStat t={t} k="Usado" v={`${snap.mem_used_gb.toFixed(1)} GB`} />
            <MemHeadStat t={t} k="Livre" v={`${(snap.mem_total_gb - snap.mem_used_gb).toFixed(1)} GB`} />
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

function DisksPage({ t, snap }) {
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

function FansPage({ t }) {
  const [fans, setFans] = useState(null);
  const load = useCallback(() => { invoke("get_fans").then(setFans).catch(() => setFans([])); }, []);
  useEffect(() => { load(); const iv = setInterval(load, 2000); return () => clearInterval(iv); }, [load]);
  if (fans === null) return <Loading t={t} />;
  if (fans.length === 0) return <Empty t={t} msg="Nenhum fan detectado via /sys/class/hwmon." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {fans.map((f) => (
        <div key={f.id} style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{f.label}</div>
              <div style={{ color: t.textFaint, fontSize: 12 }}>{f.chip}</div>
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 600 }}>RPM</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: ACCENT.blue }}>{f.rpm}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 600 }}>PWM</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.textDim }}>{f.pct}%</div>
              </div>
            </div>
          </div>
          {f.controllable ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
              <input type="range" min="0" max="100" defaultValue={f.pct} style={{ flex: 1 }}
                onMouseUp={(e) => invoke("set_fan", { pwmPath: f.pwm_path, pwmEnablePath: f.pwm_enable_path, speed: Number(e.target.value) }).catch(() => {})} />
              <button onClick={() => invoke("set_fan_auto", { pwmEnablePath: f.pwm_enable_path }).catch(() => {})}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${t.stroke}`,
                  background: t.panel, color: t.text, cursor: "pointer", fontWeight: 600 }}>Auto</button>
            </div>
          ) : (
            <div style={{ color: t.textFaint, fontSize: 12, marginTop: 10 }}>Somente leitura (sem controle PWM).</div>
          )}
        </div>
      ))}
      <div style={{ color: t.textFaint, fontSize: 12, marginTop: 4 }}>
        Controle de fans requer root. Rode com pkexec/sudo se os sliders não tiverem efeito.
      </div>
    </div>
  );
}

function EnergyPage({ t }) {
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

function CleanerPage({ t }) {
  const [tasks, setTasks] = useState(null);
  const [results, setResults] = useState({});
  useEffect(() => { invoke("get_clean_tasks").then(setTasks).catch(() => setTasks([])); }, []);
  if (tasks === null) return <Loading t={t} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {tasks.map((task) => (
        <div key={task.id} style={{ background: t.card, border: `1px solid ${t.stroke}`, borderRadius: 14,
          padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{task.label}</span>
              {task.needs_root && <span style={{ fontSize: 9, fontWeight: 800, color: ACCENT.orange,
                background: `${ACCENT.orange}22`, padding: "2px 8px", borderRadius: 5 }}>ROOT</span>}
            </div>
            <div style={{ color: t.textFaint, fontSize: 12, marginTop: 2 }}>{task.description}</div>
            {results[task.id] && <div style={{ color: ACCENT.green, fontSize: 12, marginTop: 4 }}>
              {results[task.id]}</div>}
          </div>
          <button onClick={() => invoke("run_clean", { taskId: task.id }).then((r) =>
            setResults((prev) => ({ ...prev, [task.id]: `${r.result}${r.cleaned ? " (" + r.cleaned + ")" : ""}` }))).catch(() => {})}
            style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.stroke}`,
              background: t.panel, color: t.text, cursor: "pointer", fontWeight: 600 }}>Executar</button>
        </div>
      ))}
    </div>
  );
}

function AboutPage({ t, sysInfo }) {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, margin: "0 auto 18px",
          background: `linear-gradient(135deg, ${ACCENT.blue}, ${ACCENT.purple})`,
          display: "grid", placeItems: "center", fontSize: 32, fontWeight: 800, color: "#fff" }}>M</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>MachCtrl</div>
        <div style={{ color: t.textDim, fontSize: 14, marginTop: 4 }}>Monitor e Otimizador de Hardware para Linux</div>
        <div style={{ color: t.textFaint, fontSize: 12, marginTop: 14 }}>
          v0.1 · Rust + Tauri + React{sysInfo ? ` · ${sysInfo.distro}` : ""}
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
