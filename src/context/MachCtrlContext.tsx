import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Lang, detectLang, makeT } from '../i18n';
import {
  CleanResultDto, CleanTaskDto, CleanupTask, CpuSocketData, DimmModule, DiskPartition, FanCurvePoint, FanDevice,
  FanDto, FanMode, FanModeDto, MediaType, MemoryDto, NetworkInterface, ProcessItem, ProfilesDto, Snapshot,
  SystemInfo, TuneState, BatteryInfo,
} from '../types/machctrl';

const HISTORY = 60;
const PROC_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f97316', '#8b5cf6', '#ec4899'];
export const DEFAULT_CURVE: FanCurvePoint[] = [
  { temp: 30, pct: 30 }, { temp: 50, pct: 40 }, { temp: 65, pct: 60 }, { temp: 75, pct: 80 }, { temp: 85, pct: 100 },
];

export type PowerMode = 'economia' | 'equilibrado' | 'desempenho';
const PROFILE_TO_BACKEND: Record<PowerMode, string> = { economia: 'silent', equilibrado: 'balanced', desempenho: 'performance' };

interface Hist { cpu: number[]; temp: number[]; ram: number[]; net: Record<string, number[]>; rd: Record<string, number[]>; wr: Record<string, number[]> }
const EMPTY_HIST: Hist = { cpu: [], temp: [], ram: [], net: {}, rd: {}, wr: {} };

const push = (arr: number[] | undefined, v: number, n = HISTORY) => [...(arr ?? []), v].slice(-n);

export function diskLabel(mountpoint: string): string {
  if (!mountpoint) return '—';
  if (mountpoint === '/') return '/';
  for (const root of ['/run/media/', '/media/', '/mnt/']) {
    if (mountpoint.startsWith(root)) return mountpoint.split('/').filter(Boolean).pop() || mountpoint;
  }
  return mountpoint;
}

function mediaType(t: string): MediaType {
  const k = (t || '').toLowerCase();
  return k === 'nvme' ? 'NVMe' : k === 'ssd' ? 'SSD' : k === 'usb' ? 'USB' : 'HDD';
}

function fanRole(chip: string, label: string): FanDevice['type'] {
  const c = (chip || '').toLowerCase();
  const l = (label || '').toLowerCase();
  if (c.includes('amdgpu') || c.includes('nvidia') || c.includes('nouveau') || c.includes('radeon') || l.includes('gpu')) return 'GPU';
  if (c.includes('k10temp') || c.includes('coretemp') || c.startsWith('nct') || c.startsWith('it87') || c.startsWith('f71') || c.includes('cpu') || l.includes('cpu')) return 'CPU';
  return 'Sistema';
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: 'dark' | 'light';
  setTheme: (th: 'dark' | 'light') => void;
  t: (s: string) => string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMaximized: boolean;

  wallpaper: string | null;
  ready: boolean;
  snap: Snapshot | null;
  sysInfo: SystemInfo | null;
  refresh: () => void;
  hist: Hist;
  tempAlert: { kind: 'cpu' | 'gpu'; temp: number } | null;
  dismissTempAlert: () => void;

  isLaptop: boolean;
  battery: BatteryInfo | null;
  topProcesses: ProcessItem[];
  networks: NetworkInterface[];
  sockets: CpuSocketData[];
  dimms: DimmModule[];
  memSlotsTotal: number;
  memSlotsUsed: number;
  readMemoryRoot: () => void;
  memLoadingRoot: boolean;
  disks: DiskPartition[];

  fans: FanDevice[];
  fansLoaded: boolean;
  setFanMode: (id: string, mode: FanMode) => void;
  setFanManualPct: (id: string, pct: number) => void;
  maxConfirmFan: FanDevice | null;
  confirmMax: () => void;
  cancelMax: () => void;
  curveFanId: string | null;
  openCurveEditor: (fanId?: string) => void;
  closeCurveEditor: () => void;
  curvePoints: FanCurvePoint[];
  setCurvePoint: (idx: number, patch: Partial<FanCurvePoint>) => void;
  applyCurve: () => void;

  powerMode: PowerMode | null;
  availableModes: PowerMode[];
  setPowerMode: (m: PowerMode) => void;
  energyError: string | null;

  cleanupTasks: CleanupTask[];
  runCleanupTask: (id: string) => void;
  runAllCleanup: () => void;
  isCleaningAll: boolean;
  totalFreedBytes: number;

  tune: TuneState | null;
  applyTune: (cmd: string, args: Record<string, unknown>) => void;
}

const MachCtrlContext = createContext<Ctx | null>(null);

