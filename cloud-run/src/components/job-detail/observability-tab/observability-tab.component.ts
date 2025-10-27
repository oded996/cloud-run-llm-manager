import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { MetricsViewComponent } from './metrics-view/metrics-view.component';
import { LogsViewComponent } from './logs-view/logs-view.component';

type ObservabilityView = 'metrics' | 'logs';

@Component({
  selector: 'app-observability-tab',
  templateUrl: './observability-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MetricsViewComponent,
    LogsViewComponent,
  ],
})
export class ObservabilityTabComponent {
  activeObservabilityView = signal<ObservabilityView>('metrics');
  
  observabilityViews: { id: ObservabilityView, label: string }[] = [
    { id: 'metrics', label: 'Metrics' },
    { id: 'logs', label: 'Logs' },
  ];

  setActiveObservabilityView(view: ObservabilityView) {
    this.activeObservabilityView.set(view);
  }
}
