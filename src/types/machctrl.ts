// ---------- Tipos dos DTOs do backend Rust (src-tauri/src/main.rs) ----------

export interface BatteryInfo {
  percent: number;
  status: 'charging' | 'discharging' | 'full' | 'not_charging' | 'unknown';
  ac_online: boolean;
  power_w: number | null;
  hours_left: number | null;
  health_pct: number | null;
  full_wh: number | null;
  design_wh: number | null;
  cycles: number | null;
  voltage_v: number | null;
  temp_c: number | null;
  technology: string | null;
  model: string | null;
  manufacturer: string | null;
}

export interface CoreDto { id: number; pct: number; temp_c: number | null }
export interface SocketDto {
  socket_id: number;
  model: string;
  phys_cores: number;
  threads: number;
  freq_ghz: number;
  usage_pct: number;
  package_temp_c: number | null;
  cores: CoreDto[];
}
export interface GpuDto {
  name: string;
  vendor: string;
  usage_pct: number | null;
  temp_c: number | null;
  vram_used_mb: number | null;
  vram_total_mb: number | null;
  fan_pct: number | null;
  fan_rpm: number | null;
  freq_mhz: number | null;
  freq_max_mhz: number | null;
}
export interface DiskDto {
  device: string;
  mountpoint: string;
  fstype: string;
  disk_type: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  usage_pct: number;
  read_mbs: number;
  write_mbs: number;
}
export interface NetDto { name: string; down_kb: number; up_kb: number }
export interface ProcDto { pid: number; name: string; rss_mb: number }

export interface Snapshot {
  cpu_usage: number;
  cpu_temp_c: number | null;
  cpu_freq_mhz: number;
  mem_used_gb: number;
  mem_total_gb: number;
  mem_pct: number;
  gpus: GpuDto[];
  battery: BatteryInfo | null;
  disks: DiskDto[];
  net: NetDto[];
  top_procs: ProcDto[];
  sockets: SocketDto[];
}

export interface SystemInfo {
  hostname: string;
  product_name: string;
  distro: string;
  uptime: string;
  cpu_model: string;
  kernel: string;
  motherboard: string;
  bios: string;
  install_date: string;
  storage_total_gb: number;
  mem_total_gb: number;
  gpu_name: string;
}

export interface MemSlotDto {
  locator: string;
  size_gb: number;
  mem_type: string;
  speed_mhz: number;
  manufacturer: string;
  part_number: string;
  voltage: number;
}
export interface MemoryDto { total_slots: number; occupied_slots: number; slots: MemSlotDto[] }

export interface FanDto {
  id: string;
  label: string;
  rpm: number;
  pct: number;
  chip: string;
  controllable: boolean;
  pwm_path: string;
  pwm_enable_path: string | null;
}
export interface FanModeDto {
  fan_id: string;
  mode: FanMode;
  manual_pct: number;
  curve: { temp: number; pct: number }[];
}
export interface ProfilesDto { current: string; available: string[]; governor: string }
export interface CleanTaskDto { id: string; label: string; description: string; needs_root: boolean }
export interface CleanResultDto { ok: boolean; result: string; cleaned: string | null; bytes: number }

export interface TuneDiskScheduler { device: string; current: string; available: string[]; disk_type: string }
export interface TuneService { name: string; active: boolean; enabled: boolean; exists: boolean }
export interface TuneState {
  swappiness: number | null;
  cache_pressure: number | null;
  dirty_ratio: number | null;
  dirty_bg_ratio: number | null;
  thp: string | null;
  io_schedulers: TuneDiskScheduler[];
  services: TuneService[];
  network: { current_cc: string | null; available_cc: string[]; bbr_available: boolean };
  has_cpupower: boolean;
  has_ananicy: boolean;
  has_zram: boolean;
}

// ---------- Tipos de apresentação (derivados do snapshot) ----------

export type FanMode = 'auto' | 'manual' | 'max' | 'curve';
export type MediaType = 'NVMe' | 'SSD' | 'HDD' | 'USB';

export interface ProcessItem { pid: number; name: string; ramMb: number; ramPercent: number; color: string }
export interface NetworkInterface { name: string; downloadKb: number; uploadKb: number; historyDown: number[] }
export interface CpuThreadData { id: number; usage: number; temp: number | null }
export interface CpuSocketData {
  id: number;
  model: string;
  cores: number;
  threads: number;
  freqGhz: number;
  usageAvg: number;
  tempAvg: number | null;
  threadList: CpuThreadData[];
}
export interface DimmModule {
  slot: string;
  sizeGb: number;
  type: string;
  manufacturer: string;
  model: string;
  speedMts: number;
  voltageVolts: number;
  isEmpty: boolean;
}
export interface DiskPartition {
  id: string;
  name: string;
  mountPoint: string;
  device: string;
  fsType: string;
  mediaType: MediaType;
  usedGb: number;
  totalGb: number;
  usagePercent: number;
  readMb: number;
  writeMb: number;
  readHistory: number[];
  writeHistory: number[];
}
export interface FanDevice {
  id: string;
  name: string;
  type: 'GPU' | 'CPU' | 'Sistema';
  chip: string;
  controllable: boolean;
  pwmPath: string;
  pwmEnablePath: string | null;
  mode: FanMode;
  rpm: number;
  pwmPercent: number;
}
export interface CleanupTask {
  id: string;
  title: string;
  description: string;
  isRoot: boolean;
  status: 'idle' | 'running' | 'done' | 'failed';
  resultText: string;
  bytes: number;
}
export interface FanCurvePoint { temp: number; pct: number }
