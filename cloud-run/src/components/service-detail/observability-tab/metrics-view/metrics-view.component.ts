import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-metrics-view',
  templateUrl: './metrics-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsViewComponent {}
