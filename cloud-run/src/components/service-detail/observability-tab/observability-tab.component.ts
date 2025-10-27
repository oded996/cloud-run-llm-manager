import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { MetricsViewComponent } from './metrics-view/metrics-view.component';
import { LogsViewComponent } from './logs-view/logs-view.component';
import { SlosViewComponent } from './slos-view/slos-view.component';
import { ErrorsViewComponent } from './errors-view/errors-view.component';

type ObservabilityView = 'metrics' | 'logs' | 'slos' | 'errors';

@Component({
  selector: 'app-observability-tab',
  templateUrl: './observability-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MetricsViewComponent,
    LogsViewComponent,
    SlosViewComponent,
    ErrorsViewComponent
  ],
})
export class ObservabilityTabComponent {
  activeObservabilityView = signal<ObservabilityView>('metrics');

  observabilityViews: { id: ObservabilityView, label: string }[] = [
    { id: 'metrics', label: 'Metrics' },
    { id: 'logs', label: 'Logs' },
    { id: 'slos', label: 'SLOs' },
    { id: 'errors', label: 'Errors' },
  ];
  
  setActiveObservabilityView(view: ObservabilityView) {
    this.activeObservabilityView.set(view);
  }
}
