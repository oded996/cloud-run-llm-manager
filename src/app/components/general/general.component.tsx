'use client';

import React, { useState, useEffect } from 'react';

interface Identity {
  type: string;
  email: string;
}

export interface Project {
  projectId: string;
  name: string;
}

interface GeneralProps {
  selectedProject: Project | null;
  onProjectSelect: (project: Project | null) => void;
}

const General = ({ selectedProject, onProjectSelect }: GeneralProps) => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [draftSelectedProject, setDraftSelectedProject] = useState<string>('');
  const [canListProjects, setCanListProjects] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingProject, setIsEditingProject] = useState(false);

  const [apiStatus, setApiStatus] = useState<{ [key: string]: boolean | null }>({
    'run.googleapis.com': null,
    'storage.googleapis.com': null,
  });
  const [permissionStatus, setPermissionStatus] = useState<{ [key: string]: boolean | null }>({
    'resourcemanager.projects.get': null,
    'run.services.list': null,
    'storage.buckets.list': null,
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Function to fetch the initial list of projects
  const fetchInitialProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/project/list');
      const data = await response.json();
      if (response.ok) {
        setProjects(data.projects);
        setCanListProjects(data.canListProjects);
      } else {
        console.error('Failed to fetch projects:', data.error);
        setCanListProjects(false);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setCanListProjects(false);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Effect to load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingInitialData(true);

      // First, check if the project is locked by an environment variable
      const envResponse = await fetch('/api/project/env');
      const envData = await envResponse.json();

      if (envData.isProjectLocked) {
        try {
          const projectDetailsResponse = await fetch(`/api/project/details?projectId=${encodeURIComponent(envData.lockedProjectId)}`);
          if (projectDetailsResponse.ok) {
            const projectDetails = await projectDetailsResponse.json();
            onProjectSelect(projectDetails);
            setDraftSelectedProject(projectDetails.projectId);
            setIsEditingProject(false);
          } else {
            // If fetching details fails, still lock to the ID but show ID as name
            onProjectSelect({ projectId: envData.lockedProjectId, name: envData.lockedProjectId });
          }
        } catch (error) {
          console.error('Failed to fetch locked project details:', error);
          onProjectSelect({ projectId: envData.lockedProjectId, name: envData.lockedProjectId });
        }
      } else {
        // If not locked, proceed with the existing local storage logic
        const savedProjectId = localStorage.getItem('selectedProject');
        let projectLoadedFromStorage = false;

        if (savedProjectId) {
          try {
            const response = await fetch(`/api/project/details?projectId=${encodeURIComponent(savedProjectId)}`);
            if (response.ok) {
              const projectDetails = await response.json();
              onProjectSelect(projectDetails);
              setDraftSelectedProject(projectDetails.projectId);
              setIsEditingProject(false);
              projectLoadedFromStorage = true;
            } else {
              localStorage.removeItem('selectedProject');
            }
          } catch (error) {
            console.error('Failed to fetch saved project details:', error);
            localStorage.removeItem('selectedProject');
          }
        }

        if (!projectLoadedFromStorage) {
          setIsEditingProject(true);
        }
        
        fetchInitialProjects();
      }

      // Fetch identity regardless
      try {
        const response = await fetch('/api/project/identity');
        if (response.ok) setIdentity(await response.json());
      } catch (error) { console.error('Error fetching identity:', error); }
      
      setIsLoadingInitialData(false);
    };

    loadInitialData();
  }, [onProjectSelect]);

  // Debounced effect for searching projects
  useEffect(() => {
    if (!isEditingProject) return;
    const handler = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        fetchInitialProjects();
        return;
      }
      setIsLoadingProjects(true);
      try {
        const response = await fetch(`/api/project/search?query=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects);
        } else {
          setProjects([]);
        }
      } catch (error) {
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, isEditingProject]);

  // Effect to check configuration status when project changes
  useEffect(() => {
    if (!selectedProject) return;
    const checkConfiguration = async () => {
      setIsLoadingStatus(true);
      try {
        const services = Object.keys(apiStatus).join('&service=');
        const apiRes = await fetch(`/api/project/service-usage?projectId=${selectedProject.projectId}&service=${services}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          setApiStatus(prev => {
            const newStatus = { ...prev };
            data.forEach((item: { service: string, isEnabled: boolean }) => {
              newStatus[item.service] = item.isEnabled;
            });
            return newStatus;
          });
        }

        const permissions = Object.keys(permissionStatus);
        const permRes = await fetch('/api/project/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: selectedProject.projectId, permissions }),
        });
        if (permRes.ok) {
          const data = await permRes.json();
          setPermissionStatus(prev => {
            const newStatus = { ...prev };
            data.forEach((item: { permission: string, isGranted: boolean }) => {
              newStatus[item.permission] = item.isGranted;
            });
            return newStatus;
          });
        }
      } catch (error) {
        console.error('Error checking configuration:', error);
      }
      setIsLoadingStatus(false);
    };
    checkConfiguration();
  }, [selectedProject]);

  const handleConfirmProject = () => {
    const projectToConfirm = projects.find(p => p.projectId === draftSelectedProject);
    if (projectToConfirm) {
      onProjectSelect(projectToConfirm);
      localStorage.setItem('selectedProject', projectToConfirm.projectId);
    } else if (draftSelectedProject) {
      const details = { projectId: draftSelectedProject, name: draftSelectedProject };
      onProjectSelect(details);
      localStorage.setItem('selectedProject', draftSelectedProject);
    }
    setIsEditingProject(false);
  };

  const handleCancelEdit = () => {
    setDraftSelectedProject(selectedProject ? selectedProject.projectId : '');
    setIsEditingProject(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Application Identity */}
      <div className="bg-white border border-gray-200 rounded-md">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-medium text-gray-800">Application Identity</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-2">
            The application is using the following identity to authenticate with Google Cloud APIs.
          </p>
          {identity ? (
            <div className="text-sm">
              <p className="text-gray-700"><strong>Type:</strong> {identity.type}</p>
              <p className="text-gray-700"><strong>Email:</strong> <span className="font-mono">{identity.email}</span></p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading identity...</p>
          )}
        </div>
      </div>

      {/* Project Selector */}
      <div className="bg-white border border-gray-200 rounded-md">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-medium text-gray-800">Project Selection</h2>
        </div>
        <div className="p-4">
          {isEditingProject ? (
            <div className="space-y-3">
              {canListProjects ? (
                <>
                  <p className="text-sm text-gray-600">Select the Google Cloud Project this tool will manage.</p>
                  <div className="max-w-xs">
                    <input
                      type="text"
                      placeholder="Search projects by name or ID..."
                      className="w-full p-2 border border-gray-300 rounded-md mb-2"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isLoadingProjects ? <p className="text-sm text-gray-500">Searching...</p> : (
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={draftSelectedProject}
                        onClick={(e) => setDraftSelectedProject(e.currentTarget.value)}
                        onChange={(e) => setDraftSelectedProject(e.target.value)}
                        size={Math.min(projects.length, 10) || 1}
                      >
                        {projects.length > 0 ? projects.map((p) => (
                          <option key={p.projectId} value={p.projectId}>{p.name} ({p.projectId})</option>
                        )) : <option disabled>No projects found</option>}
                      </select>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-red-600 mb-2">Could not list projects. Please enter a Project ID manually.</p>
                  <div className="max-w-xs">
                    <input type="text" className="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter Project ID" value={draftSelectedProject} onChange={(e) => setDraftSelectedProject(e.target.value)} />
                  </div>
                </>
              )}
              <div className="flex space-x-2 mt-3">
                <button onClick={handleConfirmProject} disabled={!draftSelectedProject} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300">Confirm</button>
                <button onClick={handleCancelEdit} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {isLoadingInitialData ? <p className="text-sm text-gray-500">Loading project...</p> : selectedProject ? (
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <div className="text-sm">
                    <span className="font-medium text-gray-800">{selectedProject.name}</span>
                    <span className="text-gray-500 ml-1">({selectedProject.projectId})</span>
                  </div>
                </div>
              ) : <p className="text-sm text-gray-500">Select a project</p>}
              <button onClick={() => setIsEditingProject(true)} className="text-sm font-medium text-blue-600 hover:underline">Change</button>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Status */}
      <div className="bg-white border border-gray-200 rounded-md">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-medium text-gray-800">Configuration Status</h2>
        </div>
        <div className="p-4 space-y-4">
          {isLoadingStatus ? <p className="text-sm text-gray-500">Checking configuration...</p> : (
            <>
              <div>
                <h3 className="font-medium text-gray-800">API Enablement</h3>
                <ul className="space-y-1 text-sm mt-2">
                  {Object.entries(apiStatus).map(([api, enabled]) => (
                    <li key={api} className="flex items-center text-gray-700">
                      {enabled === null ? <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3"/></svg> : enabled ? <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg> : <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>}
                      {api}
                      {enabled === false && <a href={`https://console.cloud.google.com/apis/library/${api}?project=${selectedProject?.projectId}`} target="_blank" rel="noopener noreferrer" className="ml-4 text-sm text-blue-600 hover:underline">Enable API</a>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-gray-200"></div>
              <div>
                <h3 className="font-medium text-gray-800">IAM Permissions</h3>
                <ul className="space-y-1 text-sm mt-2">
                  {Object.entries(permissionStatus).map(([permission, granted]) => (
                     <li key={permission} className="flex items-center text-gray-700">
                      {granted === null ? <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3"/></svg> : granted ? <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg> : <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>}
                      {permission}
                    </li>
                  ))}
                </ul>
                {Object.values(permissionStatus).some(g => g === false) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs">
                    <p className="font-medium text-gray-700">Missing Permissions</p>
                    <p className="text-gray-600 mt-1">
                      To manage resources, the identity <span className="font-mono">{identity?.email}</span> needs the following roles on project <span className="font-mono">{selectedProject?.projectId}</span>:
                    </p>
                    <ul className="list-disc list-inside mt-1 text-gray-600">
                      {permissionStatus['run.services.list'] === false && <li>Cloud Run Admin (`roles/run.admin`)</li>}
                      {permissionStatus['storage.buckets.list'] === false && <li>Storage Admin (`roles/storage.admin`)</li>}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default General;

export const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-10 px-2 py-1 text-sm font-medium text-white bg-gray-800 rounded-md shadow-sm bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};