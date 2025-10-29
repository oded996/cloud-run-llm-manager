'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, Tooltip } from '../general/general.component';
import { PermissionsCard } from './permissions.component';
import { ChatCard } from './chat.component';

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
    nodeSelector?: {
      accelerator?: string;
    };
    containers: {
      image: string;
      args?: string[];
      ports?: {
        containerPort?: number;
      }[];
      resources?: {
        limits?: {
          cpu?: string;
          memory?: string;
        };
      };
    }[];
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

const Services = ({ selectedProject, initialService }: { selectedProject: Project | null, initialService: { name: string, region: string } | null }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const cacheKey = selectedProject ? `llm_manager_services_cache_${selectedProject.projectId}` : null;

  useEffect(() => {
    // When the project changes, always reset to the list view.
    setSelectedService(null);
  }, [selectedProject]);

  useEffect(() => {
    if (initialService && selectedProject) {
      // Construct a partial service object to immediately show the detail view
      const partialService = {
        name: `projects/${selectedProject.projectId}/locations/${initialService.region}/services/${initialService.name}`,
        // Dummy values for other required fields, they will be updated by the fetch inside ServiceDetailView
        uid: '',
        uri: '',
        reconciling: true, // Assume it's deploying
        updateTime: new Date().toISOString(),
        lastModifier: '',
        latestCreatedRevision: '',
        latestReadyRevision: ' ', // Important: make these different to trigger 'Deploying' state
        template: { containers: [] },
        terminalCondition: { type: '', state: '' },
        conditions: [],
      };
      setSelectedService(partialService);
    }
  }, [initialService, selectedProject]);

  const fetchServices = useCallback(async () => {
    if (!selectedProject || !cacheKey) {
        setIsLoading(false);
        return;
    }
    
    setIsRefreshing(true);
    setError(null);

    try {
        const response = await fetch(`/api/services/list?projectId=${selectedProject.projectId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch services.');
        }
        const data = await response.json();
        
        const cachedData = localStorage.getItem(cacheKey);
        if (JSON.stringify(data) !== cachedData) {
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
    if (!selectedProject || !cacheKey) {
      setIsLoading(false);
      return;
    }

    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        setServices(JSON.parse(cachedData));
        setIsLoading(false);
    } else {
        setIsLoading(true); // Only show loader if no cache exists
    }

    fetchServices();
  }, [selectedProject, cacheKey, fetchServices]);

  if (selectedService) {
    return <ServiceDetailView project={selectedProject!} initialService={selectedService} onBack={() => setSelectedService(null)} />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
        <div className="flex items-center space-x-2">
            <h1 className="text-xl font-medium text-gray-800">Services</h1>
            <Tooltip text="Refresh services list">
                <button
                    onClick={() => fetchServices()}
                    disabled={isRefreshing || !selectedProject}
                    className="p-1 rounded-full text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
                >
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
                
                const getStatus = (service: Service) => {
                  if (service.reconciling || service.latestCreatedRevision !== service.latestReadyRevision) {
                    return 'Deploying';
                  }
                  const readyCondition = service.terminalCondition;
                  if (readyCondition?.type === 'Ready' && readyCondition?.state === 'CONDITION_SUCCEEDED') {
                    return 'Running';
                  }
                  return 'Error';
                }
                const status = getStatus(service);

                return (
                  <tr key={service.uid} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                    <td className="p-3">
                      <button onClick={() => setSelectedService(service)} className="text-blue-600 font-medium hover:underline">{serviceName}</button>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        status === 'Running' ? 'bg-green-100 text-green-800' : 
                        status === 'Deploying' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {status}
                      </span>
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

const ServiceDetailView = ({ project, initialService, onBack }: { project: Project, initialService: Service, onBack: () => void }) => {
    const [service, setService] = useState<Service>(initialService);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [logError, setLogError] = useState<string | null>(null);
    const [isLogsRefreshing, setIsLogsRefreshing] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const lastLogTimestamp = useRef<string | null>(null);

    const region = initialService.name.split('/')[3];
    const serviceName = initialService.name.split('/')[5];

    const getStatus = (service: Service) => {
        if (service.reconciling || service.latestCreatedRevision !== service.latestReadyRevision) {
            return 'Deploying';
        }
        const readyCondition = service.terminalCondition;
        if (readyCondition?.type === 'Ready' && readyCondition?.state === 'CONDITION_SUCCEEDED') {
            return 'Running';
        }
        return 'Error';
    };

    const status = getStatus(service);

    useEffect(() => {
        const fetchService = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/services/detail?projectId=${project.projectId}&region=${region}&serviceName=${serviceName}`);
                if (!response.ok) throw new Error('Failed to fetch service details.');
                const data = await response.json();
                setService(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (status === 'Deploying') {
            const interval = setInterval(fetchService, 5000); // Poll every 5 seconds
            return () => clearInterval(interval);
        }
    }, [project.projectId, region, serviceName, status]);

    const pollIntervalRef = useRef<number>(15000); // Start with a 15-second interval
    const pollTimeoutId = useRef<NodeJS.Timeout | null>(null);

    const fetchLogs = useCallback(async () => {
        // Clear any existing timeout before starting a new fetch
        if (pollTimeoutId.current) clearTimeout(pollTimeoutId.current);
        setIsLogsRefreshing(true);

        try {
            let url = `/api/services/logs?projectId=${project.projectId}&region=${region}&serviceName=${serviceName}`;
            if (lastLogTimestamp.current) {
                url += `&since=${lastLogTimestamp.current}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch logs.');
            }

            // If successful, reset the poll interval to the base value
            pollIntervalRef.current = 15000;
            setLogError(null); // Clear previous errors

            const newLogs = await response.json();

            if (newLogs.length > 0) {
                const logContainer = logContainerRef.current;
                const shouldScroll = logContainer ? (logContainer.scrollTop + logContainer.clientHeight) >= logContainer.scrollHeight - 20 : false;
                
                const lastLog = newLogs[newLogs.length - 1];
                if (lastLog && lastLog.timestamp && typeof lastLog.timestamp.seconds === 'number') {
                    const lastTimestampISO = new Date(lastLog.timestamp.seconds * 1000 + (lastLog.timestamp.nanos || 0) / 1000000).toJSON();
                    if (lastTimestampISO) {
                        lastLogTimestamp.current = lastTimestampISO;
                    }
                }

                setLogs(prevLogs => {
                    const updatedLogs = [...prevLogs, ...newLogs];
                    if (updatedLogs.length > 3000) {
                        return updatedLogs.slice(updatedLogs.length - 3000);
                    }
                    return updatedLogs;
                });

                if (shouldScroll && logContainer) {
                    setTimeout(() => {
                        logContainer.scrollTop = logContainer.scrollHeight;
                    }, 100);
                }
            }
        } catch (err: any) {
            console.error("Log fetch error:", err.message);
            
            let userMessage = `Could not fetch new logs: ${err.message}.`;
            // Provide a more user-friendly message for quota errors.
            if (err.message && err.message.includes('RESOURCE_EXHAUSTED')) {
                userMessage = 'Log quota limit reached. Polling less frequently.';
            }
            
            setLogError(`${userMessage} Retrying...`);
            
            // Implement exponential backoff
            pollIntervalRef.current = Math.min(pollIntervalRef.current * 2, 60000); // Double interval, max 60s
        } finally {
            // Schedule the next poll
            pollTimeoutId.current = setTimeout(fetchLogs, pollIntervalRef.current);
            setIsLogsRefreshing(false);
        }
    }, [project.projectId, region, serviceName]);

    useEffect(() => {
        // Start the polling
        fetchLogs();

        // Cleanup on component unmount
        return () => {
            if (pollTimeoutId.current) {
                clearTimeout(pollTimeoutId.current);
            }
        };
    }, [fetchLogs]);

    const consoleUrl = `https://console.cloud.google.com/run/detail/${region}/${serviceName}/revisions?project=${project.projectId}`;
    const modelArg = service.template.containers[0]?.args?.find(arg => arg.startsWith('--model='));
    const deployedModel = modelArg ? modelArg.split('/').pop() : 'Unknown';
    const container = service.template.containers[0];
    const resources = container?.resources?.limits;
    const modelSource = container?.image?.includes('ollama') ? 'ollama' : 'huggingface';

    return (
        <div className="p-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-6">
                <div>
                    <button onClick={onBack} className="text-sm font-medium text-blue-600 hover:underline mb-2">← Back to Services</button>
                    <div className="flex items-center">
                        <h1 className="text-xl font-medium text-gray-800 mr-4">Service: {serviceName}</h1>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            status === 'Running' ? 'bg-green-100 text-green-800' : 
                            status === 'Deploying' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {status}
                        </span>
                    </div>
                </div>
                <a href={consoleUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                    Manage in Cloud Run
                </a>
            </div>

            <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-md">
                    <div className="p-4 border-b"><h2 className="text-base font-medium">Details</h2></div>
                    <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                        <div><p className="font-medium text-gray-600">Endpoint URL</p><a href={service.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">{service.uri}</a></div>
                        <div><p className="font-medium text-gray-600">Deployed Model</p><p>{deployedModel}</p></div>
                        <div><p className="font-medium text-gray-600">Region</p><p>{region}</p></div>
                        <div><p className="font-medium text-gray-600">Last Updated</p><p>{new Date(service.updateTime).toLocaleString()}</p></div>
                    </div>
                </div>

                {project && <PermissionsCard project={project} region={region} serviceName={serviceName} />}

                <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <h2 className="text-base font-medium">Live Logs</h2>
                        <button
                            onClick={() => fetchLogs()}
                            disabled={isLogsRefreshing}
                            className="p-1 rounded-full text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
                            title="Refresh logs"
                        >
                            <RefreshIcon isRefreshing={isLogsRefreshing} />
                        </button>
                    </div>
                  </div>
                  <div
                    ref={logContainerRef}
                    className="
                      p-4 font-mono text-xs h-64
                      overflow-y-auto
                      bg-gray-900 text-white rounded-b-md
                      whitespace-pre-wrap break-all
                    "
                  >
                    {logError && <p className="text-yellow-400">{logError}</p>}
                    {logs.map((log, i) => (
                      <p key={i}>
                        <span className="text-gray-400">
                          {(() => {
                            const ts = log.timestamp;
                            if (ts && typeof ts.seconds === "number") {
                              return new Date(
                                ts.seconds * 1000 + (ts.nanos || 0) / 1000000
                              ).toLocaleString();
                            }
                            if (ts && !isNaN(new Date(ts).getTime())) {
                              return new Date(ts).toLocaleString();
                            }
                            return "No timestamp";
                          })()}
                        </span>
                        :{" "}
                        {typeof log.message === "object"
                          ? JSON.stringify(log.message)
                          : log.message}
                      </p>
                    ))}
                  </div>
</div>

                {status === 'Running' && service.uri && <ChatCard serviceUrl={service.uri} modelSource={modelSource} />}
            </div>
        </div>
    );
    

};

export default Services;