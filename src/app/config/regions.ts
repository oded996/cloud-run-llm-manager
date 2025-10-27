// src/app/config/regions.ts

export interface GpuConfig {
  name: string;
  vram_gb: number;
  accelerator: string;
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
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4' },
      { name: 'NVIDIA H100', vram_gb: 80, accelerator: 'nvidia-h100-80gb' },
    ],
  },
  {
    name: 'us-east1',
    description: 'South Carolina',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4' },
    ],
  },
  {
    name: 'us-east4',
    description: 'Northern Virginia',
    gpus: [
        { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4' },
    ],
  },
  {
    name: 'us-west1',
    description: 'Oregon',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4' },
    ],
  },
  {
    name: 'europe-west1',
    description: 'Belgium',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4' },
    ],
  },
  {
    name: 'europe-west4',
    description: 'Netherlands',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4' },
      { name: 'NVIDIA H100', vram_gb: 80, accelerator: 'nvidia-h100-80gb' },
    ],
  },
  {
    name: 'asia-southeast1',
    description: 'Singapore',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4' },
    ],
  },
  {
    name: 'asia-northeast1',
    description: 'Tokyo',
    gpus: [
        { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4' },
    ],
  },
];

export const ALL_REGION_NAMES = SUPPORTED_REGIONS.map(r => r.name);
