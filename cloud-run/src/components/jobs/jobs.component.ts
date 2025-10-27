import { ChangeDetectionStrategy, Component, computed, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Job {
  selected: boolean;
  name: string;
  status: 'Succeeded';
  lastExecuted: string;
  region: string;
  createdBy: string;
}

type SortableColumn = 'name';

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsComponent {
  jobSelected = output<Job>();
  jobs = input.required<Job[]>();
  toggleSelect = output<string>();
  toggleSelectAll = output<boolean>();

  filterTerm = signal('');
  sortColumn = signal<SortableColumn>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  selectAll = computed(() => {
    const jobs = this.jobs();
    return jobs.length > 0 && jobs.every(j => j.selected)
  });
  
  filteredAndSortedJobs = computed(() => {
    const term = this.filterTerm().toLowerCase();
    const jobs = this.jobs().filter(job => job.name.toLowerCase().includes(term));
    
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return jobs.sort((a, b) => {
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
}