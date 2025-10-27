import React, { useState, useEffect } from 'react';
import { SUPPORTED_REGIONS, RegionConfig } from '@/app/config/regions';
import { Project } from '../general/general.component';

// --- Interfaces ---
interface Model {
  id: string;
  source: 'huggingface' | 'ollama';
  status: 'completed' | 'downloading';
  downloadedAt: string;
  size?: number;
}

interface Bucket {
  name: string;
  location: string;
  models: Model[];
}

interface PreflightInfo {
    files: { name: string; size: number }[];
    totalSize: number;
}

interface DownloadProgress {
    message?: string;
    file?: string;
    progress?: number;
    total?: number;
    error?: string;
}

// --- Helper Components ---
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const Models = ({ selectedProject, onSwitchToServices }: { selectedProject: Project | null, onSwitchToServices: (serviceName: string, region: string) => void }) => {
  const [viewMode, setViewMode] = useState<'list' | 'import' | 'deploy'>('list');
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployingModel, setDeployingModel] = useState<{model: Model, bucket: Bucket} | null>(null);

  const fetchBuckets = async () => {
    if (!selectedProject) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/models/buckets?projectId=${selectedProject.projectId}`);
      if (!response.ok) throw new Error('Failed to fetch buckets.');
      const data = await response.json();
      setBuckets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      fetchBuckets();
    }
  }, [selectedProject, viewMode]);

  const handleDeployClick = (model: Model, bucket: Bucket) => {
    setDeployingModel({ model, bucket });
    setViewMode('deploy');
  };

  if (viewMode === 'import') {
    return (
      <ImportModelView
        project={selectedProject!}
        onClose={() => setViewMode('list')}
        onImportSuccess={() => {
          setViewMode('list');
          fetchBuckets();
        }}
      />
    );
  }

  if (viewMode === 'deploy' && deployingModel) {
    return (
      <DeployServiceView 
        project={selectedProject!}
        model={deployingModel.model}
        bucket={deployingModel.bucket}
        onClose={() => setViewMode('list')}
        onDeploymentStart={onSwitchToServices}
      />
    )
  }

  return (
    <ModelsList
      selectedProject={selectedProject}
      buckets={buckets}
      isLoading={isLoading}
      error={error}
      onImportClick={() => setViewMode('import')}
      onDeployClick={handleDeployClick}
    />
  );
};

const ImportModelView = ({ project, onClose, onImportSuccess }: { project: Project, onClose: () => void, onImportSuccess: () => void }) => {
    const [step, setStep] = useState(1);
    const [managedBuckets, setManagedBuckets] = useState<Bucket[]>([]);
    const [isLoadingBuckets, setIsLoadingBuckets] = useState(true);
    const [targetBucket, setTargetBucket] = useState('');
    const [createBucket, setCreateBucket] = useState(false);
    const [newBucketName, setNewBucketName] = useState(`${project.projectId}-llm-models`);
    const [newBucketRegion, setNewBucketRegion] = useState(SUPPORTED_REGIONS[0]?.name || '');

    const [modelSource, setModelSource] = useState('huggingface');
    const [modelId, setModelId] = useState('');
    const [hfToken, setHfToken] = useState('');

    const [preflightInfo, setPreflightInfo] = useState<PreflightInfo | null>(null);
    const [isPreflighting, setIsPreflighting] = useState(false);
    const [preflightError, setPreflightError] = useState<string | null>(null);

    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    useEffect(() => {
        const fetchManagedBuckets = async () => {
            setIsLoadingBuckets(true);
            try {
                const response = await fetch(`/api/models/buckets?projectId=${project.projectId}`);
                if (response.ok) {
                    const data = await response.json();
                    setManagedBuckets(data);
                    if (data.length > 0) {
                        setTargetBucket(data[0].name);
                    } else {
                        setCreateBucket(true);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch buckets", e);
            } finally {
                setIsLoadingBuckets(false);
            }
        };
        fetchManagedBuckets();
    }, [project.projectId]);

    const handlePreflight = async () => {
        setIsPreflighting(true);
        setPreflightError(null);
        setPreflightInfo(null);
        try {
            const response = await fetch('/api/models/import/preflight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelId, hfToken }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Preflight check failed.');
            }
            setPreflightInfo(data);
            setStep(3);
        } catch (err: any) {
            setPreflightError(err.message);
        } finally {
            setIsPreflighting(false);
        }
    };

    const handleStartDownload = async () => {
        setIsDownloading(true);
        setDownloadError(null);
        setDownloadProgress({ message: 'Starting download...' });
        setStep(4);

        let finalBucketName = targetBucket;
        if (createBucket) {
            try {
                const createResponse = await fetch('/api/models/buckets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bucketName: newBucketName,
                        location: newBucketRegion,
                        projectId: project.projectId,
                    }),
                });
                const data = await createResponse.json();
                if (!createResponse.ok) {
                    throw new Error(data.error || 'Failed to create bucket.');
                }
                finalBucketName = data.name;
            } catch (err: any) {
                setDownloadError(err.message);
                setIsDownloading(false);
                return;
            }
        }

        try {
            const response = await fetch('/api/models/import/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId,
                    bucketName: finalBucketName,
                    hfToken,
                    projectId: project.projectId,
                    totalSize: preflightInfo?.totalSize,
                }),
            });

            if (!response.body) throw new Error('Download failed: No response body.');

            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    setDownloadProgress({ message: 'Download complete! Metadata updated.' });
                    setTimeout(onImportSuccess, 2000);
                    break;
                }
                const lines = value.split('\n\n').filter(line => line.startsWith('data: '));
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        if (json.error) {
                            setDownloadError(json.error);
                            setIsDownloading(false);
                            return;
                        }
                        setDownloadProgress(json);
                    } catch (e) {
                        console.error("Failed to parse SSE chunk", value);
                    }
                }
            }
        } catch (err: any) {
            setDownloadError(err.message);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-6">
                <h1 className="text-xl font-medium text-gray-800">Import Model</h1>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            </div>

            <div className="space-y-6">
                {/* Step 1: Target Bucket */}
                <div className={`bg-white border border-gray-200 rounded-md ${step !== 1 ? 'opacity-50' : ''}`}>
                    <div className="p-4 border-b"><h2 className="text-base font-medium">Step 1: Target Bucket</h2></div>
                    <div className="p-4 space-y-4">
                        <div className="flex items-center space-x-4">
                            <label><input type="radio" checked={!createBucket} onChange={() => setCreateBucket(false)} disabled={managedBuckets.length === 0} /> Use Existing Bucket</label>
                            <label><input type="radio" checked={createBucket} onChange={() => setCreateBucket(true)} /> Create New Bucket</label>
                        </div>
                        {createBucket ? (
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bucket Name</label>
                                    <input type="text" value={newBucketName} onChange={e => setNewBucketName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Region</label>
                                    <select value={newBucketRegion} onChange={e => setNewBucketRegion(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                        {SUPPORTED_REGIONS.map(r => <option key={r.name} value={r.name}>{r.description} ({r.name})</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Bucket</label>
                                {isLoadingBuckets ? <p>Loading buckets...</p> :
                                    <select value={targetBucket} onChange={e => setTargetBucket(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                        {managedBuckets.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                    </select>
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2: Model Source */}
                <div className={`bg-white border border-gray-200 rounded-md ${step !== 2 ? 'opacity-50' : ''}`}>
                    <div className="p-4 border-b"><h2 className="text-base font-medium">Step 2: Model Source</h2></div>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Model Source</label>
                            <select value={modelSource} onChange={e => setModelSource(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                <option value="huggingface">Hugging Face (vLLM)</option>
                                <option value="ollama" disabled>Ollama (coming soon)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Model ID</label>
                            <input type="text" value={modelId} onChange={e => setModelId(e.target.value)} placeholder="e.g., google/gemma-2-9b-it" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hugging Face Token (optional)</label>
                            <input type="password" value={hfToken} onChange={e => setHfToken(e.target.value)} placeholder="hf_..." className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                            <p className="text-xs text-gray-500 mt-1">Required for gated models like Llama 3.</p>
                        </div>
                        {preflightError && <p className="text-red-500 mt-2">{preflightError}</p>}
                    </div>
                </div>

                {/* Step 3: Pre-flight Check */}
                {step >= 3 && preflightInfo && (
                    <div className={`bg-white border border-gray-200 rounded-md ${step !== 3 ? 'opacity-50' : ''}`}>
                        <div className="p-4 border-b"><h2 className="text-base font-medium">Step 3: Confirmation</h2></div>
                        <div className="p-4">
                            <p className="font-medium">Model: <span className="font-normal">{modelId}</span></p>
                            <p className="font-medium">Total Size: <span className="font-normal">{formatBytes(preflightInfo.totalSize)}</span></p>
                            <p className="font-medium">File Count: <span className="font-normal">{preflightInfo.files.length}</span></p>
                        </div>
                    </div>
                )}

                {/* Step 4: Download Progress */}
                {step === 4 && (
                    <div className="bg-white border border-gray-200 rounded-md">
                        <div className="p-4 border-b"><h2 className="text-base font-medium">Download Progress</h2></div>
                        <div className="p-4 space-y-2">
                            {downloadError && <p className="text-red-500">{downloadError}</p>}
                            {downloadProgress?.message && <p>{downloadProgress.message}</p>}
                            {downloadProgress?.file && (
                                <div>
                                    <p className="font-mono text-sm">{downloadProgress.file}</p>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(downloadProgress.progress! / downloadProgress.total!) * 100}%` }}></div>
                                    </div>
                                    <p className="text-sm text-gray-600">{formatBytes(downloadProgress.progress!)} / {formatBytes(downloadProgress.total!)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end pt-4">
                    {step === 1 && <button onClick={() => setStep(2)} disabled={createBucket ? !newBucketName : !targetBucket} className="px-6 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">Next</button>}
                    {step === 2 && <button onClick={handlePreflight} disabled={!modelId || isPreflighting} className="px-6 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center">{isPreflighting && <Spinner />} Check & Continue</button>}
                    {step === 3 && <button onClick={handleStartDownload} disabled={isDownloading} className="px-6 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center">{isDownloading && <Spinner />} Start Download</button>}
                </div>
            </div>
        </div>
    );
};

