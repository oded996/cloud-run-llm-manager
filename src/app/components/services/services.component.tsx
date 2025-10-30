'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Project, Tooltip } from '../general/general.component';
import { PermissionsCard } from './permissions.component';
import { ChatCard } from './chat.component';
import { DeployServiceView } from '../models/models.component';

// --- Interfaces ---
interface Service {
  name: string;
  uid: string;
  uri: string;
  reconciling: boolean;
  updateTime: string;
  lastModifier: string;
  latestCreatedRevision: string;
  latestReadyRevision: string;
  template: {
    annotations?: { [key: string]: string };
    scaling?: { minInstanceCount?: number; maxInstanceCount?: number };
    vpcAccess?: { networkInterfaces?: { subnetwork: string }[], egress?: string };
    timeout?: string | { seconds: number };
    nodeSelector?: {
      accelerator?: string;
    };
    containers: {
      image: string;
      args?: string[];
      env?: { name: string; value: string }[];
      ports?: {
        containerPort?: number;
      }[];
      resources?: {
        limits?: {
          cpu?: string;
          memory?: string;
        };
      };
      volumeMounts?: { name: string; mountPath: string }[];
    }[];
    volumes?: { name: string; gcs: { bucket: string } }[];
  };
  terminalCondition: {
    type: string;
    state: string;
    message?: string;
  };
  conditions: {
    type: string;
    state: string;
    message?: string;
  }[];
}

const RefreshIcon = ({ isRefreshing }: { isRefreshing: boolean }) => (
    <svg
        fill="currentColor"
        width="20px"
        height="20px"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className={isRefreshing ? 'animate-spin' : ''}
    >
        <path d="M10 11H7.101l.001-.009a4.956 4.956 0 0 1 .752-1.787 5.054 5.054 0 0 1 2.2-1.811c.302-.128.617-.226.938-.291a5.078 5.078 0 0 1 2.018 0 4.978 4.978 0 0 1 2.525 1.361l1.416-1.412a7.036 7.036 0 0 0-2.224-1.501 6.921 6.921 0 0 0-1.315-.408 7.079 7.079 0 0 0-2.819 0 6.94 6.94 0 0 0-1.316.409 7.04 7.04 0 0 0-3.08 2.534 6.978 6.978 0 0 0-1.054 2.505c-.028.135-.043.273-.063.41H2l4 4 4-4zm4 2h2.899l-.001.008a4.976 4.976 0 0 1-2.103 3.138 4.943 4.943 0 0 1-1.787.752 5.073 5.073 0 0 1-2.017 0 4.956 4.956 0 0 1-1.787-.752 5.072 5.072 0 0 1-.74-.61L7.05 16.95a7.032 7.032 0 0 0 2.225 1.5c.424.18.867.317 1.315.408a7.07 7.07 0 0 0 2.818 0 7.031 7.031 0 0 0 4.395-2.945 6.974 6.974 0 0 0 1.053-2.503c.027-.135.043-.273.063-.41H22l-4-4-4 4z"/>
    </svg>
);

