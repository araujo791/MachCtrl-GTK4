import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  CleanupTask,
  CpuSocketData,
  CpuThreadData,
  DimmModule,
  DiskPartition,
  DiskScheduler,
  FanDevice,
  NetworkInterface,
  ProcessItem,
  SystemService,
} from '../types/machctrl';

export interface FanCurvePoint {
  temp: number;
  speed: number;
}

interface MachCtrlContextType {
  isLaptop: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  lang: 'BR' | 'EN';
  setLang: (lang: 'BR' | 'EN') => void;
  isCurveEditorOpen: boolean;
  setIsCurveEditorOpen: (open: boolean) => void;

  // Telemetry
  topProcesses: ProcessItem[];
  networks: NetworkInterface[];
  sockets: CpuSocketData[];
  dimms: DimmModule[];
  disks: DiskPartition[];
  fans: FanDevice[];
  updateFanMode: (fanId: string, mode: FanDevice['mode']) => void;
  updateFanPwm: (fanId: string, pwm: number) => void;
  fanCurve: FanCurvePoint[];
  updateFanCurvePoint: (idx: number, speed: number) => void;

  // Energy
  powerMode: 'economia' | 'equilibrado' | 'desempenho';
  setPowerMode: (mode: 'economia' | 'equilibrado' | 'desempenho') => void;
  battery: {
    present: boolean;
    percent: number;
    healthPercent: number;
    voltage: number;
    currentWh: number;
    totalWh: number;
    isPlugged: boolean;
    stateText: string;
    tech: string;
    model: string;
  };

  // Cleanup
  cleanupTasks: CleanupTask[];
  runCleanupTask: (id: string) => void;
  runAllCleanup: () => void;
  isCleaningAll: boolean;

  // Adjustments
  swappiness: number;
  setSwappiness: (val: number) => void;
  vfsCachePressure: number;
  setVfsCachePressure: (val: number) => void;
  hugePages: 'always' | 'madvise' | 'never';
  setHugePages: (val: 'always' | 'madvise' | 'never') => void;
  tcpCongestion: 'bbr' | 'cubic' | 'reno';
  setTcpCongestion: (val: 'bbr' | 'cubic' | 'reno') => void;
  dirtyBackgroundRatio: number;
  setDirtyBackgroundRatio: (val: number) => void;
  dirtyRatio: number;
  setDirtyRatio: (val: number) => void;
  services: SystemService[];
  toggleService: (name: string) => void;
  diskSchedulers: DiskScheduler[];
  setDiskScheduler: (device: string, scheduler: DiskScheduler['scheduler']) => void;
}

const MachCtrlContext = createContext<MachCtrlContextType | null>(null);

const DEFAULT_PROCESSES: ProcessItem[] = [
  { name: 'Telegram', ramMb: 1420, ramPercent: 18.2, color: '#3b82f6' },
  { name: 'msedge', ramMb: 1180, ramPercent: 15.1, color: '#06b6d4' },
  { name: 'msedge', ramMb: 980, ramPercent: 12.6, color: '#10b981' },
  { name: 'vivaldi', ramMb: 680, ramPercent: 8.7, color: '#f97316' },
  { name: 'plasmashell', ramMb: 620, ramPercent: 8.0, color: '#8b5cf6' },
  { name: 'vivaldi', ramMb: 580, ramPercent: 7.4, color: '#ec4899' },
];

const DEFAULT_NETWORKS: NetworkInterface[] = [
  { name: 'enp5s0', downloadKb: 81, uploadKb: 5, historyDown: [12, 45, 67, 81, 74, 95, 81] },
  { name: 'enp6s0', downloadKb: 0, uploadKb: 0, historyDown: [0, 0, 0, 0, 0, 0, 0] },
];

function generateThreads(count: number, baseTemp: number): CpuThreadData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    usage: Math.floor(Math.random() * 15),
    temp: baseTemp + Math.floor(Math.random() * 4 - 2),
  }));
}

