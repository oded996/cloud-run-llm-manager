import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-logs-view',
  templateUrl: './logs-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsViewComponent {}
