import { NextResponse } from 'next/server';
import { CloudQuotasClient } from '@google-cloud/cloudquotas';
import { SUPPORTED_REGIONS } from '@/app/config/regions';

// Helper to get a specific regional value from a global quota response
function getRegionalQuota(quotaInfoResponse: any, region: string): string {
  if (!quotaInfoResponse?.dimensionsInfos) return '0';
  for (const info of quotaInfoResponse.dimensionsInfos) {
    if (info.dimensions?.region === region) {
      return info.details?.value?.toString() ?? '0';
    }
  }
  return '0';
}

// Helper to normalize quota values (e.g., for RTX 6000 milli-units)
function normalizeQuotaValue(gpuAccelerator: string, value: string): string {
  if (gpuAccelerator === 'nvidia-rtx-pro-6000') {
    return (parseInt(value, 10) / 1000).toString();
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const { projectId, region, gpuAccelerator } = await request.json();

    if (!projectId || !region) {
      return NextResponse.json({ error: 'Missing project ID or region' }, { status: 400 });
    }

    const client = new CloudQuotasClient();
    const regionConfig = SUPPORTED_REGIONS.find(r => r.name === region.toLowerCase());
    if (!regionConfig) {
      return NextResponse.json({ error: `Region not supported: ${region}` }, { status: 400 });
    }

    // If a specific GPU is requested (for the Deploy screen), handle it individually.
    if (gpuAccelerator) {
      const quotaIds = getQuotaIdsForGpu(gpuAccelerator);
      if (!quotaIds) {
        return NextResponse.json({ error: `Unsupported GPU type: ${gpuAccelerator}` }, { status: 400 });
      }
      const result = await fetchQuotaForGpu(client, projectId, region, gpuAccelerator, quotaIds);
      return NextResponse.json(result);
    }

    // If no specific GPU is requested, fetch quotas for all GPUs in the region.
    const gpuConfigs = regionConfig.gpus;
    const quotaPromises = gpuConfigs.map(gpu => {
      const quotaIds = getQuotaIdsForGpu(gpu.accelerator);
      if (!quotaIds) return Promise.resolve({ gpu: gpu.accelerator, error: 'Unsupported GPU type' });
      return fetchQuotaForGpu(client, projectId, region, gpu.accelerator, quotaIds);
    });

    const results = await Promise.allSettled(quotaPromises);

    const quotas = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          gpu: gpuConfigs[index].accelerator,
          ...result.value,
        };
      } else {
        // Handle promise rejection, e.g., API disabled error
        const reason = result.reason as any;
        if (reason?.error === 'API_DISABLED') {
          return { gpu: gpuConfigs[index].accelerator, ...reason };
        }
        return {
          gpu: gpuConfigs[index].accelerator,
          error: reason.message || 'Unknown error',
        };
      }
    });

    // Check if the very first error was an API_DISABLED error to return it at the top level
    const apiDisabledError = quotas.find(q => q.error === 'API_DISABLED');
    if (apiDisabledError) {
      return NextResponse.json({ error: 'API_DISABLED', activationUrl: apiDisabledError.activationUrl });
    }

    return NextResponse.json({ quotas });

  } catch (error) {
    console.error('Error in quota API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function getQuotaIdsForGpu(gpuAccelerator: string) {
  const nonZonalQuotaMap: { [key: string]: string } = {
    'nvidia-l4': 'NvidiaL4GpuAllocNoZonalRedundancyPerProjectRegion',
    'nvidia-h100-80gb': 'NvidiaH100GpuAllocNoZonalRedundancyPerProjectRegion',
    'nvidia-rtx-pro-6000': 'NvidiaRtxPro6000GpuAllocNoZonalRedundancyPerProjectRegion',
  };
  const zonalQuotaMap: { [key: string]: string } = {
    'nvidia-l4': 'NvidiaL4GpuAllocPerProjectRegion',
    'nvidia-h100-80gb': 'NvidiaH100GpuAllocPerProjectRegion',
    'nvidia-rtx-pro-6000': 'NvidiaRtxPro6000GpuAllocPerProjectRegion',
  };
  const nonZonalQuotaId = nonZonalQuotaMap[gpuAccelerator];
  const zonalQuotaId = zonalQuotaMap[gpuAccelerator];
  if (!nonZonalQuotaId || !zonalQuotaId) return null;
  return { nonZonalQuotaId, zonalQuotaId };
}

async function fetchQuotaForGpu(client: CloudQuotasClient, projectId: string, region: string, gpuAccelerator: string, quotaIds: { nonZonalQuotaId: string, zonalQuotaId: string }) {
  const nonZonalName = `projects/${projectId}/locations/global/services/run.googleapis.com/quotaInfos/${quotaIds.nonZonalQuotaId}`;
  const zonalName = `projects/${projectId}/locations/global/services/run.googleapis.com/quotaInfos/${quotaIds.zonalQuotaId}`;

  try {
    const [nonZonalResult, zonalResult] = await Promise.allSettled([
      client.getQuotaInfo({ name: nonZonalName }),
      client.getQuotaInfo({ name: zonalName }),
    ]);

    for (const result of [nonZonalResult, zonalResult]) {
      if (result.status === 'rejected') {
        const reason = result.reason as any;
        if (reason?.errorInfoMetadata?.reason === 'SERVICE_DISABLED' || reason?.reason === 'SERVICE_DISABLED') {
          throw {
            error: 'API_DISABLED',
            activationUrl: reason?.errorInfoMetadata?.activationUrl || `https://console.developers.google.com/apis/api/cloudquotas.googleapis.com/overview?project=${projectId}`,
          };
        }
      }
    }

    let nonZonalLimit = nonZonalResult.status === 'fulfilled' ? getRegionalQuota(nonZonalResult.value[0], region) : '0';
    let zonalLimit = zonalResult.status === 'fulfilled' ? getRegionalQuota(zonalResult.value[0], region) : '0';

    nonZonalLimit = normalizeQuotaValue(gpuAccelerator, nonZonalLimit);
    zonalLimit = normalizeQuotaValue(gpuAccelerator, zonalLimit);

    return { nonZonalLimit, zonalLimit };

  } catch (apiError: any) {
    if (apiError.error === 'API_DISABLED') throw apiError; // Re-throw to be caught by the main handler
    if (apiError.code === 7) return { error: 'Permission Denied' };
    if (apiError.code === 5) return { nonZonalLimit: '0', zonalLimit: '0' }; // NOT_FOUND is not an error
    console.error(`Failed to get quota for ${gpuAccelerator} in ${region}:`, apiError);
    return { error: 'API Error' };
  }
}