export const MachCtrlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(detectLang());
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const langRef = useRef<Lang>(lang);
  const themeRef = useRef<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState('overview');
  const [isMaximized, setIsMaximized] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [hist, setHist] = useState<Hist>(EMPTY_HIST);
  const [tempAlert, setTempAlert] = useState<Ctx['tempAlert']>(null);
  const alertDismissedAt = useRef(0);
  const prefsLoaded = useRef(false);
  const prefsRaw = useRef<Record<string, unknown>>({});

  const t = useMemo(() => makeT(lang), [lang]);

  // ---- janela ----
  useEffect(() => {
    try {
      const win = getCurrentWindow();
      win.isMaximized().then(setIsMaximized).catch(() => {});
      const un = win.onResized(async () => {
        try { setIsMaximized(await win.isMaximized()); } catch { /* ignora */ }
      });
      return () => { un.then((f) => f()).catch(() => {}); };
    } catch { /* fora do Tauri */ }
  }, []);

  // ---- preferências (idioma) ----
  useEffect(() => {
    invoke<string>('load_ui_prefs').then((raw) => {
      try {
        const p = JSON.parse(raw || '{}');
        prefsRaw.current = p;
        if (p.lang === 'pt-BR' || p.lang === 'en') { setLangState(p.lang); langRef.current = p.lang; }
        if (typeof p.dark === 'boolean') { const th = p.dark ? 'dark' : 'light'; setThemeState(th); themeRef.current = th; }
      } catch { /* padrões */ }
      prefsLoaded.current = true;
    }).catch(() => { prefsLoaded.current = true; });
  }, []);
  const savePrefs = useCallback(() => {
    if (!prefsLoaded.current) return;
    invoke('save_ui_prefs', {
      prefs: JSON.stringify({ ...prefsRaw.current, dark: themeRef.current === 'dark', lang: langRef.current }),
    }).catch(() => {});
  }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); langRef.current = l; savePrefs(); }, [savePrefs]);
  const setTheme = useCallback((th: 'dark' | 'light') => { setThemeState(th); themeRef.current = th; savePrefs(); }, [savePrefs]);

  // ---- sysinfo / refresh ----
  const loadSysInfo = useCallback(() => { invoke<SystemInfo>('get_system_info').then(setSysInfo).catch(() => {}); }, []);
  useEffect(loadSysInfo, [loadSysInfo]);

  // ---- snapshot a cada 1s ----
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await invoke<Snapshot>('get_snapshot');
        if (!alive) return;
        const cpuT = Math.max(0, ...(s.sockets || []).map((k) => k.package_temp_c || 0), s.cpu_temp_c || 0);
        setHist((h) => {
          const net = { ...h.net }, rd = { ...h.rd }, wr = { ...h.wr };
          s.net.forEach((n) => { net[n.name] = push(net[n.name], n.down_kb, 30); });
          s.disks.forEach((d) => { rd[d.device] = push(rd[d.device], d.read_mbs, 30); wr[d.device] = push(wr[d.device], d.write_mbs, 30); });
          return { cpu: push(h.cpu, s.cpu_usage), temp: push(h.temp, cpuT), ram: push(h.ram, s.mem_pct), net, rd, wr };
        });
        setSnap(s);

        // alerta >= 90°C, com 60 s de intervalo após ser dispensado
        const gpuT = s.gpus?.[0]?.temp_c || 0;
        if (Date.now() - alertDismissedAt.current > 60000) {
          if (cpuT >= 90) setTempAlert({ kind: 'cpu', temp: cpuT });
          else if (gpuT >= 90) setTempAlert({ kind: 'gpu', temp: gpuT });
        }
      } catch { /* backend ainda subindo */ }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  const dismissTempAlert = useCallback(() => { setTempAlert(null); alertDismissedAt.current = Date.now(); }, []);

  // ---- memória (slots) ----
  const [mem, setMem] = useState<MemoryDto | null>(null);
  const [memLoadingRoot, setMemLoadingRoot] = useState(false);
  const loadMem = useCallback(() => {
    invoke<MemoryDto>('get_memory_slots').then(setMem).catch(() => setMem({ slots: [], total_slots: 0, occupied_slots: 0 }));
  }, []);
  useEffect(loadMem, [loadMem]);
  const readMemoryRoot = useCallback(() => {
    setMemLoadingRoot(true);
    invoke<MemoryDto>('get_memory_slots_root').then(setMem).catch(() => {}).finally(() => setMemLoadingRoot(false));
  }, []);

  // ---- fans ----
  const [fanList, setFanList] = useState<FanDto[] | null>(null);
  const [fanModes, setFanModes] = useState<Record<string, FanMode>>({});
  const [manualPct, setManualPct] = useState<Record<string, number>>({});
  const [savedCurves, setSavedCurves] = useState<Record<string, FanCurvePoint[]>>({});
  const loadFans = useCallback(() => {
    invoke<FanDto[]>('get_fans')
      .then((l) => setFanList((l || []).slice().sort((a, b) => a.id.localeCompare(b.id))))
      .catch(() => setFanList([]));
  }, []);
  useEffect(() => { loadFans(); const iv = setInterval(loadFans, 2000); return () => clearInterval(iv); }, [loadFans]);
  useEffect(() => {
    invoke<FanModeDto[]>('get_fan_modes').then((list) => {
      const m: Record<string, FanMode> = {}, mp: Record<string, number> = {}, cv: Record<string, FanCurvePoint[]> = {};
      (list || []).forEach((f) => {
        m[f.fan_id] = f.mode;
        mp[f.fan_id] = f.manual_pct;
        if (f.curve?.length) cv[f.fan_id] = f.curve.map((p) => ({ temp: p.temp, pct: p.pct }));
      });
      setFanModes(m);
      setManualPct((prev) => ({ ...mp, ...prev }));
      setSavedCurves(cv);
    }).catch(() => {});
  }, []);

  const fans: FanDevice[] = useMemo(() => {
    const list = fanList ?? [];
    const roles = list.map((f) => fanRole(f.chip, f.label));
    const total: Record<string, number> = {};
    roles.forEach((r) => { total[r] = (total[r] || 0) + 1; });
    const seen: Record<string, number> = {};
    return list.map((f, i) => {
      const r = roles[i];
      seen[r] = (seen[r] || 0) + 1;
      return {
        id: f.id,
        name: total[r] > 1 ? `${r} ${seen[r]}` : r,
        type: r,
        chip: f.chip,
        controllable: f.controllable,
        pwmPath: f.pwm_path,
        pwmEnablePath: f.pwm_enable_path,
        mode: fanModes[f.id] ?? 'auto',
        rpm: f.rpm,
        pwmPercent: (fanModes[f.id] === 'manual' && manualPct[f.id] != null) ? manualPct[f.id] : f.pct,
      };
    });
  }, [fanList, fanModes, manualPct]);

  const fanBase = (f: FanDevice) => ({ fanId: f.id, pwmPath: f.pwmPath, pwmEnablePath: f.pwmEnablePath, chip: f.chip });
  const [maxConfirmFan, setMaxConfirmFan] = useState<FanDevice | null>(null);

  const applyFanMode = useCallback((f: FanDevice, mode: FanMode) => {
    setFanModes((m) => ({ ...m, [f.id]: mode }));
    if (mode === 'auto') {
      if (f.pwmEnablePath) invoke('set_fan_auto', { ...fanBase(f), pwmEnablePath: f.pwmEnablePath }).catch(() => {});
    } else if (mode === 'max') {
      invoke('set_fan', { ...fanBase(f), speed: 100, max: true }).catch(() => {});
    } else if (mode === 'manual') {
      invoke('set_fan', { ...fanBase(f), speed: manualPct[f.id] ?? f.pwmPercent, max: false }).catch(() => {});
    }
  }, [manualPct]);

  const [curveFanId, setCurveFanId] = useState<string | null>(null);
  const [curvePoints, setCurvePoints] = useState<FanCurvePoint[]>(DEFAULT_CURVE);

  const setFanMode = useCallback((id: string, mode: FanMode) => {
    const f = fans.find((x) => x.id === id);
    if (!f || !f.controllable) return;
    if (mode === 'max') { setMaxConfirmFan(f); return; }
    if (mode === 'curve') {
      setCurveFanId(id);
      setCurvePoints(savedCurves[id] ?? DEFAULT_CURVE);
      return;
    }
    applyFanMode(f, mode);
  }, [fans, applyFanMode, savedCurves]);

  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFanManualPct = useCallback((id: string, pct: number) => {
    setManualPct((m) => ({ ...m, [id]: pct }));
    const f = fans.find((x) => x.id === id);
    if (!f) return;
    if (manualTimer.current) clearTimeout(manualTimer.current);
    manualTimer.current = setTimeout(() => {
      invoke('set_fan', { ...fanBase(f), speed: pct, max: false }).catch(() => {});
    }, 200);
  }, [fans]);

  const confirmMax = useCallback(() => { if (maxConfirmFan) applyFanMode(maxConfirmFan, 'max'); setMaxConfirmFan(null); }, [maxConfirmFan, applyFanMode]);
  const cancelMax = useCallback(() => setMaxConfirmFan(null), []);

  const openCurveEditor = useCallback((fanId?: string) => {
    const f = fanId ? fans.find((x) => x.id === fanId) : fans.find((x) => x.controllable);
    if (!f) return;
    setCurveFanId(f.id);
    setCurvePoints(savedCurves[f.id] ?? DEFAULT_CURVE);
  }, [fans, savedCurves]);
  const closeCurveEditor = useCallback(() => setCurveFanId(null), []);
  const setCurvePoint = useCallback((idx: number, patch: Partial<FanCurvePoint>) => {
    setCurvePoints((pts) => pts.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }, []);
  const applyCurve = useCallback(() => {
    const f = fans.find((x) => x.id === curveFanId);
    if (f) {
      const pts = [...curvePoints].sort((a, b) => a.temp - b.temp);
      invoke('set_fan_curve', { ...fanBase(f), points: pts }).catch(() => {});
      setFanModes((m) => ({ ...m, [f.id]: 'curve' }));
      setSavedCurves((c) => ({ ...c, [f.id]: pts }));
    }
    setCurveFanId(null);
  }, [fans, curveFanId, curvePoints]);

  // ---- energia ----
  const [profiles, setProfiles] = useState<ProfilesDto | null>(null);
  const [energyError, setEnergyError] = useState<string | null>(null);
  const loadProfiles = useCallback(() => { invoke<ProfilesDto>('get_profiles').then(setProfiles).catch(() => setProfiles(null)); }, []);
  useEffect(loadProfiles, [loadProfiles]);
  const backendToMode = (b: string): PowerMode | null =>
    (Object.keys(PROFILE_TO_BACKEND) as PowerMode[]).find((k) => PROFILE_TO_BACKEND[k] === b) ?? null;
  const powerMode = profiles ? backendToMode(profiles.current) : null;
  const availableModes = (profiles?.available ?? []).map(backendToMode).filter((x): x is PowerMode => !!x);
  const setPowerMode = useCallback((m: PowerMode) => {
    setEnergyError(null);
    invoke('apply_profile', { name: PROFILE_TO_BACKEND[m] })
      .catch((e) => setEnergyError(String(e)))
      .finally(loadProfiles);
  }, [loadProfiles]);

  // ---- limpeza ----
  const [cleanupTasks, setCleanupTasks] = useState<CleanupTask[]>([]);
  const [isCleaningAll, setIsCleaningAll] = useState(false);
  const [totalFreedBytes, setTotalFreedBytes] = useState(0);
  useEffect(() => {
    invoke<CleanTaskDto[]>('get_clean_tasks').then((l) =>
      setCleanupTasks((l || []).map((x) => ({
        id: x.id, title: x.label, description: x.description, isRoot: x.needs_root, status: 'idle', resultText: '', bytes: 0,
      })))).catch(() => setCleanupTasks([]));
  }, []);
  const patchTask = (id: string, p: Partial<CleanupTask>) =>
    setCleanupTasks((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const runOne = useCallback(async (id: string): Promise<number> => {
    patchTask(id, { status: 'running', resultText: '' });
    try {
      const r = await invoke<CleanResultDto>('run_clean', { taskId: id });
      patchTask(id, { status: r.ok ? 'done' : 'failed', resultText: `${r.result}${r.cleaned ? ' (' + r.cleaned + ')' : ''}`, bytes: r.bytes || 0 });
      return r.bytes || 0;
    } catch {
      patchTask(id, { status: 'failed', resultText: '' });
      return 0;
    }
  }, []);
  const runCleanupTask = useCallback((id: string) => { runOne(id).then((b) => setTotalFreedBytes((x) => x + b)); }, [runOne]);
  const runAllCleanup = useCallback(async () => {
    setIsCleaningAll(true);
    let total = 0;
    for (const task of cleanupTasks) total += await runOne(task.id);
    setTotalFreedBytes(total);
    setIsCleaningAll(false);
  }, [cleanupTasks, runOne]);

  // ---- ajustes ----
  const [tune, setTune] = useState<TuneState | null>(null);
  const loadTune = useCallback(() => { invoke<TuneState>('get_tune_state').then(setTune).catch(() => setTune(null)); }, []);
  useEffect(loadTune, [loadTune]);
  const applyTune = useCallback((cmd: string, args: Record<string, unknown>) => {
    invoke(cmd, args).catch(() => {}).finally(() => setTimeout(loadTune, 150));
  }, [loadTune]);

  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const loadWallpaper = useCallback(() => { invoke<string | null>('get_wallpaper_blur').then((w) => setWallpaper(w ?? null)).catch(() => {}); }, []);
  useEffect(loadWallpaper, [loadWallpaper]);

  const refresh = useCallback(() => { loadWallpaper(); loadSysInfo(); loadMem(); loadFans(); loadProfiles(); loadTune(); }, [loadSysInfo, loadMem, loadFans, loadProfiles, loadTune]);

  // ---- derivados ----
  const battery = snap?.battery ?? null;
  const topProcesses: ProcessItem[] = useMemo(() => {
    const total = (snap?.mem_total_gb ?? 0) * 1024;
    return (snap?.top_procs ?? []).slice(0, 6).map((p, i) => ({
      pid: p.pid, name: p.name, ramMb: p.rss_mb, ramPercent: total > 0 ? (p.rss_mb / total) * 100 : 0, color: PROC_COLORS[i % PROC_COLORS.length],
    }));
  }, [snap]);
  const networks: NetworkInterface[] = useMemo(() =>
    (snap?.net ?? []).map((n) => ({ name: n.name, downloadKb: n.down_kb, uploadKb: n.up_kb, historyDown: hist.net[n.name] ?? [n.down_kb] })), [snap, hist.net]);
  const sockets: CpuSocketData[] = useMemo(() =>
    (snap?.sockets ?? []).map((s) => ({
      id: s.socket_id, model: s.model, cores: s.phys_cores, threads: s.threads, freqGhz: s.freq_ghz,
      usageAvg: Math.round(s.usage_pct), tempAvg: s.package_temp_c,
      threadList: s.cores.map((c) => ({ id: c.id, usage: Math.round(c.pct), temp: c.temp_c ?? s.package_temp_c })),
    })), [snap]);
  const dimms: DimmModule[] = useMemo(() => {
    const slots = mem?.slots ?? [];
    const out: DimmModule[] = slots.map((s) => ({
      slot: s.locator, sizeGb: s.size_gb, type: s.mem_type, manufacturer: s.manufacturer, model: s.part_number,
      speedMts: s.speed_mhz, voltageVolts: s.voltage, isEmpty: false,
    }));
    const empty = Math.max(0, (mem?.total_slots ?? 0) - slots.length);
    for (let i = 0; i < empty; i++) out.push({ slot: `#${slots.length + i + 1}`, sizeGb: 0, type: '', manufacturer: '', model: '', speedMts: 0, voltageVolts: 0, isEmpty: true });
    return out;
  }, [mem]);
  const disks: DiskPartition[] = useMemo(() =>
    (snap?.disks ?? []).map((d) => ({
      id: `${d.device}:${d.mountpoint}`, name: diskLabel(d.mountpoint), mountPoint: d.mountpoint, device: d.device, fsType: d.fstype,
      mediaType: mediaType(d.disk_type), usedGb: d.used_gb, totalGb: d.total_gb, usagePercent: d.usage_pct,
      readMb: d.read_mbs, writeMb: d.write_mbs,
      readHistory: hist.rd[d.device] ?? [d.read_mbs], writeHistory: hist.wr[d.device] ?? [d.write_mbs],
    })), [snap, hist.rd, hist.wr]);

  const value: Ctx = {
    lang, setLang, theme, setTheme, t, activeTab, setActiveTab, isMaximized,
    wallpaper, ready: !!snap, snap, sysInfo, refresh, hist, tempAlert, dismissTempAlert,
    isLaptop: !!battery, battery, topProcesses, networks, sockets, dimms,
    memSlotsTotal: mem?.total_slots ?? 0, memSlotsUsed: mem?.occupied_slots ?? 0, readMemoryRoot, memLoadingRoot, disks,
    fans, fansLoaded: fanList !== null, setFanMode, setFanManualPct, maxConfirmFan, confirmMax, cancelMax,
    curveFanId, openCurveEditor, closeCurveEditor, curvePoints, setCurvePoint, applyCurve,
    powerMode, availableModes, setPowerMode, energyError,
    cleanupTasks, runCleanupTask, runAllCleanup, isCleaningAll, totalFreedBytes,
    tune, applyTune,
  };
  return <MachCtrlContext.Provider value={value}>{children}</MachCtrlContext.Provider>;
};

export const useMachCtrl = () => {
  const ctx = useContext(MachCtrlContext);
  if (!ctx) throw new Error('useMachCtrl must be within MachCtrlProvider');
  return ctx;
};
