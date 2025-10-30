'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from "./components/header/header.component";
import Sidebar, { View } from './components/sidebar/sidebar.component';
import General, { Project } from './components/general/general.component';
import Models from './components/models/models.component';
import Services from './components/services/services.component';

function HomeContent() {
  const searchParams = useSearchParams();
  const viewFromUrl = searchParams.get('view') as View | null;

  const [activeView, setActiveView] = useState<View>('general');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  // Centralized project initialization
  useEffect(() => {
    const initializeProject = async () => {
      setIsProjectLoading(true);
      
      // Check for a project locked by environment variables first
      const envResponse = await fetch('/api/project/env');
      const envData = await envResponse.json();

      if (envData.isProjectLocked && envData.lockedProjectId) {
        try {
          const detailsResponse = await fetch(`/api/project/details?projectId=${encodeURIComponent(envData.lockedProjectId)}`);
          if (detailsResponse.ok) {
            setSelectedProject(await detailsResponse.json());
          } else {
            setSelectedProject({ projectId: envData.lockedProjectId, name: envData.lockedProjectId });
          }
        } catch (error) {
          console.error('Failed to fetch locked project details:', error);
          setSelectedProject({ projectId: envData.lockedProjectId, name: envData.lockedProjectId });
        }
      } else {
        // If not locked, check local storage
        const savedProjectId = localStorage.getItem('selectedProject');
        if (savedProjectId) {
          try {
            const detailsResponse = await fetch(`/api/project/details?projectId=${encodeURIComponent(savedProjectId)}`);
            if (detailsResponse.ok) {
              setSelectedProject(await detailsResponse.json());
            } else {
              localStorage.removeItem('selectedProject'); // Clear invalid project
            }
          } catch (error) {
            console.error('Failed to fetch saved project details:', error);
            localStorage.removeItem('selectedProject');
          }
        }
      }
      setIsProjectLoading(false);
    };
    initializeProject();
  }, []);

  useEffect(() => {
    // Set initial view from URL, but only after project loading is settled
    if (!isProjectLoading) {
      setActiveView(viewFromUrl || 'general');
    }
  }, [viewFromUrl, isProjectLoading]);

  const renderContent = () => {
    if (isProjectLoading) {
        return <div className="p-6">Loading project...</div>;
    }
    switch (activeView) {
        case 'general':
            return <General selectedProject={selectedProject} onProjectSelect={setSelectedProject} />;
        case 'models':
            return <Models selectedProject={selectedProject} />;
        case 'services':
            return <Services selectedProject={selectedProject} />;
        default:
            return <General selectedProject={selectedProject} onProjectSelect={setSelectedProject} />;
    }
  };

  return (
    <div className="flex flex-col flex-grow">
      <Header project={selectedProject} />
      <main className="flex flex-grow">
        <Sidebar
          activeView={activeView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className="flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
