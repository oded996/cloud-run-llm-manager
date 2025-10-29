'use client';

import { useState } from 'react';
import Header from "./components/header/header.component";
import Sidebar, { View } from './components/sidebar/sidebar.component';
import General, { Project } from './components/general/general.component';
import Models from './components/models/models.component';
import Services from './components/services/services.component';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('general');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [initialService, setInitialService] = useState<{ name: string, region: string } | null>(null);
  const [viewKey, setViewKey] = useState(0);

  const handleViewChange = (view: View) => {
    setActiveView(view);
    setInitialService(null); // Clear initial service when changing views
    setViewKey(prevKey => prevKey + 1); // Increment key to force re-mount
  };

  const handleSwitchToServices = (serviceName: string, region: string) => {
    setActiveView('services');
    setInitialService({ name: serviceName, region: region });
    setViewKey(prevKey => prevKey + 1); // Also force re-mount here
  };

  return (
    <div className="flex flex-col flex-grow">
      <Header project={selectedProject} />
      <main className="flex flex-grow">
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className="flex-1">
          {activeView === 'general' && <General selectedProject={selectedProject} onProjectSelect={setSelectedProject} />}
          {activeView === 'models' && <Models key={viewKey} selectedProject={selectedProject} onSwitchToServices={handleSwitchToServices} />}
          {activeView === 'services' && <Services key={viewKey} selectedProject={selectedProject} initialService={initialService} onSwitchToServices={handleSwitchToServices} />}
        </div>
      </main>
    </div>
  );
}
