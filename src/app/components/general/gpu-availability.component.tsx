// src/app/components/general/gpu-availability.component.tsx
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { SUPPORTED_REGIONS, GpuConfig } from '@/app/config/regions';
import { Project } from './general.component';

interface GpuDetails {
  config: Omit<GpuConfig, 'status'>;
  regions: {
    name: string;
    description: string;
    status: GpuConfig['status'];
  }[];
}

interface GpuAvailabilityProps {
  selectedProject: Project | null;
}

interface Quota {
  nonZonalLimit?: string;
  zonalLimit?: string;
  error?: string;
  activationUrl?: string;
}

const GpuAvailability = ({ selectedProject }: GpuAvailabilityProps) => {
  const [quotaData, setQuotaData] = useState<{ [key: string]: Quota }>({});
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [hasApiError, setHasApiError] = useState<Quota | null>(null);


  useEffect(() => {
    const fetchQuota = async () => {
      if (!selectedProject) return;

      setIsLoadingQuota(true);
      setHasApiError(null);
      const newQuotaData: { [key: string]: Quota } = {};

      const allGpuRequests = SUPPORTED_REGIONS.flatMap(region =>
        region.gpus.map(gpu => ({
          key: `${region.name}-${gpu.accelerator}`,
          region: region.name,
          gpuAccelerator: gpu.accelerator,
        }))
      );

      for (const req of allGpuRequests) {
        // If we already have a global error (like API_DISABLED), don't send more requests.
        if (hasApiError) continue;

        try {
          const response = await fetch('/api/project/quota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: selectedProject.projectId,
              region: req.region,
              gpuAccelerator: req.gpuAccelerator,
            }),
          });

          const data: Quota = await response.json();

          if (data.error) {
            // If there's a global error (API disabled or permission denied), stop fetching.
            if (data.error === 'API_DISABLED' || data.error === 'Permission Denied') {
              setHasApiError(data);
              break; // Exit the loop
            }
          }
          newQuotaData[req.key] = data;

        } catch (error) {
          console.error('Error fetching quota:', error);
          newQuotaData[req.key] = { error: 'Error' };
        }
      }

      setQuotaData(newQuotaData);
      setIsLoadingQuota(false);
    };

    fetchQuota();
  }, [selectedProject]);

  const gpusWithRegions = useMemo(() => {
    const gpuMap: { [key: string]: GpuDetails } = {};
    SUPPORTED_REGIONS.forEach(region => {
      region.gpus.forEach(gpu => {
        if (!gpuMap[gpu.name]) {
          const { status, ...config } = gpu;
          gpuMap[gpu.name] = { config, regions: [] };
        }
        gpuMap[gpu.name].regions.push({
          name: region.name,
          description: region.description,
          status: gpu.status,
        });
      });
    });
    return Object.values(gpuMap);
  }, []);

  const getStatusChip = (status: GpuConfig['status']) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status) {
      case 'GA': return <span className={`${baseClasses} bg-green-100 text-green-800`}>GA</span>;
      case 'Public Preview': return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Public Preview</span>;
      case 'Private Preview': return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Private Preview</span>;
      default: return null;
    }
  };

  const renderQuotaCell = (regionName: string, gpu: GpuConfig) => {
    const key = `${regionName}-${gpu.accelerator}`;
    const data = quotaData[key];

    if (isLoadingQuota) return <span className="text-xs text-gray-500">...</span>;
    if (!selectedProject || hasApiError) return <span className="text-xs text-gray-400">-</span>;
    if (!data) return null;

    return (
      <div className="text-sm text-gray-800">
        <span>{data.nonZonalLimit ?? '0'}</span>
      </div>
    );
  };

  const renderZonalQuotaCell = (regionName: string, gpu: GpuConfig) => {
    const key = `${regionName}-${gpu.accelerator}`;
    const data = quotaData[key];

    if (isLoadingQuota) return <span className="text-xs text-gray-500">...</span>;
    if (!selectedProject || hasApiError) return <span className="text-xs text-gray-400">-</span>;
    if (!data) return null;

    return (
      <div className="text-sm text-gray-800">
        <span>{data.zonalLimit ?? '0'}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-medium text-gray-800">GPU Availability & Quota</h2>
      </div>
      <div className="p-4 space-y-6">
        <p className="text-sm text-gray-600">
          The following GPUs are available for deployment with Cloud Run. Quotas represent the total available limit per region.
        </p>

        {hasApiError && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
            {hasApiError.error === 'API_DISABLED' && hasApiError.activationUrl ? (
              <>
                <span className="text-yellow-800">The Cloud Quotas API is not enabled for this project.</span>
                <a href={hasApiError.activationUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline font-medium">Enable API</a>
              </>
            ) : (
              <span className="text-yellow-800">Could not retrieve quota information. Please ensure you have the "Service Usage Viewer" (`roles/serviceusage.serviceUsageViewer`) role.</span>
            )}
          </div>
        )}

        {gpusWithRegions.map(({ config, regions }) => (
          <div key={config.name} className="border border-gray-200 rounded-lg">
            <div className="bg-gray-50 p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">{config.name}</h3>
              <div className="flex space-x-4 text-xs text-gray-600 mt-1">
                <span><strong>VRAM:</strong> {config.vram_gb} GB</span>
                <span><strong>Memory Bandwidth:</strong> {(config.memory_bandwidth_gb_s / 1000).toFixed(2)} TB/s</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed">
                <thead className="bg-white">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Region</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Status</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Quota (without zonal redundancy)</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Quota (with zonal redundancy)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {regions.map(region => {
                    const gpuConfig = SUPPORTED_REGIONS.find(r => r.name === region.name)?.gpus.find(g => g.name === config.name);
                    return (
                      <tr key={region.name}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-800">{region.name}</div>
                          <div className="text-xs text-gray-500">{region.description}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{getStatusChip(region.status)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{gpuConfig && renderQuotaCell(region.name, gpuConfig)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{gpuConfig && renderZonalQuotaCell(region.name, gpuConfig)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <p className="text-blue-800">
            If you need more GPU quota, you can request an increase by visiting:
            <a href="https://g.co/cloudrun/gpu-quota" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline font-medium">
              g.co/cloudrun/gpu-quota
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GpuAvailability;
