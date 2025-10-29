import React, { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_REGIONS } from '@/app/config/regions';
import { Project, Tooltip } from '../general/general.component';

import { SUGGESTED_MODELS } from '@/app/config/suggested-models';

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
    manifest?: any;
}

interface DownloadProgress {
    message?: string;
    file?: string;
    progress?: number;
    total?: number;
    error?: string;
    files?: { name: string; total: number; downloaded: number }[];
    totalProgress?: number;
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

const ValidationSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CheckIcon = () => (
    <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const ErrorIcon = () => (
     <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const GreenCheckIcon = () => (
    <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const RedXIcon = () => (
    <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const Models = ({ selectedProject, onSwitchToServices }: { selectedProject: Project | null, onSwitchToServices: (serviceName: string, region: string) => void }) => {
  const [viewMode, setViewMode] = useState<'list' | 'import' | 'deploy'>('list');
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployingModel, setDeployingModel] = useState<{model: Model, bucket: Bucket} | null>(null);

  const cacheKey = selectedProject ? `llm_manager_models_cache_${selectedProject.projectId}` : null;

  const fetchBuckets = useCallback(async (isForcedRefresh = false) => {
    if (!selectedProject || !cacheKey) return;

    setIsRefreshing(true);
    // On initial load, check for cache. If it exists, the main loader is turned off.
    if (!isForcedRefresh) {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            setBuckets(JSON.parse(cachedData));
            setIsLoading(false);
        }
    }
    
    setError(null);

    try {
      const response = await fetch(`/api/models/buckets?projectId=${selectedProject.projectId}`);
      if (!response.ok) throw new Error('Failed to fetch buckets.');
      const data = await response.json();
      
      const cachedData = localStorage.getItem(cacheKey);
      if (JSON.stringify(data) !== cachedData) {
        setBuckets(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedProject, cacheKey]);

  const invalidateCacheAndRefresh = useCallback(() => {
    if (cacheKey) {
        localStorage.removeItem(cacheKey);
    }
    fetchBuckets(true);
  }, [cacheKey, fetchBuckets]);

  useEffect(() => {
    if (viewMode === 'list' && selectedProject) {
      fetchBuckets(false); // Initial fetch
    }
  }, [selectedProject, viewMode, fetchBuckets]);

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
          invalidateCacheAndRefresh();
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
      isRefreshing={isRefreshing}
      onRefresh={() => fetchBuckets(true)}
    />
  );
};

const ImportModelView = ({ project, onClose, onImportSuccess }: { project: Project, onClose: () => void, onImportSuccess: () => void }) => {
    const [step, setStep] = useState(1);
    const [projectBuckets, setProjectBuckets] = useState<{name: string, location: string}[]>([]);
    const [isLoadingBuckets, setIsLoadingBuckets] = useState(true);
    const [targetBucket, setTargetBucket] = useState('');
    
    const [showCreateBucketForm, setShowCreateBucketForm] = useState(false);
    const [isCreatingBucket, setIsCreatingBucket] = useState(false);
    const [createBucketError, setCreateBucketError] = useState<string | null>(null);
    const [newBucketName, setNewBucketName] = useState(`${project.projectId}-llm-models`);
    const [newBucketRegion, setNewBucketRegion] = useState(SUPPORTED_REGIONS[0]?.name || '');
    const [bucketRegionError, setBucketRegionError] = useState<string | null>(null);
    const [bucketSelectionWarning, setBucketSelectionWarning] = useState<string | null>(null);

    const [modelSource, setModelSource] = useState('ollama');
    const [modelId, setModelId] = useState('');
    const [hfToken, setHfToken] = useState('');

    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [modelExists, setModelExists] = useState<boolean | null>(null);
    const [preflightInfo, setPreflightInfo] = useState<PreflightInfo | null>(null);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

    const [estimatedVram, setEstimatedVram] = useState<number | null>(null);
    const [recommendedGpus, setRecommendedGpus] = useState<string[]>([]);

    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({ files: [], totalProgress: 0 });
    const [downloadError, setDownloadError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEnv = async () => {
            try {
                const response = await fetch('/api/project/env');
                if (response.ok) {
                    const data = await response.json();
                    if (data.hfToken) {
                        setHfToken(data.hfToken);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch env vars", e);
            }
        };
        fetchEnv();
    }, []);

    useEffect(() => {
        const fetchProjectBuckets = async () => {
            setIsLoadingBuckets(true);
            try {
                const response = await fetch(`/api/gcs/buckets?projectId=${project.projectId}`);
                if (response.ok) {
                    const data = await response.json();
                    setProjectBuckets(data);
                    if (data.length === 0) {
                        setShowCreateBucketForm(true);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch buckets", e);
            } finally {
                setIsLoadingBuckets(false);
            }
        };
        fetchProjectBuckets();
    }, [project.projectId]);

    useEffect(() => {
        const selectedBucket = projectBuckets.find(b => b.name === targetBucket);
        if (selectedBucket) {
            setBucketSelectionWarning(null); // Clear warning once a bucket is selected
            const regionConfig = SUPPORTED_REGIONS.find(r => r.name === selectedBucket.location.toLowerCase());
            if (!regionConfig || regionConfig.gpus.length === 0) {
                setBucketRegionError(`The selected bucket is in ${selectedBucket.location.toLowerCase()}, which does not support GPUs. Please select a different bucket or create one in a supported region.`);
            } else {
                setBucketRegionError(null);
            }
        }
    }, [targetBucket, projectBuckets]);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (!modelId) {
                setIsValidating(false);
                setValidationError(null);
                setModelExists(null);
                setPreflightInfo(null);
                setStep(1); // Go back to the initial step if input is cleared
                return;
            }

            if (!targetBucket) {
                setBucketSelectionWarning('Please select a target bucket before choosing a model.');
                return;
            }
            setBucketSelectionWarning(null);

            setIsValidating(true);
            setValidationError(null);
            setModelExists(null);
            setPreflightInfo(null);
            
            const url = modelSource === 'huggingface' 
                ? '/api/models/import/preflight' 
                : '/api/models/import/ollama/preflight';
            
            const body = modelSource === 'huggingface'
                ? { modelId, hfToken }
                : { modelId };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Model not found.');
                } 
                setModelExists(true);
                setPreflightInfo(data);

                // --- Start VRAM Calculation ---
                const selectedBucket = projectBuckets.find(b => b.name === targetBucket);
                if (selectedBucket) {
                    const regionConfig = SUPPORTED_REGIONS.find(r => r.name === selectedBucket.location.toLowerCase());
                    const vram = (data.totalSize / (1024 * 1024 * 1024)) * 1.2;
                    setEstimatedVram(vram);

                    if (regionConfig) {
                        const recommendations = regionConfig.gpus
                            .filter(gpu => gpu.vram_gb >= vram)
                            .map(gpu => gpu.name);
                        setRecommendedGpus(recommendations);
                    }
                }
                // --- End VRAM Calculation ---

                setStep(3); // Automatically advance to confirmation
            } catch (err: any) {
                setModelExists(false);
                setValidationError(err.message);
                setStep(1); // Go back to input step on error
            } finally {
                setIsValidating(false);
            }
        }, 300); // 300ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [modelId, modelSource, hfToken, targetBucket, projectBuckets]);

    const handleCreateBucket = async () => {
        setIsCreatingBucket(true);
        setCreateBucketError(null);
        try {
            const response = await fetch('/api/models/buckets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bucketName: newBucketName,
                    location: newBucketRegion,
                    projectId: project.projectId,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create bucket.');
            }
            const newBucket = { name: data.name, location: data.location };
            setProjectBuckets(prev => [...prev, newBucket]);
            setTargetBucket(newBucket.name);
            setShowCreateBucketForm(false);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setCreateBucketError(errorMessage);
        } finally {
            setIsCreatingBucket(false);
        }
    };
    
    const handleDownloadConfirmation = () => {
        if (recommendedGpus.length === 0 && estimatedVram) {
            const message = `This model requires an estimated ${estimatedVram.toFixed(2)} GB of vRAM, but no GPUs in the selected region meet this requirement. Proceeding with the download may not lead to a successful deployment. Are you sure you want to continue?`;
            if (window.confirm(message)) {
                handleStartDownload();
            }
        } else {
            handleStartDownload();
        }
    };

    const handleStartDownload = async () => {
        setIsDownloading(true);
        setDownloadError(null);
        setDownloadProgress({
            message: 'Starting download...', 
            files: preflightInfo!.files.map(f => ({ name: f.name, total: f.size, downloaded: 0 })),
            totalProgress: 0,
        });
        setStep(4);

        const url = modelSource === 'huggingface'
            ? '/api/models/import/start'
            : '/api/models/import/ollama/start';

        const body = modelSource === 'huggingface'
            ? {
                modelId,
                bucketName: targetBucket,
                hfToken,
                projectId: project.projectId,
                totalSize: preflightInfo?.totalSize,
                files: preflightInfo?.files,
                }
            : {
                modelId,
                bucketName: targetBucket,
                projectId: project.projectId,
                totalSize: preflightInfo?.totalSize,
                files: preflightInfo?.files,
                manifest: preflightInfo?.manifest, // Pass manifest for Ollama
                };
        
        const verifyDownload = async (retryCount = 0): Promise<void> => {
            setDownloadProgress(prev => ({ ...prev, message: `Verifying download (attempt ${retryCount + 1})...` }));
            try {
                const verifyResponse = await fetch(`/api/models/import/verify?projectId=${project.projectId}&bucketName=${targetBucket}&modelId=${modelId}`);
                const verifyData = await verifyResponse.json();

                if (verifyResponse.ok && verifyData.verified) {
                    setDownloadProgress(prev => ({ ...prev, message: 'Verification successful! Import complete.' }));
                    setTimeout(onImportSuccess, 2000);
                    setIsDownloading(false);
                } else {
                    throw new Error(verifyData.error || 'Verification failed.');
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                console.error(`Verification attempt ${retryCount + 1} failed:`, err);
                if (retryCount < 2) { // 3 retries total (0, 1, 2)
                    setTimeout(() => verifyDownload(retryCount + 1), 3000); // Wait 3 seconds before retrying
                } else {
                    setDownloadError(`Download completed, but verification failed after 3 attempts. Please check the bucket and try importing again. Error: ${errorMessage}`);
                    setIsDownloading(false);
                }
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.body) throw new Error('Download failed: No response body.');

            let buffer = '';            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            setDownloadProgress(prev => ({ ...prev, message: 'Download stream complete. Starting verification...' }));
            await verifyDownload();
            break;
        }
        
        buffer += value;
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
            const message = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);
            if (message.startsWith('data: ')) {
                try {
                    const json = JSON.parse(message.substring(6));
                    if (json.error) {
                        console.error("Download error from server:", json.error);
                        setDownloadError(json.error);
                        setIsDownloading(false);
                        return;
                    }
                    
                    setDownloadProgress(prev => {
                        const newFiles = prev.files?.map(f => {
                            if (f.name === json.file) {
                                return { ...f, downloaded: json.progress };
                            }
                            return f;
                        }) || [];

                        const totalDownloaded = newFiles.reduce((acc, f) => acc + f.downloaded, 0);
                        const totalSize = newFiles.reduce((acc, f) => acc + f.total, 0);
                        const totalProgress = totalSize > 0 ? (totalDownloaded / totalSize) * 100 : 0;

                        return {
                            ...prev,
                            message: json.message || prev.message,
                            files: newFiles,
                            totalProgress: totalProgress,
                        };
                    });

                } catch (e) {
                    console.error("Failed to parse SSE chunk", message, e);
                }
            }
            boundary = buffer.indexOf('\n\n');
        }
    }
} catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error("Download initiation failed:", err);
    setDownloadError(errorMessage);
    setIsDownloading(false);
}
};

