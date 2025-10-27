import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface SLO {
  objective: string;
  type: 'Availability SLI' | 'Latency SLI';
  alertsFiring: string;
  errorBudget: string;
}

@Component({
  selector: 'app-slos-view',
  templateUrl: './slos-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlosViewComponent {
  slos = signal<SLO[]>([
    {
      objective: '99.9% - Availability - Rolling 7 days',
      type: 'Availability SLI',
      alertsFiring: '0/1',
      errorBudget: '99.845%',
    },
    {
      objective: '50% - Latency - Rolling 7 days',
      type: 'Latency SLI',
      alertsFiring: '0/1',
      errorBudget: '94.406%',
    },
    {
      objective: '99% - Latency - Rolling 7 days',
      type: 'Latency SLI',
      alertsFiring: '0/1',
      errorBudget: '85.178%',
    },
  ]);
}
