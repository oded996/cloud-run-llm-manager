import { ChangeDetectionStrategy, Component, computed, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CloudRunService {
  selected: boolean;
  status: 'running' | 'stopped';
  name: string;
  deploymentType: 'Repository';
  requestsPerSecond: number;
  region: string;
  authentication: 'Require authentication' | 'Public access';
  ingress: 'All';
  scaling: string;
  lastDeployed: string;
  deployedBy: string;
}

type SortableColumn = 'name' | 'lastDeployed';

@Component({
  selector: 'app-services-list',
  templateUrl: './services-list.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesListComponent {
  services = input.required<CloudRunService[]>();
  serviceSelected = output<CloudRunService>();
  toggleSelect = output<string>();
  toggleSelectAll = output<boolean>();

  filterTerm = signal('');
  sortColumn = signal<SortableColumn>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  selectAll = computed(() => {
    const services = this.services();
    return services.length > 0 && services.every(s => s.selected)
  });

  filteredAndSortedServices = computed(() => {
    const term = this.filterTerm().toLowerCase();
    const services = this.services().filter(service => service.name.toLowerCase().includes(term));

    const column = this.sortColumn();
    const direction = this.sortDirection();

    return services.sort((a, b) => {
        const aValue = a[column];
        const bValue = b[column];

        let comparison = 0;
        if (aValue > bValue) {
            comparison = 1;
        } else if (aValue < bValue) {
            comparison = -1;
        }
        
        return direction === 'asc' ? comparison : -comparison;
    });
  });

  onFilterChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filterTerm.set(input.value);
  }
  
  sortBy(column: SortableColumn) {
    if (this.sortColumn() === column) {
      this.sortDirection.update(dir => dir === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }
}
