import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CloudRunService } from '../services-list/services-list.component';

import { ObservabilityTabComponent } from './observability-tab/observability-tab.component';
import { RevisionsTabComponent, ServiceRevision } from './revisions-tab/revisions-tab.component';
import { TriggersTabComponent } from './triggers-tab/triggers-tab.component';
import { NetworkingTabComponent } from './networking-tab/networking-tab.component';
import { SecurityTabComponent } from './security-tab/security-tab.component';
import { YamlTabComponent } from './yaml-tab/yaml-tab.component';


type Tab = 'observability' | 'revisions' | 'triggers' | 'networking' | 'security' | 'yaml';

@Component({
  selector: 'app-service-detail',
  templateUrl: './service-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ObservabilityTabComponent,
    RevisionsTabComponent,
    TriggersTabComponent,
    NetworkingTabComponent,
    SecurityTabComponent,
    YamlTabComponent,
  ],
})
export class ServiceDetailComponent {
  service = input.required<CloudRunService>();
  activeTab = signal<Tab>('observability');
  
  tabs: {id: Tab, label: string}[] = [
    { id: 'observability', label: 'Observability' },
    { id: 'revisions', label: 'Revisions' },
    { id: 'triggers', label: 'Triggers' },
    { id: 'networking', label: 'Networking' },
    { id: 'security', label: 'Security' },
    { id: 'yaml', label: 'YAML' },
  ];

  // State for Revisions Tab, also needed by Networking Tab
  revisions = signal<ServiceRevision[]>([
      { name: 'frontend-paris-00057-v6x', traffic: 100, deployed: 'Jul 27, 2025', revisionTags: { label: 'latest', url: '#', editable: true }, status: 'active', deployedBy: 'user@gmail.com', billing: 'Request-based', cpuBoost: true, concurrency: 80, timeout: 300, environment: 'First generation', maxInstances: 100, image: 'us-central1-docker.pkg.dev/cloud-run-demo/contain...', baseImage: 'us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20', baseImageUpdate: 'Automatic', port: 8080, buildInfo: '(no build information available)', sourceInfo: '(no source information available)', command: '(container entrypoint)', cpuLimit: 1, memoryLimit: '512MiB', envVars: [{name: 'API_KEY', value:'secret-key-123'}] },
      { name: 'frontend-paris-00056-qck', traffic: 0, deployed: 'Jun 7, 2025', revisionTags: { label: '' }, status: 'inactive', deployedBy: 'user@gmail.com', billing: 'Request-based', cpuBoost: true, concurrency: 80, timeout: 300, environment: 'First generation', maxInstances: 100, image: 'us-central1-docker.pkg.dev/cloud-run-demo/contain...', baseImage: 'us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20', baseImageUpdate: 'Automatic', port: 8080, buildInfo: '(no build information available)', sourceInfo: '(no source information available)', command: '(container entrypoint)', cpuLimit: 1, memoryLimit: '512MiB', envVars: [] },
      { name: 'frontend-paris-00055-2fs', traffic: 0, deployed: 'Oct 21, 2024', revisionTags: { label: '' }, status: 'inactive', deployedBy: 'user@gmail.com', billing: 'Request-based', cpuBoost: true, concurrency: 80, timeout: 300, environment: 'First generation', maxInstances: 100, image: 'us-central1-docker.pkg.dev/cloud-run-demo/contain...', baseImage: 'us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20', baseImageUpdate: 'Automatic', port: 8080, buildInfo: '(no build information available)', sourceInfo: '(no source information available)', command: '(container entrypoint)', cpuLimit: 1, memoryLimit: '512MiB', envVars: [] },
      { name: 'frontend-paris-00054-cks', traffic: 0, deployed: 'Oct 12, 2024', revisionTags: { label: '' }, status: 'inactive', deployedBy: 'user@gmail.com', billing: 'Request-based', cpuBoost: true, concurrency: 80, timeout: 300, environment: 'First generation', maxInstances: 100, image: 'us-central1-docker.pkg.dev/cloud-run-demo/contain...', baseImage: 'us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20', baseImageUpdate: 'Automatic', port: 8080, buildInfo: '(no build information available)', sourceInfo: '(no source information available)', command: '(container entrypoint)', cpuLimit: 1, memoryLimit: '512MiB', envVars: [] },
      { name: 'frontend-paris-00053-2b5', traffic: 0, deployed: 'Sep 21, 2024', revisionTags: { label: '' }, status: 'inactive', deployedBy: 'user@gmail.com', billing: 'Request-based', cpuBoost: true, concurrency: 80, timeout: 300, environment: 'First generation', maxInstances: 100, image: 'us-central1-docker.pkg.dev/cloud-run-demo/contain...', baseImage: 'us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20', baseImageUpdate: 'Automatic', port: 8080, buildInfo: '(no build information available)', sourceInfo: '(no source information available)', command: '(container entrypoint)', cpuLimit: 1, memoryLimit: '512MiB', envVars: [] },
      { name: 'frontend-paris-00052-5w7', traffic: 0, deployed: 'Sep 21, 2024', revisionTags: { label: '' }, status: 'inactive', deployedBy: 'user@gmail.com', billing: 'Request-based', cpuBoost: true, concurrency: 80, timeout: 300, environment: 'First generation', maxInstances: 100, image: 'us-central1-docker.pkg.dev/cloud-run-demo/contain...', baseImage: 'us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20', baseImageUpdate: 'Automatic', port: 8080, buildInfo: '(no build information available)', sourceInfo: '(no source information available)', command: '(container entrypoint)', cpuLimit: 1, memoryLimit: '512MiB', envVars: [] },
      { name: 'frontend-paris-00051-5lt', traffic: 0, deployed: 'Mar 6, 2024', revisionTags: { label: '' }, status: 'inactive', deployedBy: 'user@gmail.com', billing: 'Request-based', cpuBoost: true, concurrency: 80, timeout: 300, environment: 'First generation', maxInstances: 100, image: 'us-central1-docker.pkg.dev/cloud-run-demo/contain...', baseImage: 'us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20', baseImageUpdate: 'Automatic', port: 8080, buildInfo: '(no build information available)', sourceInfo: '(no source information available)', command: '(container entrypoint)', cpuLimit: 1, memoryLimit: '512MiB', envVars: [] },
      { name: 'frontend-paris-00050-9km', traffic: 0, deployed: 'Dec 23, 2023', revisionTags: { label: '' }, status: 'inactive', deployedBy: 'user@gmail.com', billing: 'Request-based', cpuBoost: true, concurrency: 80, timeout: 300, environment: 'First generation', maxInstances: 100, image: 'us-central1-docker.pkg.dev/cloud-run-demo/contain...', baseImage: 'us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20', baseImageUpdate: 'Automatic', port: 8080, buildInfo: '(no build information available)', sourceInfo: '(no source information available)', command: '(container entrypoint)', cpuLimit: 1, memoryLimit: '512MiB', envVars: [] },
  ]);

  setActiveTab(tab: Tab) {
    this.activeTab.set(tab);
  }
}