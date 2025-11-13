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

      // Check for rejected promises specifically for API_DISABLED error
      for (const result of [nonZonalResult, zonalResult]) {
        if (result.status === 'rejected') {
          const reason = result.reason as any;
          if (reason?.errorInfoMetadata?.reason === 'SERVICE_DISABLED' || reason?.reason === 'SERVICE_DISABLED') {
            return NextResponse.json({
              error: 'API_DISABLED',
              // The activation URL might be in different places depending on the error structure
              activationUrl: reason?.errorInfoMetadata?.activationUrl || `https://console.developers.google.com/apis/api/cloudquotas.googleapis.com/overview?project=${projectId}`,
            });
          }
        }
      }

      let nonZonalLimit = nonZonalResult.status === 'fulfilled' ? getRegionalQuota(nonZonalResult.value[0], region) : '0';
      let zonalLimit = zonalResult.status === 'fulfilled' ? getRegionalQuota(zonalResult.value[0], region) : '0';

      // For RTX 6000 GPUs, quota is measured in milli-gpus (1000 units = 1 GPU).
      // We divide by 1000 to normalize it to the number of GPUs.
      if (gpuAccelerator === 'nvidia-rtx-pro-6000') {
        nonZonalLimit = (parseInt(nonZonalLimit, 10) / 1000).toString();
        zonalLimit = (parseInt(zonalLimit, 10) / 1000).toString();
      }

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