    return (
        <div className="p-6 bg-gray-50 flex-grow">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center pb-4 mb-6">
                    <div>
                        <button onClick={onClose} className="text-sm font-medium text-blue-600 hover:underline mb-2">← Back to Models</button>
                        <h1 className="text-xl font-medium text-gray-800">Import Model</h1>
                    </div>
                </div>

                <div className="space-y-8 bg-white border border-gray-200 rounded-md p-6">
                    {/* Target Bucket */}
                    <div className="border-b border-gray-200 pb-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Target Bucket</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select an existing bucket</label>
                                {isLoadingBuckets ? <p className="mt-1 text-sm text-gray-500">Loading buckets...</p> :
                                    <select value={targetBucket} onChange={e => setTargetBucket(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                        <option value="" disabled hidden>Select a bucket...</option>
                                        {projectBuckets.length === 0 && <option disabled>No buckets found</option>}
                                        {projectBuckets.map(b => <option key={b.name} value={b.name}>{b.name} ({b.location.toLowerCase()})</option>)}
                                    </select>
                                }
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Or create a new one</label>
                                <button onClick={() => setShowCreateBucketForm(prev => !prev)} className="mt-1 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                    {showCreateBucketForm ? 'Cancel' : 'Create New Bucket'}
                                </button>
                            </div>
                        </div>
                        {bucketRegionError && <p className="text-red-500 text-sm mt-2">{bucketRegionError}</p>}

                        {showCreateBucketForm && (
                            <div className="mt-6 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Bucket Name</label>
                                        <input type="text" value={newBucketName} onChange={e => setNewBucketName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Region</label>
                                        <select value={newBucketRegion} onChange={e => setNewBucketRegion(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                            {SUPPORTED_REGIONS.filter(r => r.gpus.length > 0).map(r => <option key={r.name} value={r.name}>{r.description} ({r.name})</option>)}
                                        </select>
                                    </div>
                                </div>
                                {createBucketError && <p className="text-red-500 text-sm">{createBucketError}</p>}
                                <div className="flex justify-end">
                                    <button onClick={handleCreateBucket} disabled={isCreatingBucket || !newBucketName} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center">
                                        {isCreatingBucket && <Spinner />}
                                        Create Bucket
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Model Source */}
                    <div className="border-b border-gray-200 pb-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Model Source</h2>
                        {bucketSelectionWarning && <p className="text-yellow-600 text-sm mb-4">{bucketSelectionWarning}</p>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <button
                                type="button"
                                onClick={() => { setModelSource('ollama'); setModelId(''); }}
                                className={`p-4 border rounded-md text-left transition-colors ${modelSource === 'ollama' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                            >
                                <h3 className="font-medium text-gray-800">Ollama</h3>
                                <p className="text-xs text-gray-600 mt-1">Fast cold start and fast single-user performance.</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setModelSource('huggingface'); setModelId(''); }}
                                className={`p-4 border rounded-md text-left transition-colors ${modelSource === 'huggingface' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                            >
                                <h3 className="font-medium text-gray-800">Hugging Face (vLLM)</h3>
                                <p className="text-xs text-gray-600 mt-1">Slower cold starts, but better performance for high-traffic use cases.</p>
                            </button>
                        </div>

                        {modelSource === 'ollama' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Model ID</label>
                                <div className="relative">
                                    <input type="text" value={modelId} onChange={e => setModelId(e.target.value)} placeholder="e.g., gemma3:4b" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        {isValidating && <ValidationSpinner />}
                                        {modelExists === true && <CheckIcon />}
                                        {modelExists === false && validationError && <ErrorIcon />}
                                    </div>
                                </div>
                                {validationError && <p className="text-red-500 text-sm mt-1">{validationError}</p>}
                            </div>
                        )}

                        {modelSource === 'huggingface' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Model ID</label>
                                    <div className="relative">
                                        <input type="text" value={modelId} onChange={e => setModelId(e.target.value)} placeholder="e.g., google/gemma-3-4b-it" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            {isValidating && <ValidationSpinner />}
                                            {modelExists === true && <CheckIcon />}
                                            {modelExists === false && validationError && <ErrorIcon />}
                                        </div>
                                    </div>
                                    {validationError && <p className="text-red-500 text-sm mt-1">{validationError}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Hugging Face Token (optional)</label>
                                    <input type="text" value={hfToken} onChange={e => setHfToken(e.target.value)} placeholder="hf_..." className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                    <p className="text-xs text-gray-500 mt-1">Required for gated models like Llama 3.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Suggested Models */}
                    <div className="border-b border-gray-200 pb-6">
                        <button onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)} className="w-full text-left">
                            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                                <svg className={`w-5 h-5 mr-2 transform transition-transform ${isSuggestionsOpen ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                Suggested Models
                            </h2>
                        </button>
                        {isSuggestionsOpen && (
                            <div>
                                <div className="overflow-x-auto border border-gray-200 rounded-md">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-2 font-medium text-gray-600">Name</th>
                                                <th className="p-2 font-medium text-gray-600">Size</th>
                                                <th className="p-2 font-medium text-gray-600">Description</th>
                                                <th className="p-2 font-medium text-gray-600">GPU</th>
                                                <th className="p-2 font-medium text-gray-600"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {SUGGESTED_MODELS.map((model) => {
                                                const idToUse = modelSource === 'ollama' ? model.ollamaId : model.hfId;
                                                return (
                                                    <tr key={model.name} className="border-b last:border-b-0 hover:bg-gray-50">
                                                        <td className="p-2 font-medium text-gray-800">{model.name}</td>
                                                        <td className="p-2 text-gray-700">{model.size}</td>
                                                        <td className="p-2 text-gray-700">{model.description}</td>
                                                        <td className="p-2 text-gray-700">{model.gpu}</td>
                                                        <td className="p-2 text-right">
                                                            <button 
                                                                onClick={() => {
                                                                    setModelId(idToUse || '');
                                                                    setIsSuggestionsOpen(false);
                                                                }}
                                                                disabled={!idToUse}
                                                                className="text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 px-2 py-1 disabled:bg-gray-300"
                                                            >
                                                                Use
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="text-sm mt-4">
                                    <a 
                                        href={modelSource === 'ollama' ? "https://ollama.com/library" : "https://huggingface.co/models?pipeline_tag=text-generation&sort=trending"} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Explore more {modelSource === 'ollama' ? 'Ollama' : 'Hugging Face'} models →
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {step >= 3 && preflightInfo && (
                        <div className="border-b border-gray-200 pb-6">
                            <h2 className="text-base font-semibold text-gray-800 mb-4">Confirmation</h2>
                            <div className="p-4 bg-gray-50 rounded-md border border-gray-200 text-sm space-y-2">
                                <p className="font-medium">Model: <span className="font-normal text-gray-700">{modelId}</span></p>
                                <p className="font-medium">Total Size: <span className="font-normal text-gray-700">{formatBytes(preflightInfo.totalSize)}</span></p>
                                <p className="font-medium">Est. vRAM Required: <span className="font-normal text-gray-700">~{estimatedVram?.toFixed(2)} GB</span></p>
                                <div>
                                    <p className="font-medium">Compatible GPUs in {projectBuckets.find(b => b.name === targetBucket)?.location.toLowerCase()}:</p>
                                    <ul className="list-disc list-inside pl-2 mt-1 space-y-1">
                                        {SUPPORTED_REGIONS.find(r => r.name === projectBuckets.find(b => b.name === targetBucket)?.location.toLowerCase())?.gpus.map(gpu => (
                                            <li key={gpu.name} className="flex items-center">
                                                {gpu.vram_gb >= (estimatedVram || 0) ? <GreenCheckIcon /> : <RedXIcon />}
                                                <span className="ml-2 text-gray-700">{gpu.name} ({gpu.vram_gb} GB)</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {recommendedGpus.length === 0 && (
                                    <p className="text-yellow-600 font-medium pt-2">Warning: This model may not be deployable in the selected region as no available GPUs meet the estimated vRAM requirement.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            <h2 className="text-base font-semibold text-gray-800 mb-4">Download Progress</h2>
                            <div className="space-y-4">
                                {downloadError && <p className="text-red-500">{downloadError}</p>}
                                
                                <div>
                                    <p className="font-medium text-sm">Overall Progress: {downloadProgress.totalProgress?.toFixed(2) ?? 0}%</p>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${downloadProgress.totalProgress ?? 0}%` }}></div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t">
                                    {downloadProgress.files?.map(file => (
                                        <div key={file.name}>
                                            <p className="font-mono text-xs">{file.name}</p>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${(file.downloaded / file.total) * 100}%` }}></div>
                                            </div>
                                            <p className="text-xs text-gray-600">{formatBytes(file.downloaded)} / {formatBytes(file.total)}</p>
                                        </div>
                                    ))}
                                </div>
                                {downloadProgress.message && <p className="text-sm text-gray-600 italic mt-2">{downloadProgress.message}</p>}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        {step === 3 && (
                            <button onClick={handleDownloadConfirmation} disabled={isDownloading || !targetBucket} className={`px-6 py-2 font-medium text-white rounded-md flex items-center ${recommendedGpus.length === 0 ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`}>
                                {isDownloading && <Spinner />}
                                {recommendedGpus.length > 0 ? 'Start Download' : 'Continue Anyway'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DeployServiceView = ({ project, model, bucket, onClose, onDeploymentStart }: { project: Project, model: Model, bucket: Bucket, onClose: () => void, onDeploymentStart: (serviceName: string, region: string) => void }) => {
    const [serviceName, setServiceName] = useState('');
    const [serviceNameError, setServiceNameError] = useState<string | null>(null);
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [containerImage, setContainerImage] = useState('');
    const [containerPort, setContainerPort] = useState('');
    
    const [cpu, setCpu] = useState('8');
    const [memory, setMemory] = useState('16Gi');
    
    const regionConfig = SUPPORTED_REGIONS.find(r => r.name === bucket.location.toLowerCase());
    const [gpu, setGpu] = useState(regionConfig?.gpus[0]?.accelerator || '');
    const [vramWarning, setVramWarning] = useState<string | null>(null);

    useEffect(() => {
        const selectedGpuConfig = regionConfig?.gpus.find(g => g.accelerator === gpu);
        if (selectedGpuConfig) {
            setCpu(selectedGpuConfig.validCpus[0]);
            setMemory(selectedGpuConfig.validMemory[0]);
        }

        if (selectedGpuConfig && model.size) {
            const estimatedVram = (model.size / (1024 * 1024 * 1024)) * 1.2;
            if (selectedGpuConfig.vram_gb < estimatedVram) {
                setVramWarning(`Warning: This model requires an estimated ~${estimatedVram.toFixed(2)} GB of vRAM, but the selected ${selectedGpuConfig.name} only has ${selectedGpuConfig.vram_gb} GB. Deployment may fail or the model may not run correctly.`);
            } else {
                setVramWarning(null);
            }
        }

    }, [gpu, regionConfig?.gpus, model.size]);

    const [gpuZonalRedundancyDisabled, setGpuZonalRedundancyDisabled] = useState(true);
    
    const [args, setArgs] = useState<{id: number, key: string, value: string}[]>([]);
    const [envVars, setEnvVars] = useState<{id: number, key: string, value: string}[]>([]);

    const [minInstances, setMinInstances] = useState(0);
    const [maxInstances, setMaxInstances] = useState(1);

    const [useVpc, setUseVpc] = useState(true);
    const [subnets, setSubnets] = useState<{name: string, privateIpGoogleAccess: boolean}[]>([]);
    const [selectedSubnet, setSelectedSubnet] = useState('');
    const [isSubnetPgaEnabled, setIsSubnetPgaEnabled] = useState(true);
    const [isLoadingSubnets, setIsLoadingSubnets] = useState(true);
    
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployError, setDeployError] = useState<string | null>(null);
    const [deployProgress, setDeployProgress] = useState<({ message?: string; error?: string } | { creationStarted?: boolean; serviceName?: string; region?: string })[]>([]);

    useEffect(() => {
        const fetchNetworkingInfo = async () => {
            if (!project) return;
            setIsLoadingSubnets(true);
            try {
                const response = await fetch(`/api/project/networking?projectId=${project.projectId}`);
                if (response.ok) {
                    const data = await response.json();
                    const regionData = data.find((r: any) => r.region === bucket.location.toLowerCase());
                    if (regionData && regionData.subnets.length > 0) {
                        setSubnets(regionData.subnets);
                        // Try to select 'default' subnet if it exists, otherwise the first one
                        const defaultSubnet = regionData.subnets.find((s: any) => s.name === 'default');
                        const initialSubnetName = defaultSubnet ? defaultSubnet.name : regionData.subnets[0].name;
                        setSelectedSubnet(initialSubnetName);
                        setIsSubnetPgaEnabled(
                            (defaultSubnet || regionData.subnets[0]).privateIpGoogleAccess
                        );
                    } else {
                        setSubnets([]);
                        setUseVpc(false); // No subnets, so disable VPC
                    }
                }
            } catch (error) {
                console.error("Failed to fetch networking info", error);
                setUseVpc(false); // On error, disable VPC
            } finally {
                setIsLoadingSubnets(false);
            }
        };
        fetchNetworkingInfo();
    }, [project, bucket.location]);

    useEffect(() => {
        // When the selected subnet changes, update the PGA status
        const currentSubnet = subnets.find(s => s.name === selectedSubnet);
        if (currentSubnet) {
            setIsSubnetPgaEnabled(currentSubnet.privateIpGoogleAccess);
        }
    }, [selectedSubnet, subnets]);

    useEffect(() => {
        if (model.source === 'ollama') {
            setServiceName(`ollama-${model.id.replace(/[^a-zA-Z0-9]/g, '-')}`);
            setContainerImage('ollama/ollama');
            setContainerPort('11434');
            setArgs([]);
            setEnvVars([
                { id: 1, key: 'OLLAMA_MODELS', value: `/gcs/${bucket.name}/ollama` },
                { id: 2, key: 'OLLAMA_DEBUG', value: 'false' },
                { id: 3, key: 'OLLAMA_KEEP_ALIVE', value: '-1' },
                { id: 4, key: 'MODEL', value: model.id },
            ]);
        } else { // Default to vLLM for huggingface
            setServiceName(`vllm-${model.id.replace(/[^a-zA-Z0-9]/g, '-')}`);
            setContainerImage('vllm/vllm-openai');
            setContainerPort('8000');
            setArgs([
                { id: 1, key: '--model', value: `/gcs/${bucket.name}/${model.id}` },
                { id: 2, key: '--tensor-parallel-size', value: '1' },
                { id: 3, key: '--port', value: '8000' },
                { id: 4, key: '--gpu-memory-utilization', value: '0.80' },
                { id: 5, key: '--max-num-seqs', value: '128' },
            ]);
            setEnvVars([
                { id: 1, key: 'HF_HUB_OFFLINE', value: '1' },
            ]);
        }
    }, [selectedSubnet, subnets]);

    const handleEnablePga = async () => {
        if (!project || !selectedSubnet) return;
        
        try {
            const response = await fetch('/api/project/networking/subnet/enable-pga', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.projectId,
                    region: bucket.location.toLowerCase(),
                    subnetName: selectedSubnet,
                }),
            });

            if (!response.ok) throw new Error('Failed to enable PGA.');

            // Optimistically update UI
            setIsSubnetPgaEnabled(true);
            setSubnets(subnets.map(s => s.name === selectedSubnet ? { ...s, privateIpGoogleAccess: true } : s));

        } catch (error) {
            console.error("Failed to enable PGA", error);
            setDeployError('Failed to enable Private Google Access. Please try again.');
        }
    };

    useEffect(() => {
        if (model.source === 'ollama') {
            setServiceName(`ollama-${model.id.replace(/[^a-zA-Z0-9]/g, '-')}`);
            setContainerImage('ollama/ollama');
            setContainerPort('11434');
            setArgs([]);
            setEnvVars([
                { id: 1, key: 'OLLAMA_MODELS', value: `/gcs/${bucket.name}/ollama` },
                { id: 2, key: 'OLLAMA_DEBUG', value: 'false' },
                { id: 3, key: 'OLLAMA_KEEP_ALIVE', value: '-1' },
                { id: 4, key: 'MODEL', value: model.id },
            ]);
        } else { // Default to vLLM for huggingface
            setServiceName(`vllm-${model.id.replace(/[^a-zA-Z0-9]/g, '-')}`);
            setContainerImage('vllm/vllm-openai');
            setContainerPort('8000');
            setArgs([
                { id: 1, key: '--model', value: `/gcs/${bucket.name}/${model.id}` },
                { id: 2, key: '--tensor-parallel-size', value: '1' },
                { id: 3, key: '--port', value: '8000' },
                { id: 4, key: '--gpu-memory-utilization', value: '0.80' },
                { id: 5, key: '--max-num-seqs', value: '128' },
            ]);
            setEnvVars([
                { id: 1, key: 'HF_HUB_OFFLINE', value: '1' },
            ]);
        }
    }, [model, bucket.name]);

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
                const response = await fetch(`/api/services/exists?projectId=${project.projectId}&region=${bucket.location.toLowerCase()}&serviceName=${serviceName}`);
                const data = await response.json();
                if (data.exists) {
                    setServiceNameError(`Service "${serviceName}" already exists in ${bucket.location}.`);
                }
            } catch {
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
                    useVpc,
                    subnet: selectedSubnet,
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
                            setTimeout(() => {
                                onDeploymentStart(json.serviceName, json.region);
                            }, 5000); // Wait 5 seconds before redirecting
                            reader.cancel();
                            return;
                        }

                        setDeployProgress(prev => [...prev, json]);
                    } catch {
                        console.error("Failed to parse SSE chunk", value);
                    }
                }
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setDeployError(errorMessage);
            setDeployProgress(prev => [...prev, { error: errorMessage }]);
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 flex-grow">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center pb-4 mb-6">
                    <div>
                        <button onClick={onClose} className="text-sm font-medium text-blue-600 hover:underline mb-2">← Back to Models</button>
                        <h1 className="text-xl font-medium text-gray-800">Deploy Model: {model.id}</h1>
                    </div>
                </div>

                <div className="space-y-8 bg-white border border-gray-200 rounded-md p-6">
                    {/* Service Details */}
                    <div className="border-b border-gray-200 pb-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Service Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Service Name</label>
                                <input type="text" value={serviceName} onChange={e => setServiceName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                {isCheckingName && <p className="text-sm text-gray-500 mt-1">Checking name...</p>}
                                {serviceNameError && <p className="text-sm text-red-600 mt-1">{serviceNameError}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Region</label>
                                <p className="mt-1 text-sm text-gray-800 pt-2">{bucket.location.toLowerCase()} (locked to model&apos;s region)</p>
                            </div>
                        </div>
                    </div>

                    {/* Container */}
                    <div className="border-b border-gray-200 pb-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Container</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    {/* Resources & Scaling */}
                    <div className="border-b border-gray-200 pb-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Resources & Scaling</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">GPU</label>
                                <select value={gpu} onChange={e => setGpu(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    {regionConfig?.gpus.map(g => (
                                        <option key={g.name} value={g.accelerator}>
                                            {g.name} ({g.status})
                                        </option>
                                    ))}
                                </select>
                                {vramWarning && <p className="text-sm text-yellow-600 mt-2">{vramWarning}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">vCPUs</label>
                                <select value={cpu} onChange={e => setCpu(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    {regionConfig?.gpus.find(g => g.accelerator === gpu)?.validCpus.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Memory</label>
                                <select value={memory} onChange={e => setMemory(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    {regionConfig?.gpus.find(g => g.accelerator === gpu)?.validMemory.map(m => <option key={m} value={m}>{m.replace('Gi', ' GB')}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Min Instances</label>
                                <input type="number" value={minInstances} onChange={e => setMinInstances(parseInt(e.target.value, 10))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Max Instances</label>
                                <input type="number" value={maxInstances} onChange={e => setMaxInstances(parseInt(e.target.value, 10))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                        </div>
                         <div className="mt-4">
                            <label className="flex items-center">
                                <input type="checkbox" checked={gpuZonalRedundancyDisabled} onChange={e => setGpuZonalRedundancyDisabled(e.target.checked)} className="form-checkbox" />
                                <span className="ml-2 text-sm text-gray-700">Disable GPU zonal redundancy (cost saving)</span>
                            </label>
                        </div>
                    </div>

                                        {/* VPC Networking */}
                                        <div className="border-b border-gray-200 pb-6">
                                            <h2 className="text-base font-semibold text-gray-800 mb-4">Networking</h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="flex items-center">
                                                        <input type="checkbox" checked={useVpc} onChange={e => setUseVpc(e.target.checked)} className="form-checkbox" />
                                                        <span className="ml-2 text-sm text-gray-700">Connect to VPC for faster model loading</span>
                                                    </label>
                                                    {useVpc && (
                                                        isLoadingSubnets ? <p className="text-sm text-gray-500 mt-2">Loading subnets...</p> : 
                                                        subnets.length > 0 ? (
                                                            <div className="mt-2">
                                                                <label className="block text-sm font-medium text-gray-700">Subnetwork</label>
                                                                <select value={selectedSubnet} onChange={e => setSelectedSubnet(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                                                    {subnets.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                                                </select>
                                                                {!isSubnetPgaEnabled && (
                                                                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 flex items-center justify-between">
                                                                        <span>Private Google Access is required.</span>
                                                                        <button onClick={handleEnablePga} className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Enable</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500 mt-2">No VPC subnets found in {bucket.location.toLowerCase()}.</p>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                    
                                        {/* Volume Mount */}
                                        <div className="border-b border-gray-200 pb-6">
                                            <h2 className="text-base font-semibold text-gray-800 mb-4">Storage</h2>
                                             <div>
                                                <label className="block text-sm font-medium text-gray-700">Volume Mount</label>
                                                <p className="font-mono text-sm text-gray-600 mt-2 p-2 border border-gray-200 bg-gray-50 rounded-md">{`/gcs/${bucket.name}`}</p>
                                            </div>
                                        </div>
                    
                                        {/* Container Arguments */}
                                        <div className="border-b border-gray-200 pb-6">
                                            <h2 className="text-base font-semibold text-gray-800 mb-4">Container Arguments</h2>
                                            <div className="space-y-2">
                                                {args.map(arg => (
                                                    <div key={arg.id} className="flex items-center space-x-2">
                                                        <input type="text" value={arg.key} onChange={e => handleArgChange(arg.id, 'key', e.target.value)} className="w-1/3 p-1 border border-gray-300 rounded-md text-sm" readOnly={arg.key === '--model'} />
                                                        <input type="text" value={arg.value} onChange={e => handleArgChange(arg.id, 'value', e.target.value)} className="flex-1 p-1 border border-gray-300 rounded-md text-sm" readOnly={arg.key === '--model'} />
                                                        <button onClick={() => removeArg(arg.id)} disabled={arg.key === '--model'} className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-xs">Remove</button>
                                                    </div>
                                                ))}
                                                <button onClick={addArg} className="text-sm text-blue-600 hover:underline pt-2">Add Argument</button>
                                            </div>
                                        </div>
                    
                                        {/* Environment Variables */}
                                        <div>
                                            <h2 className="text-base font-semibold text-gray-800 mb-4">Environment Variables</h2>
                                            <div className="space-y-2">
                                                {envVars.map(env => (
                                                    <div key={env.id} className="flex items-center space-x-2">
                                                        <input type="text" value={env.key} onChange={e => handleEnvVarChange(env.id, 'key', e.target.value)} className="w-1/3 p-1 border border-gray-300 rounded-md text-sm" />
                                                        <input type="text" value={env.value} onChange={e => handleEnvVarChange(env.id, 'value', e.target.value)} className="flex-1 p-1 border border-gray-300 rounded-md text-sm" />
                                                        <button onClick={() => removeEnvVar(env.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                                                    </div>
                                                ))}
                                                <button onClick={addEnvVar} className="text-sm text-blue-600 hover:underline pt-2">Add Variable</button>
                                            </div>
                                        </div>
                                        
                                        {deployError && <p className="text-red-500 mt-4">{deployError}</p>}
                    
                    {deployProgress.length > 0 && (
                        <div className="mt-6">
                             <h2 className="text-base font-semibold text-gray-800 mb-4">Deployment Progress</h2>
                            <div className="p-4 font-mono text-xs h-64 overflow-y-auto bg-gray-900 text-white rounded-b-md">
                                {deployProgress.map((p, i) => <p key={i}>{'message' in p ? p.message : 'error' in p ? p.error : JSON.stringify(p)}</p>)}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-8">
                        <button onClick={handleDeploy} disabled={isDeploying || !!serviceNameError || isCheckingName} className="px-6 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center">
                            {isDeploying && <Spinner />}
                            Deploy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RefreshIcon = ({ isRefreshing }: { isRefreshing: boolean }) => (
    <svg
        fill="currentColor"
        width="20px"
        height="20px"
        viewBox="0 0 24 24"
        xmlns="http://www.w.org/2000/svg"
        className={isRefreshing ? 'animate-spin' : ''}
    >
        <path d="M10 11H7.101l.001-.009a4.956 4.956 0 0 1 .752-1.787 5.054 5.054 0 0 1 2.2-1.811c.302-.128.617-.226.938-.291a5.078 5.078 0 0 1 2.018 0 4.978 4.978 0 0 1 2.525 1.361l1.416-1.412a7.036 7.036 0 0 0-2.224-1.501 6.921 6.921 0 0 0-1.315-.408 7.079 7.079 0 0 0-2.819 0 6.94 6.94 0 0 0-1.316.409 7.04 7.04 0 0 0-3.08 2.534 6.978 6.978 0 0 0-1.054 2.505c-.028.135-.043.273-.063.41H2l4 4 4-4zm4 2h2.899l-.001.008a4.976 4.976 0 0 1-2.103 3.138 4.943 4.943 0 0 1-1.787.752 5.073 5.073 0 0 1-2.017 0 4.956 4.956 0 0 1-1.787-.752 5.072 5.072 0 0 1-.74-.61L7.05 16.95a7.032 7.032 0 0 0 2.225 1.5c.424.18.867.317 1.315.408a7.07 7.07 0 0 0 2.818 0 7.031 7.031 0 0 0 4.395-2.945 6.974 6.974 0 0 0 1.053-2.503c.027-.135.043-.273.063-.41H22l-4-4-4 4z"/>
    </svg>
);

const ModelsList = ({ selectedProject, buckets, isLoading, error, onImportClick, onDeployClick, isRefreshing, onRefresh }: { selectedProject: Project | null, buckets: Bucket[], isLoading: boolean, error: string | null, onImportClick: () => void, onDeployClick: (model: Model, bucket: Bucket) => void, isRefreshing: boolean, onRefresh: () => void }) => {

  const allModels = buckets.flatMap(bucket => 
    bucket.models.map(model => ({
      ...model,
      bucketName: bucket.name,
      bucketLocation: bucket.location,
      originalBucket: bucket, // Keep a reference to the original bucket object
    }))
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
        <div className="flex items-center space-x-2">
            <h1 className="text-xl font-medium text-gray-800">Models</h1>
            <Tooltip text="Refresh models list">
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing || !selectedProject}
                    className="p-1 rounded-full text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
                >
                    <RefreshIcon isRefreshing={isRefreshing} />
                </button>
            </Tooltip>
        </div>
        <button
          onClick={onImportClick}
          disabled={!selectedProject}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
          Import Model
        </button>
      </div>

      {isLoading && <p>Loading models...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {!isLoading && !error && allModels.length === 0 && (
        <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No Models Found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by importing a new model.</p>
        </div>
      )}

      {!isLoading && !error && allModels.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3 font-medium text-gray-600">Model ID</th>
                <th className="p-3 font-medium text-gray-600">Source</th>
                <th className="p-3 font-medium text-gray-600">Bucket</th>
                <th className="p-3 font-medium text-gray-600">Region</th>
                <th className="p-3 font-medium text-gray-600">Size</th>
                <th className="p-3 font-medium text-gray-600">Est. vRAM</th>
                <th className="p-3 font-medium text-gray-600">Recommended GPUs</th>
                <th className="p-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {allModels.map((model) => {
                const regionConfig = SUPPORTED_REGIONS.find(r => r.name === model.bucketLocation.toLowerCase());
                const estimatedVramGb = model.size ? (model.size / (1024 * 1024 * 1024)) * 1.2 : 0;
                const recommendations = regionConfig && model.size
                  ? regionConfig.gpus
                      .filter(gpu => gpu.vram_gb >= estimatedVramGb)
                      .map(gpu => gpu.name)
                      .join(', ')
                  : null;

                return (
                  <tr key={`${model.bucketName}-${model.id}`} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{model.id}</td>
                    <td className="p-3 text-gray-800">{model.source}</td>
                    <td className="p-3 text-gray-800">{model.bucketName}</td>
                    <td className="p-3 text-gray-800">{model.bucketLocation.toLowerCase()}</td>
                    <td className="p-3 text-gray-800">{model.size ? formatBytes(model.size) : 'N/A'}</td>
                    <td className="p-3 text-gray-800">{estimatedVramGb > 0 ? `~${estimatedVramGb.toFixed(2)} GB` : 'N/A'}</td>
                    <td className="p-3 text-gray-800">{recommendations || 'N/A'}</td>
                    <td className="p-3 text-right">
                      {model.status === 'completed' && (
                        <button 
                          onClick={() => onDeployClick(model, model.originalBucket)}
                          className="text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 px-3 py-1"
                        >
                          Deploy
                        </button>
                      )}
                    </td>
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

export default Models;
