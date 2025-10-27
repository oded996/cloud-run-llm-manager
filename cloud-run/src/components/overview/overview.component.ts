import { ChangeDetectionStrategy, Component, signal, output } from '@angular/core';

interface Resource {
  name: string;
  region: string;
  type: 'Service' | 'Job';
  lastUpdated: string;
}

interface ErrorInfo {
  count: number;
  error: string;
  resource: string;
  resourceDisplay: string;
}

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewComponent {
  serviceClicked = output<string>();
  jobClicked = output<string>();

  resources = signal<Resource[]>([
    { name: 'email', region: 'us-central1', type: 'Service', lastUpdated: 'Jun 7, 2025' },
    { name: 'frontend-us', region: 'us-central1', type: 'Service', lastUpdated: 'Sep 27, 2025' },
    { name: 'datastore-cleaner', region: 'us-central1', type: 'Service', lastUpdated: 'Sep 21, 2024' },
    { name: 'frontend-paris', region: 'europe-west9', type: 'Service', lastUpdated: 'Jul 27, 2025' },
    { name: 'datastore-cleaner', region: 'us-central1', type: 'Job', lastUpdated: 'Apr 23, 2025' },
  ]);

  errors = signal<ErrorInfo[]>([
    { 
      count: 16, 
      error: 'Error: 10 ABORTED: Optimistic transaction was aborte...', 
      resource: 'frontend-paris',
      resourceDisplay: 'frontend-pa...'
    }
  ]);
  
  activeTab = signal<'scaling' | 'errors'>('scaling');
}