const DeployServiceView = ({ project, model, bucket, onClose, onDeploymentStart }: { project: Project, model: Model, bucket: Bucket, onClose: () => void, onDeploymentStart: (serviceName: string, region: string) => void }) => {
    const [serviceName, setServiceName] = useState(`vllm-${model.id.replace(/[^a-zA-Z0-9]/g, '-')}`);
    const [serviceNameError, setServiceNameError] = useState<string | null>(null);
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [containerImage, setContainerImage] = useState('vllm/vllm-openai');
    const [containerPort, setContainerPort] = useState('8000');
    
    const [cpu, setCpu] = useState('8');
    const [memory, setMemory] = useState('16Gi');
    
    const regionConfig = SUPPORTED_REGIONS.find(r => r.name === bucket.location.toLowerCase());
    const [gpu, setGpu] = useState(regionConfig?.gpus[0]?.accelerator || '');

    const [gpuZonalRedundancyDisabled, setGpuZonalRedundancyDisabled] = useState(true);
    
    const [args, setArgs] = useState([
        { id: 1, key: '--model', value: `/gcs/${bucket.name}/${model.id}` },
        { id: 2, key: '--tensor-parallel-size', value: '1' },
        { id: 3, key: '--port', value: '8000' },
        { id: 4, key: '--gpu-memory-utilization', value: '0.80' },
        { id: 5, key: '--max-num-seqs', value: '128' },
    ]);
    const [envVars, setEnvVars] = useState([
        { id: 1, key: 'HF_HUB_OFFLINE', value: '1' },
    ]);

    const [minInstances, setMinInstances] = useState(0);
    const [maxInstances, setMaxInstances] = useState(1);
    
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployError, setDeployError] = useState<string | null>(null);
    const [deployProgress, setDeployProgress] = useState<any[]>([]);

    const handleArgChange = (id: number, field: 'key' | 'value', value: string) => {
        setArgs(args.map(arg => arg.id === id ? { ...arg, [field]: value } : arg));
    };

    const addArg = () => {
        setArgs([...args, { id: Date.now(), key: '', value: '' }]);
    };

    const removeArg = (id: number) => {
        setArgs(args.filter(arg => arg.id !== id));
    };

    const handleEnvVarChange = (id: number, field: 'key' | 'value', value: string) => {
        setEnvVars(envVars.map(env => env.id === id ? { ...env, [field]: value } : env));
    };

    const addEnvVar = () => {
        setEnvVars([...envVars, { id: Date.now(), key: '', value: '' }]);
    };

    const removeEnvVar = (id: number) => {
        setEnvVars(envVars.filter(env => env.id !== id));
    };

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (!serviceName) {
                setServiceNameError('Service name cannot be empty.');
                return;
            }
            setIsCheckingName(true);
            setServiceNameError(null);
            try {
                const response = await fetch(`/api/services/exists?projectId=${project.projectId}&region=${bucket.location}&serviceName=${serviceName}`);
                const data = await response.json();
                if (data.exists) {
                    setServiceNameError(`Service "${serviceName}" already exists in ${bucket.location}.`);
                }
            } catch (error) {
                setServiceNameError('Failed to verify service name.');
            } finally {
                setIsCheckingName(false);
            }
        }, 500); // 500ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [serviceName, project.projectId, bucket.location]);

    const handleDeploy = async () => {
        if (serviceNameError) return;
        setIsDeploying(true);
        setDeployError(null);
        setDeployProgress([]);

        try {
            const response = await fetch('/api/services/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.projectId,
                    region: bucket.location,
                    serviceName,
                    containerImage,
                    containerPort,
                    cpu,
                    memory,
                    gpu,
                    gpuZonalRedundancyDisabled,
                    minInstances,
                    maxInstances,
                    args,
                    envVars,
                    bucketName: bucket.name,
                    modelId: model.id,
                }),
            });

            if (!response.body) throw new Error('Deployment failed: No response body.');

            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const lines = value.split('\n\n').filter(line => line.startsWith('data: '));
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        
                        if (json.error) {
                            setDeployError(json.error);
                            setDeployProgress(prev => [...prev, { error: json.error }]);
                            setIsDeploying(false);
                            return;
                        }

                        if (json.creationStarted) {
                            onDeploymentStart(json.serviceName, json.region);
                            reader.cancel();
                            return;
                        }

                        setDeployProgress(prev => [...prev, json]);
                    } catch (e) {
                        console.error("Failed to parse SSE chunk", value);
                    }
                }
            }
        } catch (err: any) {
            setDeployError(err.message);
            setDeployProgress(prev => [...prev, { error: err.message }]);
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-6">
                <h1 className="text-xl font-medium text-gray-800">Deploy Model: {model.id}</h1>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            </div>

            <div className="space-y-6">
                {/* Service Details */}
                <div className="bg-white border border-gray-200 rounded-md">
                    <div className="p-4 border-b"><h2 className="text-base font-medium">Service Details</h2></div>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Service Name</label>
                            <input type="text" value={serviceName} onChange={e => setServiceName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                            {isCheckingName && <p className="text-sm text-gray-500 mt-1">Checking name...</p>}
                            {serviceNameError && <p className="text-sm text-red-600 mt-1">{serviceNameError}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Region</label>
                            <p className="mt-1 text-sm text-gray-800">{bucket.location} (locked to model's region)</p>
                        </div>
                    </div>
                </div>

                {/* Container */}
                <div className="bg-white border border-gray-200 rounded-md">
                    <div className="p-4 border-b"><h2 className="text-base font-medium">Container</h2></div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Container Image</label>
                            <input type="text" value={containerImage} onChange={e => setContainerImage(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Container Port</label>
                            <input type="text" value={containerPort} onChange={e => setContainerPort(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                    </div>
                </div>

                {/* Billing & Scaling */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-md">
                        <div className="p-4 border-b"><h2 className="text-base font-medium">Billing</h2></div>
                        <div className="p-4">
                            <p className="text-sm text-gray-800">Instance-based</p>
                            <p className="text-xs text-gray-500 mt-1">Required when using GPUs.</p>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-md">
                        <div className="p-4 border-b"><h2 className="text-base font-medium">Service Scaling</h2></div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-center space-x-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Min Instances</label>
                                    <input type="number" value={minInstances} onChange={e => setMinInstances(parseInt(e.target.value, 10))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Max Instances</label>
                                    <input type="number" value={maxInstances} onChange={e => setMaxInstances(parseInt(e.target.value, 10))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Set a maximum to control costs, and a minimum to reduce cold starts.</p>
                        </div>
                    </div>
                </div>

                {/* Resources */}
                <div className="bg-white border border-gray-200 rounded-md">
                    <div className="p-4 border-b"><h2 className="text-base font-medium">Resources</h2></div>
                    <div className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">GPU</label>
                                <select value={gpu} onChange={e => setGpu(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    {regionConfig?.gpus.map(g => <option key={g.name} value={g.accelerator}>{g.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">vCPUs</label>
                                <select value={cpu} onChange={e => setCpu(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    <option value="8">8</option>
                                    <option value="16">16</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Memory</label>
                                <select value={memory} onChange={e => setMemory(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    <option value="16Gi">16 GB</option>
                                    <option value="32Gi">32 GB</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="flex items-center">
                                <input type="checkbox" checked={gpuZonalRedundancyDisabled} onChange={e => setGpuZonalRedundancyDisabled(e.target.checked)} className="form-checkbox" />
                                <span className="ml-2 text-sm text-gray-700">Disable GPU zonal redundancy (cost saving)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Volume Mount */}
                <div className="bg-white border border-gray-200 rounded-md">
                    <div className="p-4 border-b"><h2 className="text-base font-medium">Volume Mounts</h2></div>
                    <div className="p-4">
                        <div className="flex items-center justify-between text-sm">
                            <p className="font-medium text-gray-800">gcs-bucket (read-only)</p>
                            <p className="font-mono text-gray-600">{`/gcs/${bucket.name}`}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">The GCS bucket containing the model will be mounted into the container.</p>
                    </div>
                </div>

                {/* Arguments & Env Vars */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-md">
                        <div className="p-4 border-b"><h2 className="text-base font-medium">Container Arguments</h2></div>
                        <div className="p-4 space-y-2">
                            {args.map(arg => (
                                <div key={arg.id} className="flex items-center space-x-2">
                                    <input type="text" value={arg.key} onChange={e => handleArgChange(arg.id, 'key', e.target.value)} className="w-1/3 p-1 border border-gray-300 rounded-md text-sm" readOnly={arg.key === '--model'} />
                                    <input type="text" value={arg.value} onChange={e => handleArgChange(arg.id, 'value', e.target.value)} className="flex-1 p-1 border border-gray-300 rounded-md text-sm" readOnly={arg.key === '--model'} />
                                    <button onClick={() => removeArg(arg.id)} disabled={arg.key === '--model'} className="text-red-500 hover:text-red-700 disabled:text-gray-300">Remove</button>
                                </div>
                            ))}
                            <button onClick={addArg} className="text-sm text-blue-600 hover:underline mt-2">Add Argument</button>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-md">
                        <div className="p-4 border-b"><h2 className="text-base font-medium">Environment Variables</h2></div>
                        <div className="p-4 space-y-2">
                             {envVars.map(env => (
                                <div key={env.id} className="flex items-center space-x-2">
                                    <input type="text" value={env.key} onChange={e => handleEnvVarChange(env.id, 'key', e.target.value)} className="w-1/3 p-1 border border-gray-300 rounded-md text-sm" />
                                    <input type="text" value={env.value} onChange={e => handleEnvVarChange(env.id, 'value', e.target.value)} className="flex-1 p-1 border border-gray-300 rounded-md text-sm" />
                                    <button onClick={() => removeEnvVar(env.id)} className="text-red-500 hover:text-red-700">Remove</button>
                                </div>
                            ))}
                            <button onClick={addEnvVar} className="text-sm text-blue-600 hover:underline mt-2">Add Variable</button>
                        </div>
                    </div>
                </div>
                
                {deployError && <p className="text-red-500 mt-4">{deployError}</p>}

                {deployProgress.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-md">
                        <div className="p-4 border-b"><h2 className="text-base font-medium">Deployment Progress</h2></div>
                        <div className="p-4 font-mono text-xs h-64 overflow-y-auto bg-gray-900 text-white rounded-b-md">
                            {deployProgress.map((p, i) => <p key={i}>{p.message || p.error || JSON.stringify(p)}</p>)}
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button onClick={handleDeploy} disabled={isDeploying || !!serviceNameError || isCheckingName} className="px-6 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center">
                        {isDeploying && <Spinner />}
                        Deploy
                    </button>
                </div>
            </div>
        </div>
    );
};

const ModelsList = ({ selectedProject, buckets, isLoading, error, onImportClick, onDeployClick }: { selectedProject: Project | null, buckets: Bucket[], isLoading: boolean, error: string | null, onImportClick: () => void, onDeployClick: (model: Model, bucket: Bucket) => void }) => {

  const getGpuRecommendations = (modelSize: number, region: string) => {
    const estimatedVramGb = (modelSize / (1024 * 1024 * 1024)) * 1.2; // size in bytes to GB + 20% overhead
    const regionConfig = SUPPORTED_REGIONS.find(r => r.name === region);
    if (!regionConfig) return { estimatedVramGb, recommendations: [] };

    const recommendations = regionConfig.gpus
      .filter(gpu => gpu.vram_gb >= estimatedVramGb)
      .map(gpu => gpu.name);
      
    return { estimatedVramGb, recommendations };
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
        <h1 className="text-xl font-medium text-gray-800">Models</h1>
        <button
          onClick={onImportClick}
          disabled={!selectedProject}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
          Import Model
        </button>
      </div>

      {isLoading && <p>Loading buckets...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && buckets.length === 0 && (
        <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No Model Buckets Found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by importing a new model.</p>
        </div>
      )}

      <div className="space-y-6">
        {buckets.map((bucket) => (
          <div key={bucket.name} className="bg-white border border-gray-200 rounded-md">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-base font-medium text-gray-800">{bucket.name}</h2>
                <p className="text-sm text-gray-500">{bucket.location}</p>
            </div>
            <div className="p-4">
              {bucket.models.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {bucket.models.map(model => {
                    const { estimatedVramGb, recommendations } = model.size ? getGpuRecommendations(model.size, bucket.location) : { estimatedVramGb: 0, recommendations: [] };
                    return (
                      <li key={model.id} className="py-4">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <p className="font-medium text-gray-800">{model.id}</p>
                                <p className="text-sm text-gray-600">Source: {model.source}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                {model.status === 'completed' && (
                                  <button 
                                    onClick={() => onDeployClick(model, bucket)}
                                    className="text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 px-3 py-1"
                                  >
                                    Deploy
                                  </button>
                                )}
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${model.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {model.status}
                                </span>
                            </div>
                        </div>
                        {model.size ? (
                          <div className="text-xs text-gray-600 grid grid-cols-3 gap-4 mt-2">
                            <div>
                              <p className="font-medium">Model Size</p>
                              <p>{formatBytes(model.size)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Est. vRAM Required</p>
                              <p>~{estimatedVramGb.toFixed(2)} GB</p>
                            </div>
                            <div>
                              <p className="font-medium">Recommended GPUs</p>
                              <p>{recommendations.join(', ') || 'N/A'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mt-2">
                            Size information not available for this model.
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No models found in this bucket.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Models;
