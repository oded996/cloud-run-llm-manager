import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent, View } from './components/sidebar/sidebar.component';
import { ServicesListComponent, CloudRunService } from './components/services-list/services-list.component';
import { OverviewComponent } from './components/overview/overview.component';
import { JobsComponent, Job } from './components/jobs/jobs.component';
import { WorkerPoolsComponent } from './components/worker-pools/worker-pools.component';
import { DomainMappingsComponent } from './components/domain-mappings/domain-mappings.component';
import { CreateServiceComponent } from './components/create-service/create-service.component';
import { ServiceDetailComponent } from './components/service-detail/service-detail.component';
import { AddMappingModalComponent } from './components/add-mapping-modal/add-mapping-modal.component';
import { JobDetailComponent } from './components/job-detail/job-detail.component';
import { ReleaseNotesComponent } from './components/release-notes/release-notes.component';

// Job Detail sub-components
import { HistoryTabComponent as JobHistoryTabComponent } from './components/job-detail/history-tab/history-tab.component';
import { ObservabilityTabComponent as JobObservabilityTabComponent } from './components/job-detail/observability-tab/observability-tab.component';
import { MetricsViewComponent as JobMetricsViewComponent } from './components/job-detail/observability-tab/metrics-view/metrics-view.component';
import { LogsViewComponent as JobLogsViewComponent } from './components/job-detail/observability-tab/logs-view/logs-view.component';
import { TriggersTabComponent as JobTriggersTabComponent } from './components/job-detail/triggers-tab/triggers-tab.component';
import { YamlTabComponent as JobYamlTabComponent } from './components/job-detail/yaml-tab/yaml-tab.component';

// Service Detail sub-components
import { ObservabilityTabComponent as ServiceObservabilityTabComponent } from './components/service-detail/observability-tab/observability-tab.component';
import { MetricsViewComponent as ServiceMetricsViewComponent } from './components/service-detail/observability-tab/metrics-view/metrics-view.component';
import { LogsViewComponent as ServiceLogsViewComponent } from './components/service-detail/observability-tab/logs-view/logs-view.component';
import { SlosViewComponent } from './components/service-detail/observability-tab/slos-view/slos-view.component';
import { ErrorsViewComponent } from './components/service-detail/observability-tab/errors-view/errors-view.component';
import { RevisionsTabComponent } from './components/service-detail/revisions-tab/revisions-tab.component';
import { TriggersTabComponent as ServiceTriggersTabComponent } from './components/service-detail/triggers-tab/triggers-tab.component';
import { NetworkingTabComponent } from './components/service-detail/networking-tab/networking-tab.component';
import { SecurityTabComponent } from './components/service-detail/security-tab/security-tab.component';
import { YamlTabComponent as ServiceYamlTabComponent } from './components/service-detail/yaml-tab/yaml-tab.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeaderComponent,
    SidebarComponent,
    ServicesListComponent,
    OverviewComponent,
    JobsComponent,
    WorkerPoolsComponent,
    DomainMappingsComponent,
    CreateServiceComponent,
    ServiceDetailComponent,
    AddMappingModalComponent,
    JobDetailComponent,
    ReleaseNotesComponent,
    // Job Detail sub-components
    JobHistoryTabComponent,
    JobObservabilityTabComponent,
    JobMetricsViewComponent,
    JobLogsViewComponent,
    JobTriggersTabComponent,
    JobYamlTabComponent,
    // Service Detail sub-components
    ServiceObservabilityTabComponent,
    ServiceMetricsViewComponent,
    ServiceLogsViewComponent,
    SlosViewComponent,
    ErrorsViewComponent,
    RevisionsTabComponent,
    ServiceTriggersTabComponent,
    NetworkingTabComponent,
    SecurityTabComponent,
    ServiceYamlTabComponent,
  ],
})
export class AppComponent {
  activeView = signal<View>('services');
  showCreateService = signal(false);
  selectedService = signal<CloudRunService | null>(null);
  showAddMappingModal = signal(false);
  selectedJob = signal<Job | null>(null);
  showReleaseNotes = signal(false);
  isSidebarCollapsed = signal(false);

