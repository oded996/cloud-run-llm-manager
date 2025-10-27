import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CloudRunService } from '../../services-list/services-list.component';
import { ServiceRevision } from '../revisions-tab/revisions-tab.component';

type IngressOption = 'internal' | 'all';

@Component({
  selector: 'app-networking-tab',
  templateUrl: './networking-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkingTabComponent {
  service = input.required<CloudRunService>();
  revisions = input.required<ServiceRevision[]>();

  selectedIngressOption = signal<IngressOption>('all');
  allowExternalLoadBalancers = signal(false);
  enableDefaultEndpoint = signal(true);
}
