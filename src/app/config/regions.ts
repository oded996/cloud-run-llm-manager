// src/app/config/regions.ts

export interface GpuConfig {
  name: string;
  vram_gb: number;
  accelerator: string;
  status: 'GA' | 'Public Preview' | 'Private Preview';
  validCpus: string[];
  validMemory: string[];
  memory_bandwidth_gb_s: number;
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
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'], memory_bandwidth_gb_s: 300 },
      { name: 'NVIDIA RTX 6000 Pro', vram_gb: 96, accelerator: 'nvidia-rtx-pro-6000', status: 'Private Preview', validCpus: ['20', '22', '24', '30'], validMemory: ['80Gi', '88Gi', '96Gi', '120Gi'], memory_bandwidth_gb_s: 960 },
    ],
  },

  {
    name: 'us-east4',
    description: 'Northern Virginia',
    gpus: [
        { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'], memory_bandwidth_gb_s: 300 },
        { name: 'NVIDIA H100', vram_gb: 80, accelerator: 'nvidia-h100-80gb', status: 'Private Preview', validCpus: ['20', '22', '24', '26'], validMemory: ['80Gi', '160Gi', '240Gi', '360Gi'], memory_bandwidth_gb_s: 2000 },
    ],
  },
  {
    name: 'europe-west1',
    description: 'Belgium',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'], memory_bandwidth_gb_s: 300 },
    ],
  },
  {
    name: 'europe-west4',
    description: 'Netherlands',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'], memory_bandwidth_gb_s: 300 },
      { name: 'NVIDIA RTX 6000 Pro', vram_gb: 96, accelerator: 'nvidia-rtx-pro-6000', status: 'Private Preview', validCpus: ['20', '22', '24', '30'], validMemory: ['80Gi', '88Gi', '96Gi', '120Gi'], memory_bandwidth_gb_s: 960 },
    ],
  },
  {
    name: 'asia-southeast1',
    description: 'Singapore',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'], memory_bandwidth_gb_s: 300 },
      { name: 'NVIDIA RTX 6000 Pro', vram_gb: 96, accelerator: 'nvidia-rtx-pro-6000', status: 'Private Preview', validCpus: ['20', '22', '24', '30'], validMemory: ['80Gi', '88Gi', '96Gi', '120Gi'], memory_bandwidth_gb_s: 960 },
    ],
  },
  {
    name: 'asia-south1',
    description: 'Delhi',
    gpus: [
      { name: 'NVIDIA L4', vram_gb: 24, accelerator: 'nvidia-l4', status: 'GA', validCpus: ['8', '12', '16'], validMemory: ['16Gi', '24Gi', '32Gi'], memory_bandwidth_gb_s: 300 },
    ],
  },
  {
    name: 'asia-south2',
    description: 'Delhi',
    gpus: [
      { name: 'NVIDIA RTX 6000 Pro', vram_gb: 96, accelerator: 'nvidia-rtx-pro-6000', status: 'Private Preview', validCpus: ['20', '22', '24', '30'], validMemory: ['80Gi', '88Gi', '96Gi', '120Gi'], memory_bandwidth_gb_s: 960 },
    ],
  },
];

export const ALL_REGION_NAMES = SUPPORTED_REGIONS.map(r => r.name);