const Services = ({ selectedProject }: { selectedProject: Project | null }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceNameFromUrl = searchParams.get('service');
  const regionFromUrl = searchParams.get('region');

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const cacheKey = selectedProject ? `llm_manager_services_cache_${selectedProject.projectId}` : null;

  useEffect(() => {
    setEditingService(null);
  }, [selectedProject]);

  const fetchServices = useCallback(async () => {
    if (!selectedProject || !cacheKey) {
        setIsLoading(false);
        return;
    }
    setIsRefreshing(true);
    setError(null);
    try {
        const response = await fetch(`/api/services/list?projectId=${selectedProject.projectId}`);
        if (!response.ok) throw new Error('Failed to fetch services.');
        const data = await response.json();
        if (JSON.stringify(data) !== localStorage.getItem(cacheKey)) {
            setServices(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
        setIsRefreshing(false);
    }
  }, [selectedProject, cacheKey]);

  useEffect(() => {
    if (!selectedProject) {
      setIsLoading(true);
      return;
    }
    const cacheKey = `llm_manager_services_cache_${selectedProject.projectId}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        setServices(JSON.parse(cachedData));
        setIsLoading(false);
    } else {
        setIsLoading(true);
    }
    fetchServices();
  }, [selectedProject, fetchServices]);

  if (!selectedProject) {
    return <div className="p-6">Loading project...</div>;
  }

  if (editingService) {
    return (
        <DeployServiceView
            project={selectedProject!}
            model={{ id: '', source: 'huggingface', status: 'completed', downloadedAt: '', size: 0 }} // Dummy model
            bucket={{ name: '', location: '', models: [] }} // Dummy bucket
            onClose={() => setEditingService(null)}
            existingService={editingService}
        />
    );
  }

  if (serviceNameFromUrl && regionFromUrl && selectedProject) {
    const serviceFullName = `projects/${selectedProject.projectId}/locations/${regionFromUrl}/services/${serviceNameFromUrl}`;
    return <ServiceDetailView project={selectedProject} serviceFullName={serviceFullName} onBack={() => router.push('/?view=services')} onEdit={setEditingService} />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
        <div className="flex items-center space-x-2">
            <h1 className="text-xl font-medium text-gray-800">Services</h1>
            <Tooltip text="Refresh services list">
                <button onClick={() => fetchServices()} disabled={isRefreshing || !selectedProject} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 disabled:text-gray-300">
                    <RefreshIcon isRefreshing={isRefreshing} />
                </button>
            </Tooltip>
        </div>
      </div>

      {isLoading && <p>Loading services...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {!isLoading && !error && services.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No Managed Services Found</h3>
          <p className="mt-1 text-sm text-gray-500">Deploy a model from the "Models" tab to see it here.</p>
        </div>
      )}

      {!isLoading && !error && services.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3 font-medium text-gray-600">Service Name</th>
                <th className="p-3 font-medium text-gray-600">Status</th>
                <th className="p-3 font-medium text-gray-600">Region</th>
                <th className="p-3 font-medium text-gray-600">Last Deployed</th>
                <th className="p-3 font-medium text-gray-600">Deployed By</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const region = service.name.split('/')[3];
                const serviceName = service.name.split('/')[5];
                const getStatus = (svc: Service) => {
                  if (svc.reconciling || svc.latestCreatedRevision !== svc.latestReadyRevision) return 'Deploying';
                  if (svc.terminalCondition?.type === 'Ready' && svc.terminalCondition?.state === 'CONDITION_SUCCEEDED') return 'Running';
                  return 'Error';
                }
                const status = getStatus(service);
                return (
                  <tr key={service.uid} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                    <td className="p-3">
                      <button onClick={() => router.push(`/?view=services&service=${serviceName}&region=${region}`)} className="text-blue-600 font-medium hover:underline">{serviceName}</button>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        status === 'Running' ? 'bg-green-100 text-green-800' : 
                        status === 'Deploying' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>{status}</span>
                    </td>
                    <td className="p-3 text-gray-800">{region}</td>
                    <td className="p-3 text-gray-800">{new Date(service.updateTime).toLocaleString()}</td>
                    <td className="p-3 text-gray-800 font-mono text-xs">{service.lastModifier}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ServiceDetailView = ({ project, serviceFullName, onBack, onEdit }: { project: Project, serviceFullName: string, onBack: () => void, onEdit: (service: Service) => void }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get('tab') as Tab | null;

    type Tab = 'details' | 'logs' | 'permissions' | 'chat';
    const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl || 'details');

    const [service, setService] = useState<Service | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [logs, setLogs] = useState<any[]>([]);
    const [logError, setLogError] = useState<string | null>(null);
    const [isLogsRefreshing, setIsLogsRefreshing] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const lastLogTimestamp = useRef<string | null>(null);

    const region = serviceFullName.split('/')[3];
    const serviceName = serviceFullName.split('/')[5];

    const getStatus = (service: Service | null) => {
        if (!service) return 'Loading';
        if (service.reconciling || service.latestCreatedRevision !== service.latestReadyRevision) return 'Deploying';
        const readyCondition = service.terminalCondition;
        if (readyCondition?.type === 'Ready' && readyCondition?.state === 'CONDITION_SUCCEEDED') return 'Running';
        return 'Error';
    };
    const status = getStatus(service);

    const fetchServiceDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/services/detail?projectId=${project.projectId}&region=${region}&serviceName=${serviceName}`);
            if (!response.ok) throw new Error('Failed to fetch service details.');
            const data = await response.json();
            console.log('Raw Service Config:', JSON.stringify(data, null, 2));
            setService(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [project.projectId, region, serviceName]);

    useEffect(() => {
        fetchServiceDetails();
        if (status === 'Deploying') {
            const interval = setInterval(fetchServiceDetails, 5000);
            return () => clearInterval(interval);
        }
    }, [status, fetchServiceDetails]);

    const pollIntervalRef = useRef<number>(1500);
    const pollTimeoutId = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (activeTab === 'logs' && logContainerRef.current) {
            setTimeout(() => {
                if (logContainerRef.current) {
                    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
                }
            }, 0);
        }
    }, [activeTab]);

    const fetchLogs = useCallback(async () => {
        if (pollTimeoutId.current) clearTimeout(pollTimeoutId.current);
        setIsLogsRefreshing(true);
        try {
            let url = `/api/services/logs?projectId=${project.projectId}&region=${region}&serviceName=${serviceName}`;
            if (lastLogTimestamp.current) url += `&since=${lastLogTimestamp.current}`;
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch logs.');
            }
            pollIntervalRef.current = 1500; // Poll every 1.5 seconds when the tab is active
            setLogError(null);
            const newLogs = await response.json();
            if (newLogs.length > 0) {
                const logContainer = logContainerRef.current;
                const shouldScroll = logContainer ? (logContainer.scrollTop + logContainer.clientHeight) >= logContainer.scrollHeight - 20 : false;
                const lastLog = newLogs[newLogs.length - 1];
                if (lastLog?.timestamp?.seconds) {
                    lastLogTimestamp.current = new Date(lastLog.timestamp.seconds * 1000 + (lastLog.timestamp.nanos || 0) / 1e6).toJSON();
                }
                setLogs(prev => [...prev, ...newLogs].slice(-3000));
                if (shouldScroll && logContainer) {
                    setTimeout(() => { logContainer.scrollTop = logContainer.scrollHeight; }, 100);
                }
            }
        } catch (err: any) {
            let userMessage = `Could not fetch new logs: ${err.message}.`;
            if (err.message?.includes('RESOURCE_EXHAUSTED')) userMessage = 'Log quota limit reached. Polling less frequently.';
            setLogError(`${userMessage} Retrying...`);
            pollIntervalRef.current = Math.min(pollIntervalRef.current * 2, 60000);
        } finally {
            pollTimeoutId.current = setTimeout(fetchLogs, pollIntervalRef.current);
            setIsLogsRefreshing(false);
        }
    }, [project.projectId, region, serviceName]);

    useEffect(() => {
        if (activeTab === 'logs') {
            if (!lastLogTimestamp.current) {
                const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toJSON();
                lastLogTimestamp.current = twoMinutesAgo;
            }
            fetchLogs();
            return () => {
                if (pollTimeoutId.current) clearTimeout(pollTimeoutId.current);
            };
        }
    }, [activeTab, fetchLogs]);

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        router.push(`/?view=services&service=${serviceName}&region=${region}&tab=${tab}`);
    };

    if (!service) {
        return <div className="p-6">{isLoading ? <p>Loading service details...</p> : <p className="text-red-500">{error || 'Service not found.'}</p>}</div>;
    }

    const consoleUrl = `https://console.cloud.google.com/run/detail/${region}/${serviceName}/revisions?project=${project.projectId}`;
    const container = service.template.containers[0];
    const modelSource = container?.image?.includes('ollama') ? 'ollama' : 'huggingface';
    const configuredModel = container?.env?.find(e => e.name === 'MODEL')?.value;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'details':
                return <ServiceDetailsTab service={service} />;
            case 'logs':
                return (
                    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-base font-medium">Live Logs</h2>
                            <button onClick={() => fetchLogs()} disabled={isLogsRefreshing} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 disabled:text-gray-300" title="Refresh logs">
                                <RefreshIcon isRefreshing={isLogsRefreshing} />
                            </button>
                        </div>
                        <div ref={logContainerRef} className="p-4 font-mono text-xs h-96 overflow-y-auto bg-gray-900 text-white rounded-b-md whitespace-pre-wrap break-all">
                            {logError && <p className="text-yellow-400">{logError}</p>}
                            {logs.map((log, i) => (
                                <p key={i}>
                                    <span className="text-gray-400">
                                        {new Date((log.timestamp?.seconds || 0) * 1000 + (log.timestamp?.nanos || 0) / 1e6).toLocaleString()}
                                    </span>: {typeof log.message === "object" ? JSON.stringify(log.message) : log.message}
                                </p>
                            ))}
                        </div>
                    </div>
                );
            case 'permissions':
                return <PermissionsCard project={project} region={region} serviceName={serviceName} />;
            case 'chat':
                if (status === 'Running' && service.uri) {
                    return <ChatCard serviceUrl={service.uri} modelSource={modelSource} configuredModel={configuredModel} />;
                }
                return <p className="text-center text-gray-500 py-8">Service must be running to use the chat.</p>;
            default:
                return null;
        }
    };

    return (
        <div className="p-6 bg-gray-50 flex-grow">
            <div className="flex justify-between items-center pb-4 mb-4">
                <div>
                    <button onClick={onBack} className="text-sm font-medium text-blue-600 hover:underline mb-2">← Back to Services</button>
                    <div className="flex items-center">
                        <h1 className="text-xl font-medium text-gray-800 mr-4">Service: {serviceName}</h1>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            status === 'Running' ? 'bg-green-100 text-green-800' : 
                            status === 'Deploying' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>{status}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => onEdit(service)} className="bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50">
                        Edit
                    </button>
                    <a href={consoleUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                        Manage in Cloud Run
                    </a>
                </div>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                    {(['details', 'logs', 'permissions', 'chat'] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`capitalize py-3 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab === 'details' ? 'Details' : tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6">
                {isLoading && activeTab === 'details' ? <p>Loading details...</p> : error ? <p className="text-red-500">{error}</p> : renderTabContent()}
            </div>
        </div>
    );
};

const ServiceDetailsTab = ({ service }: { service: Service }) => {
    const container = service.template.containers[0];
    if (!container) return <p>No container information available.</p>;

    const subnetwork = service.template.vpcAccess?.networkInterfaces?.[0]?.subnetwork || 'Not connected';

    const gcsVolume = service.template.volumes?.find(v => v.gcs);
    const gcsMount = gcsVolume ? container.volumeMounts?.find(vm => vm.name === gcsVolume.name) : null;
    const bucketName = gcsVolume?.gcs?.bucket || null;
    const mountPath = gcsMount?.mountPath || null;

    const DetailItem = ({ label, children }: { label: string, children: React.ReactNode }) => (
        <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-600">{label}</dt>
            <dd className="mt-1 text-sm text-gray-800 sm:mt-0 sm:col-span-2">{children}</dd>
        </div>
    );

    return (
        <div className="bg-white border border-gray-200 rounded-md">
            <div className="p-4 border-b"><h2 className="text-base font-medium">Configuration</h2></div>
            <div className="p-4">
                <dl className="divide-y divide-gray-200">
                    <DetailItem label="Endpoint URL"><a href={service.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">{service.uri}</a></DetailItem>
                    <DetailItem label="Service Name">{service.name.split('/')[5]}</DetailItem>
                    <DetailItem label="Region">{service.name.split('/')[3]}</DetailItem>
                    <DetailItem label="Last Updated">{new Date(service.updateTime).toLocaleString()}</DetailItem>
                    <DetailItem label="Container Image">{container.image}</DetailItem>
                    <DetailItem label="GPU">{service.template.nodeSelector?.accelerator || 'Not specified'}</DetailItem>
                    <DetailItem label="vCPUs">{container.resources?.limits?.cpu || 'Not specified'}</DetailItem>
                    <DetailItem label="Memory">{container.resources?.limits?.memory || 'Not specified'}</DetailItem>
                    <DetailItem label="VPC Subnetwork">{subnetwork}</DetailItem>
                    <DetailItem label="GCS Mount">{bucketName && mountPath ? `${bucketName} → ${mountPath}` : 'Not mounted'}</DetailItem>
                    <DetailItem label="Arguments">
                        <pre className="font-mono text-xs bg-gray-100 p-2 rounded">{container.args?.join('\n') || 'None'}</pre>
                    </DetailItem>
                    <DetailItem label="Environment Variables">
                        <pre className="font-mono text-xs bg-gray-100 p-2 rounded">
                            {container.env?.map(e => `${e.name}=${e.value}`).join('\n') || 'None'}
                        </pre>
                    </DetailItem>
                </dl>
            </div>
        </div>
    );
};


export default Services;