  services = signal<CloudRunService[]>([
    { selected: false, status: 'running', name: 'datastore-cleaner', deploymentType: 'Repository', requestsPerSecond: 0, region: 'us-central1', authentication: 'Require authentication', ingress: 'All', scaling: 'Auto: min 0', lastDeployed: 'Jul 5, 2023', deployedBy: 'user@gmail.com' },
    { selected: false, status: 'running', name: 'email', deploymentType: 'Repository', requestsPerSecond: 0.01, region: 'us-central1', authentication: 'Require authentication', ingress: 'All', scaling: 'Auto: min 0', lastDeployed: 'Jun 7, 2025', deployedBy: 'Cloud Build' },
    { selected: false, status: 'running', name: 'frontend-paris', deploymentType: 'Repository', requestsPerSecond: 0.11, region: 'europe-west9', authentication: 'Public access', ingress: 'All', scaling: 'Auto: min 0, max 5', lastDeployed: 'Jul 27, 2025', deployedBy: 'user@gmail.com' },
    { selected: false, status: 'running', name: 'frontend-us', deploymentType: 'Repository', requestsPerSecond: 0, region: 'us-central1', authentication: 'Public access', ingress: 'All', scaling: 'Auto: min 0, max 10', lastDeployed: 'Sep 27, 2025', deployedBy: 'user@gmail.com' },
  ]);

  jobs = signal<Job[]>([
    {
      selected: false,
      name: 'datastore-cleaner',
      status: 'Succeeded',
      lastExecuted: 'Oct 22, 2025, 2:45:01 PM',
      region: 'us-central1',
      createdBy: 'user@gmail.com',
    },
  ]);

  onViewChange(view: View) {
    this.activeView.set(view);
    this.showCreateService.set(false);
    this.selectedService.set(null);
    this.selectedJob.set(null);
    this.showReleaseNotes.set(false);
  }

  displayCreateService() {
    this.activeView.set('services');
    this.selectedService.set(null);
    this.selectedJob.set(null);
    this.showCreateService.set(true);
  }

  hideCreateService() {
    this.showCreateService.set(false);
  }

  onServiceSelected(service: CloudRunService) {
    this.selectedService.set(service);
    this.showCreateService.set(false);
    this.selectedJob.set(null);
  }
  
  onSelectServiceByName(name: string) {
    const service = this.services().find(s => s.name === name);
    if (service) {
      this.selectedService.set(service);
      this.activeView.set('services');
      this.showCreateService.set(false);
      this.selectedJob.set(null);
    }
  }

  onSelectJobByName(name: string) {
    const job = this.jobs().find(j => j.name === name);
    if (job) {
      this.selectedJob.set(job);
      this.activeView.set('jobs');
      this.showCreateService.set(false);
      this.selectedService.set(null);
    }
  }

  hideServiceDetails() {
    this.selectedService.set(null);
  }

  onJobSelected(job: Job) {
    this.selectedJob.set(job);
    this.selectedService.set(null);
    this.showCreateService.set(false);
  }

  hideJobDetails() {
    this.selectedJob.set(null);
  }

  handleToggleSelect(serviceName: string) {
    this.services.update(services => 
      services.map(s => s.name === serviceName ? {...s, selected: !s.selected } : s)
    );
  }

  handleToggleSelectAll(checked: boolean) {
    this.services.update(services => 
      services.map(s => ({...s, selected: checked }))
    );
  }

  handleJobToggleSelect(jobName: string) {
    this.jobs.update(jobs => 
      jobs.map(j => j.name === jobName ? {...j, selected: !j.selected } : j)
    );
  }

  handleJobToggleSelectAll(checked: boolean) {
    this.jobs.update(jobs => 
      jobs.map(j => ({...j, selected: checked }))
    );
  }

  displayAddMappingModal() {
    this.showAddMappingModal.set(true);
  }

  hideAddMappingModal() {
    this.showAddMappingModal.set(false);
  }

  displayReleaseNotes() {
    this.showReleaseNotes.set(true);
  }

  hideReleaseNotes() {
    this.showReleaseNotes.set(false);
  }

  toggleSidebarCollapse() {
    this.isSidebarCollapsed.update(collapsed => !collapsed);
  }
}