export const MachCtrlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Automatic Chassis / Hardware Detection (laptops have BAT0/BAT1 ACPI controllers)
  const [isLaptop] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<'BR' | 'EN'>('BR');
  const [isCurveEditorOpen, setIsCurveEditorOpen] = useState(false);
  const [powerMode, setPowerMode] = useState<'economia' | 'equilibrado' | 'desempenho'>('desempenho');
  const [isCleaningAll, setIsCleaningAll] = useState(false);

  // Top Processes
  const [topProcesses] = useState<ProcessItem[]>(DEFAULT_PROCESSES);

  // Networks
  const [networks, setNetworks] = useState<NetworkInterface[]>(DEFAULT_NETWORKS);

  // Sockets & Threads
  const [sockets] = useState<CpuSocketData[]>([
    {
      id: 0,
      model: 'Intel(R) Core(R) i7 / Xeon CPU E5-2680 v4 @ 2.40GHz',
      cores: 14,
      threads: 28,
      freqGhz: 2.90,
      usageAvg: 9,
      tempAvg: 48,
      threadList: generateThreads(28, 48),
    },
    {
      id: 1,
      model: 'Intel(R) Core(R) i7 / Xeon CPU E5-2680 v4 @ 2.40GHz',
      cores: 14,
      threads: 28,
      freqGhz: 2.79,
      usageAvg: 3,
      tempAvg: 51,
      threadList: generateThreads(28, 51),
    },
  ]);

  // DIMM Memory Modules
  const [dimms] = useState<DimmModule[]>([
    { slot: 'DIMM_A1', sizeGb: 16, type: 'DDR4', manufacturer: 'Micron', model: '36ASF2G72PZ-2G1A2', speedMts: 2133, voltageVolts: 1.20, isEmpty: false },
    { slot: 'DIMM_C1', sizeGb: 16, type: 'DDR4', manufacturer: 'Micron', model: '36ASF2G72PZ-2G1A2', speedMts: 2133, voltageVolts: 1.20, isEmpty: false },
    { slot: 'DIMM_E1', sizeGb: 16, type: 'DDR4', manufacturer: 'Micron', model: '36ASF2G72PZ-2G1A2', speedMts: 2133, voltageVolts: 1.20, isEmpty: false },
    { slot: 'DIMM_G1', sizeGb: 16, type: 'DDR4', manufacturer: 'Micron', model: '36ASF2G72PZ-2G1A2', speedMts: 2133, voltageVolts: 1.20, isEmpty: false },
    { slot: 'Slot vazio 1', sizeGb: 0, type: '', manufacturer: '', model: '', speedMts: 0, voltageVolts: 0, isEmpty: true },
    { slot: 'Slot vazio 2', sizeGb: 0, type: '', manufacturer: '', model: '', speedMts: 0, voltageVolts: 0, isEmpty: true },
    { slot: 'Slot vazio 3', sizeGb: 0, type: '', manufacturer: '', model: '', speedMts: 0, voltageVolts: 0, isEmpty: true },
    { slot: 'Slot vazio 4', sizeGb: 0, type: '', manufacturer: '', model: '', speedMts: 0, voltageVolts: 0, isEmpty: true },
  ]);

  // Disks Partitions
  const [disks] = useState<DiskPartition[]>([
    { id: 'd1', name: '/', mountPoint: '/', device: 'nvme0n1p1', fsType: 'f2fs', mediaType: 'NVMe', usedGb: 54.3, totalGb: 953.4, usagePercent: 5.7, readMb: 0.2, writeMb: 0.0, readHistory: [0.1, 0.2, 0.4, 0.2, 0.1, 0.3, 0.2], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd2', name: '/boot/efi', mountPoint: '/boot/efi', device: 'nvme0n1p2', fsType: 'vfat', mediaType: 'NVMe', usedGb: 0.02, totalGb: 0.5, usagePercent: 4.6, readMb: 0.2, writeMb: 0.0, readHistory: [0.1, 0.2, 0.2, 0.1, 0.2, 0.2, 0.2], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd3', name: 'Port_Roms', mountPoint: '/mnt/Port_Roms', device: 'sde1', fsType: 'exfat', mediaType: 'HDD', usedGb: 51.4, totalGb: 465.7, usagePercent: 11.0, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd4', name: 'Documentos', mountPoint: '/mnt/Documentos', device: 'sda1', fsType: 'exfat', mediaType: 'HDD', usedGb: 1043.3, totalGb: 3725.9, usagePercent: 28.0, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd5', name: 'JogoCachy', mountPoint: '/mnt/JogoCachy', device: 'sdg1', fsType: 'btrfs', mediaType: 'HDD', usedGb: 3.3, totalGb: 1863.0, usagePercent: 0.2, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd6', name: 'Distros', mountPoint: '/mnt/Distros', device: 'sdc1', fsType: 'exfat', mediaType: 'HDD', usedGb: 175.3, totalGb: 465.7, usagePercent: 37.6, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd7', name: 'Android', mountPoint: '/mnt/Android', device: 'sdb1', fsType: 'ntfs3', mediaType: 'SSD', usedGb: 159.0, totalGb: 931.5, usagePercent: 17.1, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd8', name: 'Navegadores', mountPoint: '/mnt/Navegadores', device: 'sdd1', fsType: 'exfat', mediaType: 'SSD', usedGb: 66.7, totalGb: 446.7, usagePercent: 14.9, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd9', name: 'Covenant', mountPoint: '/mnt/Covenant', device: 'sdf1', fsType: 'ntfs3', mediaType: 'HDD', usedGb: 831.5, totalGb: 1863.0, usagePercent: 44.6, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd10', name: 'Instaladores', mountPoint: '/mnt/Instaladores', device: 'sdh1', fsType: 'ntfs3', mediaType: 'HDD', usedGb: 185.2, totalGb: 931.5, usagePercent: 19.9, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'd11', name: 'Programas', mountPoint: '/mnt/Programas', device: 'sdi1', fsType: 'ntfs3', mediaType: 'HDD', usedGb: 402.5, totalGb: 931.5, usagePercent: 43.2, readMb: 0.0, writeMb: 0.0, readHistory: [0, 0, 0, 0, 0, 0, 0], writeHistory: [0, 0, 0, 0, 0, 0, 0] },
  ]);

  // Fans Devices
  const [fans, setFans] = useState<FanDevice[]>([
    { id: 'fan-gpu', name: 'GPU', type: 'GPU', targetDevice: 'NVIDIA RTX / Intel Xe', mode: 'Curva', rpm: 1103, maxRpm: 3200, pwmPercent: 38, color: '#8b5cf6', hasCurveSupport: true },
    { id: 'fan-cpu-1', name: 'CPU 1', type: 'CPU', targetDevice: 'CPU Socket 0 Primary', mode: 'Automático', rpm: 1804, maxRpm: 2600, pwmPercent: 70, color: '#f97316' },
    { id: 'fan-cpu-2', name: 'CPU 2', type: 'CPU', targetDevice: 'CPU Socket 0 Auxiliary', mode: 'Automático', rpm: 1816, maxRpm: 2600, pwmPercent: 75, color: '#f97316' },
    { id: 'fan-cpu-3', name: 'CPU 3', type: 'CPU', targetDevice: 'CPU Socket 1 Primary', mode: 'Automático', rpm: 0, maxRpm: 2600, pwmPercent: 50, color: '#f97316' },
    { id: 'fan-cpu-4', name: 'CPU 4', type: 'CPU', targetDevice: 'CPU Socket 1 Auxiliary', mode: 'Automático', rpm: 0, maxRpm: 2600, pwmPercent: 100, color: '#f97316' },
    { id: 'fan-cpu-5', name: 'CPU 5', type: 'CPU', targetDevice: 'Chassis VRM Exhaust', mode: 'Automático', rpm: 0, maxRpm: 2400, pwmPercent: 100, color: '#f97316' },
  ]);

  const [fanCurve, setFanCurve] = useState<FanCurvePoint[]>([
    { temp: 35, speed: 30 },
    { temp: 50, speed: 45 },
    { temp: 65, speed: 65 },
    { temp: 80, speed: 85 },
    { temp: 90, speed: 100 },
  ]);

  const updateFanMode = (fanId: string, mode: FanDevice['mode']) => {
    setFans((prev) =>
      prev.map((f) => {
        if (f.id !== fanId) return f;
        let newPwm = f.pwmPercent;
        let newRpm = f.rpm;
        if (mode === 'Máximo') {
          newPwm = 100;
          newRpm = f.maxRpm;
        } else if (mode === 'Manual') {
          newPwm = 50;
          newRpm = Math.round(f.maxRpm * 0.5);
        } else if (mode === 'Automático') {
          newPwm = 65;
          newRpm = Math.round(f.maxRpm * 0.65);
        }
        return { ...f, mode, pwmPercent: newPwm, rpm: newRpm };
      })
    );
  };

  const updateFanPwm = (fanId: string, pwm: number) => {
    setFans((prev) =>
      prev.map((f) => {
        if (f.id !== fanId) return f;
        const newRpm = Math.round((f.maxRpm * pwm) / 100);
        return { ...f, pwmPercent: pwm, rpm: newRpm };
      })
    );
  };

  const updateFanCurvePoint = (idx: number, speed: number) => {
    setFanCurve((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx] = { ...copy[idx], speed };
      return copy;
    });
  };

  // Battery
  const [battery] = useState({
    present: true,
    percent: 100,
    healthPercent: 60,
    voltage: 16.59,
    currentWh: 24.8,
    totalWh: 41.4,
    isPlugged: true,
    stateText: 'Carga completa',
    tech: 'Li-ion',
    model: 'SIMPLO · DELL VN3N047E794',
  });

  // Cleanup Tasks
  const [cleanupTasks, setCleanupTasks] = useState<CleanupTask[]>([
    { id: 'pacman', title: 'Cache do Pacman', isRoot: true, description: 'Remove pacotes antigos (/var/cache/pacman/pkg)', sizeMb: 1420, cleaned: false },
    { id: 'orphans', title: 'Pacotes Órfãos', isRoot: true, description: 'Remove pacotes sem dependentes instalados', sizeMb: 480, cleaned: false },
    { id: 'journal', title: 'Logs do Journal', isRoot: true, description: 'Limpa logs do systemd (mantém últimos 7 dias)', sizeMb: 720, cleaned: false },
    { id: 'tmp', title: 'Arquivos Temporários', isRoot: true, description: 'Remove arquivos antigos de /tmp e /var/tmp', sizeMb: 350, cleaned: false },
    { id: 'thumbs', title: 'Cache de Miniaturas', isRoot: false, description: 'Limpa thumbnails (~/.cache/thumbnails)', sizeMb: 210, cleaned: false },
    { id: 'coredumps', title: 'Core Dumps', isRoot: true, description: 'Remove arquivos de crash do sistema', sizeMb: 85, cleaned: false },
    { id: 'trash', title: 'Lixeira', isRoot: false, description: 'Esvazia a lixeira do usuário (~/.local/share/Trash)', sizeMb: 180, cleaned: false },
    { id: 'flatpak', title: 'Flatpak não usados', isRoot: false, description: 'Remove runtimes Flatpak desnecessários (flatpak uninstall --unused)', sizeMb: 940, cleaned: false },
  ]);

  const runCleanupTask = (id: string) => {
    setCleanupTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, cleaned: true, sizeMb: 0 } : t))
    );
  };

  const runAllCleanup = () => {
    setIsCleaningAll(true);
    setTimeout(() => {
      setCleanupTasks((prev) => prev.map((t) => ({ ...t, cleaned: true, sizeMb: 0 })));
      setIsCleaningAll(false);
    }, 1000);
  };

  // Adjustments (Tuning)
  const [swappiness, setSwappiness] = useState(10);
  const [vfsCachePressure, setVfsCachePressure] = useState(50);
  const [hugePages, setHugePages] = useState<'always' | 'madvise' | 'never'>('always');
  const [tcpCongestion, setTcpCongestion] = useState<'bbr' | 'cubic' | 'reno'>('bbr');
  const [dirtyBackgroundRatio, setDirtyBackgroundRatio] = useState(10);
  const [dirtyRatio, setDirtyRatio] = useState(20);

  const [services, setServices] = useState<SystemService[]>([
    { name: 'ananicy-cpp', enabled: true, tooltip: 'Otimizador de auto-nice e prioridades de I/O em C++' },
    { name: 'irqbalance', enabled: false, tooltip: 'Distribui interrupções de hardware entre núcleos' },
    { name: 'bluetooth', enabled: false, tooltip: 'Pilha bluetooth do sistema (economiza bateria se desligado)' },
    { name: 'cups', enabled: true, tooltip: 'Serviço de impressão do sistema' },
    { name: 'fstrim.timer', enabled: true, tooltip: 'Trim semanal para SSDs e unidades NVMe' },
  ]);

  const toggleService = (name: string) => {
    setServices((prev) =>
      prev.map((s) => (s.name === name ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const [diskSchedulers, setDiskSchedulers] = useState<DiskScheduler[]>([
    { device: 'nvme0n1', mediaType: 'NVMe', scheduler: 'none' },
    { device: 'nvme1n1', mediaType: 'NVMe', scheduler: 'none' },
    { device: 'sda', mediaType: 'HDD', scheduler: 'bfq' },
    { device: 'sdb', mediaType: 'SSD', scheduler: 'mq-deadline' },
    { device: 'sdc', mediaType: 'HDD', scheduler: 'bfq' },
    { device: 'sdd', mediaType: 'SSD', scheduler: 'mq-deadline' },
    { device: 'sde', mediaType: 'HDD', scheduler: 'bfq' },
    { device: 'sdf', mediaType: 'HDD', scheduler: 'bfq' },
    { device: 'sdg', mediaType: 'HDD', scheduler: 'bfq' },
    { device: 'sdh', mediaType: 'HDD', scheduler: 'bfq' },
    { device: 'sdi', mediaType: 'HDD', scheduler: 'bfq' },
  ]);

  const setDiskScheduler = (device: string, scheduler: DiskScheduler['scheduler']) => {
    setDiskSchedulers((prev) =>
      prev.map((d) => (d.device === device ? { ...d, scheduler } : d))
    );
  };

  // Telemetry loop for live subtle jitter
  useEffect(() => {
    const timer = setInterval(() => {
      // Jitter networks
      setNetworks((prev) =>
        prev.map((net) => {
          if (net.downloadKb === 0) return net;
          const newDown = Math.max(10, Math.min(180, net.downloadKb + Math.floor(Math.random() * 20 - 10)));
          const newUp = Math.max(1, Math.min(30, net.uploadKb + Math.floor(Math.random() * 4 - 2)));
          return {
            ...net,
            downloadKb: newDown,
            uploadKb: newUp,
            historyDown: [...net.historyDown.slice(1), newDown],
          };
        })
      );

      // Jitter active fans
      setFans((prev) =>
        prev.map((fan) => {
          if (fan.rpm === 0) return fan;
          const jitter = Math.floor(Math.random() * 20 - 10);
          return { ...fan, rpm: Math.max(100, fan.rpm + jitter) };
        })
      );
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <MachCtrlContext.Provider
      value={{
        isLaptop,
        activeTab,
        setActiveTab,
        theme,
        setTheme,
        lang,
        setLang,
        isCurveEditorOpen,
        setIsCurveEditorOpen,
        topProcesses,
        networks,
        sockets,
        dimms,
        disks,
        fans,
        updateFanMode,
        updateFanPwm,
        fanCurve,
        updateFanCurvePoint,
        powerMode,
        setPowerMode,
        battery,
        cleanupTasks,
        runCleanupTask,
        runAllCleanup,
        isCleaningAll,
        swappiness,
        setSwappiness,
        vfsCachePressure,
        setVfsCachePressure,
        hugePages,
        setHugePages,
        tcpCongestion,
        setTcpCongestion,
        dirtyBackgroundRatio,
        setDirtyBackgroundRatio,
        dirtyRatio,
        setDirtyRatio,
        services,
        toggleService,
        diskSchedulers,
        setDiskScheduler,
      }}
    >
      {children}
    </MachCtrlContext.Provider>
  );
};

export const useMachCtrl = () => {
  const ctx = useContext(MachCtrlContext);
  if (!ctx) throw new Error('useMachCtrl must be within MachCtrlProvider');
  return ctx;
};
