import { ChangeDetectionStrategy, Component, computed, signal, output } from '@angular/core';

interface DomainMapping {
  selected: boolean;
  domain: string;
  mappedTo: string;
  mappedToRegion: string;
  dateAdded: string;
  addedBy: string;
}

type SortableColumn = 'domain' | 'mappedTo';

@Component({
  selector: 'app-domain-mappings',
  templateUrl: './domain-mappings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainMappingsComponent {
  serviceClicked = output<string>();

  mappings = signal<DomainMapping[]>([
    {
      selected: false,
      domain: 'group-secret-santa.com',
      mappedTo: 'frontend-us',
      mappedToRegion: 'us-central1',
      dateAdded: '4 minutes ago',
      addedBy: 'user@gmail.com',
    }
  ]);

  filterTerm = signal('');
  sortColumn = signal<SortableColumn>('mappedTo');
  sortDirection = signal<'asc' | 'desc'>('asc');

  filteredAndSortedMappings = computed(() => {
    const term = this.filterTerm().toLowerCase();
    const mappings = this.mappings().filter(mapping => 
      mapping.domain.toLowerCase().includes(term) || 
      mapping.mappedTo.toLowerCase().includes(term)
    );
    
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return mappings.sort((a, b) => {
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
    this.filterTerm.set((event.target as HTMLInputElement).value);
  }

  sortBy(column: SortableColumn) {
    if (this.sortColumn() === column) {
      this.sortDirection.update(dir => dir === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  selectMapping(domainName: string) {
    this.mappings.update(mappings => 
      mappings.map(m => ({
        ...m,
        selected: m.domain === domainName ? !m.selected : false
      }))
    );
  }
}