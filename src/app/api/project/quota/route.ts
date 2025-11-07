// src/app/api/project/quota/route.ts
import { NextResponse } from 'next/server';
import { CloudQuotasClient } from '@google-cloud/cloudquotas';

// Helper function to find the quota value for a specific region from a global quota response
function getRegionalQuota(quotaInfoResponse: any, region: string): string {
  if (!quotaInfoResponse?.dimensionsInfos) {
    return '0';
  }
  for (const info of quotaInfoResponse.dimensionsInfos) {
    if (info.dimensions?.region === region) {
      return info.details?.value?.toString() ?? '0';
    }
  }
  return '0'; // Return 0 if no specific quota is found for the region
}

export async function POST(request: Request) {
  try {
    const { projectId, region, gpuAccelerator } = await request.json();

    if (!projectId || !region || !gpuAccelerator) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const client = new CloudQuotasClient();

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

    if (!nonZonalQuotaId || !zonalQuotaId) {
      return NextResponse.json({ error: `Unsupported GPU type for quota check: ${gpuAccelerator}` }, { status: 400 });
    }

    const nonZonalName = `projects/${projectId}/locations/global/services/run.googleapis.com/quotaInfos/${nonZonalQuotaId}`;
    const zonalName = `projects/${projectId}/locations/global/services/run.googleapis.com/quotaInfos/${zonalQuotaId}`;

    try {
      const [nonZonalResult, zonalResult] = await Promise.allSettled([
        client.getQuotaInfo({ name: nonZonalName }),
        client.getQuotaInfo({ name: zonalName }),
      ]);

      const nonZonalLimit = nonZonalResult.status === 'fulfilled' ? getRegionalQuota(nonZonalResult.value[0], region) : '0';
      const zonalLimit = zonalResult.status === 'fulfilled' ? getRegionalQuota(zonalResult.value[0], region) : '0';

      return NextResponse.json({ nonZonalLimit, zonalLimit });

    } catch (apiError: any) {
      // Check for SERVICE_DISABLED error, which is a common reason for permission issues
      if (apiError.details && Array.isArray(apiError.details)) {
        const serviceDisabledDetail = apiError.details.find((detail: any) => detail.reason === 'SERVICE_DISABLED');
        if (serviceDisabledDetail && serviceDisabledDetail.metadata?.activationUrl) {
          return NextResponse.json({
            error: 'API_DISABLED',
            activationUrl: serviceDisabledDetail.metadata.activationUrl,
          });
        }
      }

      if (apiError.code === 7) { // PERMISSION_DENIED
        console.error(`Permission denied for quota check on project ${projectId}:`, JSON.stringify(apiError, null, 2));
        return NextResponse.json({ error: 'Permission Denied' });
      }

      // Handle cases where the quota isn't configured (NOT_FOUND) gracefully
      if (apiError.code === 5) { // NOT_FOUND
        return NextResponse.json({ nonZonalLimit: '0', zonalLimit: '0' });
      }

      console.error(`Failed to get quota for project ${projectId}:`, apiError);
      return NextResponse.json({ error: 'Error' });
    }
  } catch (error) {
    console.error('Error in quota API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
