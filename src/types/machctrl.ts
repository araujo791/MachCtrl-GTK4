export type SystemViewMode = 'notebook' | 'xeon';

export interface ProcessItem {
  name: string;
  ramMb: number;
  ramPercent: number;
  color: string;
}

export interface NetworkInterface {
  name: string;
  downloadKb: number;
  uploadKb: number;
  historyDown: number[];
}

export interface CpuThreadData {
  id: number;
  usage: number;
  temp: number;
}

export interface CpuSocketData {
  id: number;
  model: string;
  cores: number;
  threads: number;
  freqGhz: number;
  usageAvg: number;
  tempAvg: number;
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
  mediaType: 'NVMe' | 'SSD' | 'HDD';
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
  type: 'GPU' | 'CPU';
  targetDevice: string;
  mode: 'Automático' | 'Manual' | 'Máximo' | 'Curva';
  rpm: number;
  maxRpm: number;
  pwmPercent: number;
  color: string;
  hasCurveSupport?: boolean;
}

export interface CleanupTask {
  id: string;
  title: string;
  description: string;
  isRoot: boolean;
  sizeMb: number;
  cleaned: boolean;
}

export interface DiskScheduler {
  device: string;
  mediaType: 'NVMe' | 'SSD' | 'HDD';
  scheduler: 'none' | 'bfq' | 'mq-deadline' | 'kyber';
}

export interface SystemService {
  name: string;
  enabled: boolean;
  tooltip: string;
}
