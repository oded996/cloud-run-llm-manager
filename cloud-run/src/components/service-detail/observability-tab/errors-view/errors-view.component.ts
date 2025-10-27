import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface ServiceError {
  count: number;
  error: string;
}

@Component({
  selector: 'app-errors-view',
  templateUrl: './errors-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorsViewComponent {
  timeRanges = ['1 hour', '6 hours', '12 hours', '1 day', '2 days', '4 days', '7 days', '14 days', '30 days'];
  selectedTimeRange = signal('7 days');
  
  serviceErrors = signal<ServiceError[]>([
    {
      count: 16,
      error: 'Error: 10 ABORTED: Optimistic transaction was aborted due to a conflict with another concurrent operation. This can occur when there are overlapping reads or w Object.callErrorFromStatus ( /workspace/node_modules/@grpc/grpc-js/build/src/call.js:31 )'
    }
  ]);

  selectTimeRange(range: string) {
    this.selectedTimeRange.set(range);
  }
}
