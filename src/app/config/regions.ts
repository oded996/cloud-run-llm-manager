// src/app/config/regions.ts

export interface GpuConfig {
  name: string;
  vram_gb: number;
  accelerator: string;
  status: 'GA' | 'Public Preview' | 'Private Preview';
  validCpus: string[];
  validMemory: string[];
}

export interface RegionConfig {
  name: string;
  description: string;
  gpus: GpuConfig[];
}

export const SUPPORTED_REGIONS: RegionConfig[] = [
  {
    name: 'us-central1',
    description: 'Iowa',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'] },
      { name: 'NVIDIA RTX 6000 Pro', vram_gb: 96, accelerator: 'nvidia-rtx-pro-6000', status: 'Private Preview', validCpus: ['20', '22', '24', '30'], validMemory: ['80Gi', '88Gi', '96Gi', '120Gi'] },
    ],
  },
  {
    name: 'us-east1',
    description: 'South Carolina',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'] },
    ],
  },
  {
    name: 'us-east4',
    description: 'Northern Virginia',
    gpus: [
        { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'] },
        { name: 'NVIDIA H100', vram_gb: 80, accelerator: 'nvidia-h100-80gb', status: 'Private Preview', validCpus: ['20', '22', '24', '26'], validMemory: ['80Gi', '160Gi', '240Gi', '360Gi'] },
    ],
  },
  {
    name: 'us-west1',
    description: 'Oregon',
    gpus: [], // No GPUs as per new availability
  },
  {
    name: 'europe-west1',
    description: 'Belgium',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'] },
    ],
  },
  {
    name: 'europe-west4',
    description: 'Netherlands',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'] },
    ],
  },
  {
    name: 'asia-southeast1',
    description: 'Singapore',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'] },
    ],
  },
  {
    name: 'asia-northeast1',
    description: 'Tokyo',
    gpus: [], // No GPUs as per new availability
  },
];

export const ALL_REGION_NAMES = SUPPORTED_REGIONS.map(r => r.name);