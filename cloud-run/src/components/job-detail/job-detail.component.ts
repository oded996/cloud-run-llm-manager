import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Job } from '../jobs/jobs.component';

import { HistoryTabComponent, JobExecution } from './history-tab/history-tab.component';
import { ObservabilityTabComponent } from './observability-tab/observability-tab.component';
import { TriggersTabComponent } from './triggers-tab/triggers-tab.component';
import { YamlTabComponent } from './yaml-tab/yaml-tab.component';

type Tab = 'history' | 'observability' | 'triggers' | 'yaml';

@Component({
  selector: 'app-job-detail',
  templateUrl: './job-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HistoryTabComponent,
    ObservabilityTabComponent,
    TriggersTabComponent,
    YamlTabComponent,
  ],
})
export class JobDetailComponent {
  job = input.required<Job>();

  activeTab = signal<Tab>('history');
  
  tabs: {id: Tab, label: string}[] = [
    { id: 'history', label: 'History' },
    { id: 'observability', label: 'Observability' },
    { id: 'triggers', label: 'Triggers' },
    { id: 'yaml', label: 'YAML' },
  ];

  executions = signal<JobExecution[]>([
    { id: 'datastore-cleaner-xkkjt', creationTime: 'Oct 22, 2025, 2:45:01 PM', tasks: '1/1 completed', endTime: 'Oct 22, 2025, 2:46:22 PM', status: 'succeeded', tasksDetails: [{ taskIndex: 0, lastExitCode: 0, retries: 0, startTime: 'Oct 22, 2025, 2:46:15 PM', endTime: 'Oct 22, 2025, 2:46:19 PM', status: 'succeeded' }] },
    { id: 'datastore-cleaner-w64dv', creationTime: 'Oct 21, 2025, 2:45:05 PM', tasks: '1/1 completed', endTime: 'Oct 21, 2025, 2:46:19 PM', status: 'succeeded', tasksDetails: [] },
    { id: 'datastore-cleaner-7bv66', creationTime: 'Oct 20, 2025, 2:45:01 PM', tasks: '1/1 completed', endTime: 'Oct 20, 2025, 2:46:15 PM', status: 'succeeded', tasksDetails: [] },
    { id: 'datastore-cleaner-4t8n5', creationTime: 'Oct 19, 2025, 2:45:01 PM', tasks: '1/1 completed', endTime: 'Oct 19, 2025, 2:46:15 PM', status: 'succeeded', tasksDetails: [] },
    { id: 'datastore-cleaner-n5jmh', creationTime: 'Oct 18, 2025, 2:45:05 PM', tasks: '1/1 completed', endTime: 'Oct 18, 2025, 2:46:37 PM', status: 'succeeded', tasksDetails: [] },
    { id: 'datastore-cleaner-xkwd9', creationTime: 'Oct 17, 2025, 2:45:01 PM', tasks: '1/1 completed', endTime: 'Oct 17, 2025, 2:46:20 PM', status: 'succeeded', tasksDetails: [] },
  ]);

  setActiveTab(tab: Tab) {
    this.activeTab.set(tab);
  }
}
