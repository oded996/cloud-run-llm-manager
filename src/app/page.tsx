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

  const [activeView, setActiveView] = useState<View>(viewFromUrl || 'general');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewKey, setViewKey] = useState(0);

  useEffect(() => {
    if (viewFromUrl && viewFromUrl !== activeView) {
      setActiveView(viewFromUrl);
    }
  }, [viewFromUrl, activeView]);

  const handleViewChange = (view: View) => {
    setActiveView(view);
    setViewKey(prevKey => prevKey + 1);
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
          {activeView === 'general' && <General selectedProject={selectedProject} onProjectSelect={setSelectedProject} />}
          {activeView === 'models' && <Models key={viewKey} selectedProject={selectedProject} />}
          {activeView === 'services' && <Services key={viewKey} selectedProject={selectedProject} />}
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
