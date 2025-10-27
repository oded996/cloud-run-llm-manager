import { ChangeDetectionStrategy, Component, output, input, signal, computed } from '@angular/core';
import { CloudRunService } from '../services-list/services-list.component';

interface DnsRecord {
  name: string;
  type: 'A' | 'AAAA';
  data: string;
}

@Component({
  selector: 'app-add-mapping-modal',
  templateUrl: './add-mapping-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddMappingModalComponent {
  services = input.required<CloudRunService[]>();
  closeModal = output<void>();

  step = signal<1 | 2 | 3>(1);
  selectedService = signal('');
  domainName = signal('');
  subdomain = signal('');

  dnsRecords = signal<DnsRecord[]>([
    { name: '', type: 'A', data: '216.239.32.21' },
    { name: '', type: 'A', data: '216.239.34.21' },
    { name: '', type: 'A', data: '216.239.36.21' },
    { name: '', type: 'A', data: '216.239.38.21' },
    { name: '', type: 'AAAA', data: '2001:4860:4802:32::15' },
    { name: '', type: 'AAAA', data: '2001:4860:4802:34::15' },
    { name: '', type: 'AAAA', data: '2001:4860:4802:36::15' },
    { name: '', type: 'AAAA', data: '2001:4860:4802:38::15' },
  ]);

  canContinueStep1 = computed(() => this.selectedService() !== '' && this.domainName().trim() !== '');

  onClose() {
    this.closeModal.emit();
  }

  goToStep2() {
    if (this.canContinueStep1()) {
      this.step.set(2);
    }
  }

  goToStep3() {
    this.step.set(3);
  }
  
  onServiceChange(event: Event) {
    this.selectedService.set((event.target as HTMLSelectElement).value);
  }

  onDomainNameChange(event: Event) {
    this.domainName.set((event.target as HTMLInputElement).value);
  }
}
