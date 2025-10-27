// src/app/components/services/permissions.component.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '../general/general.component';

interface PermissionsCardProps {
  project: Project;
  region: string;
  serviceName: string;
}

interface AppIdentity {
  type: string;
  email: string;
}

export const PermissionsCard = ({ project, region, serviceName }: PermissionsCardProps) => {
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [invokerPrincipals, setInvokerPrincipals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPrincipal, setNewPrincipal] = useState('');
  const [appIdentity, setAppIdentity] = useState<AppIdentity | null>(null);

  useEffect(() => {
    const fetchIdentity = async () => {
      try {
        const response = await fetch('/api/project/identity');
        if (response.ok) {
          const data = await response.json();
          setAppIdentity(data);
        }
      } catch (error) {
        console.error('Failed to fetch app identity:', error);
      }
    };
    fetchIdentity();
  }, []);

  const fetchPermissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/services/iam?projectId=${project.projectId}&region=${region}&serviceName=${serviceName}`);
      if (!response.ok) throw new Error('Failed to fetch IAM policy.');
      const data = await response.json();
      setIsPublic(data.isPublic);
      setInvokerPrincipals(data.invokerPrincipals || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [project, region, serviceName]);

  const handleSetPublic = async (isPublic: boolean) => {
    setError(null);
    try {
      const response = await fetch('/api/services/iam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.projectId, region, serviceName, isPublic }),
      });
      if (!response.ok) throw new Error('Failed to update IAM policy.');
      fetchPermissions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddPrincipal = async (principalToAdd: string) => {
    if (!principalToAdd) return;
    setError(null);
    try {
      const response = await fetch('/api/services/iam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.projectId, region, serviceName, addPrincipal: principalToAdd }),
      });
      if (!response.ok) throw new Error('Failed to add principal.');
      setNewPrincipal('');
      fetchPermissions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md">
      <div className="p-4 border-b"><h2 className="text-base font-medium">Permissions</h2></div>
      <div className="p-4 space-y-4">
        {isLoading && <p>Loading permissions...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!isLoading && !error && (
          <>
            <div className="space-y-2">
              <div className="flex items-center">
                <input type="radio" id="public" name="auth" checked={isPublic === true} onChange={() => handleSetPublic(true)} />
                <label htmlFor="public" className="ml-2">
                  <p className="font-medium text-gray-800">Allow public access</p>
                  <p className="text-sm text-gray-600">No authentication checks will be performed.</p>
                </label>
              </div>
              <div className="flex items-center">
                <input type="radio" id="private" name="auth" checked={isPublic === false} onChange={() => handleSetPublic(false)} />
                <label htmlFor="private" className="ml-2">
                  <p className="font-medium text-gray-800">Require authentication</p>
                  <p className="text-sm text-gray-600">Select between Identity and Access Management (IAM).</p>
                </label>
              </div>
            </div>
            {isPublic === false && (
              <div className="pl-6 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-800">IAM Principals with "run.invoker" role</h3>
                <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
                  {invokerPrincipals.map(p => <li key={p}>{p}</li>)}
                </ul>
                <div className="flex space-x-2 mt-4">
                  <input
                    type="text"
                    value={newPrincipal}
                    onChange={(e) => setNewPrincipal(e.target.value)}
                    placeholder="e.g., user:test@example.com"
                    className="flex-grow p-2 border border-gray-300 rounded-md"
                  />
                  <button onClick={() => handleAddPrincipal(newPrincipal)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Add</button>
                </div>
                <div className="flex space-x-2 mt-2">
                    <button 
                      onClick={() => {
                        if (appIdentity) {
                          const principal = appIdentity.type === 'Service Account' 
                            ? `serviceAccount:${appIdentity.email}` 
                            : `user:${appIdentity.email}`;
                          handleAddPrincipal(principal);
                        }
                      }} 
                      disabled={!appIdentity} 
                      className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
                    >
                      Add Self
                    </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
