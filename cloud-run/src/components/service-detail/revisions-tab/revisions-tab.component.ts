import { ChangeDetectionStrategy, Component, computed, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type RevisionSortableColumn = 'name' | 'deployed';
export type RevisionDetailTab = 'containers' | 'volumes' | 'networking' | 'security' | 'yaml';

export interface EnvVar {
  name: string;
  value: string;
}

export interface ServiceRevision {
  name: string;
  traffic: number;
  deployed: string;
  revisionTags: { label: string; url?: string; editable?: boolean };
  status: 'active' | 'inactive';
  deployedBy: string;
  // Details for the right pane
  billing: string;
  cpuBoost: boolean;
  concurrency: number;
  timeout: number;
  environment: string;
  maxInstances: number;
  image: string;
  baseImage: string;
  baseImageUpdate: string;
  port: number;
  buildInfo: string;
  sourceInfo: string;
  command: string;
  cpuLimit: number | string;
  memoryLimit: string;
  envVars: EnvVar[];
}

@Component({
  selector: 'app-revisions-tab',
  templateUrl: './revisions-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class RevisionsTabComponent implements OnInit {
  revisions = input.required<ServiceRevision[]>();
  
  revisionFilterTerm = signal('');
  revisionSortColumn = signal<RevisionSortableColumn>('deployed');
  revisionSortDirection = signal<'asc' | 'desc'>('desc');
  selectedRevision = signal<ServiceRevision | null>(null);
  activeRevisionDetailTab = signal<RevisionDetailTab>('containers');
  showEnvVars = signal(false);

  revisionDetailTabs: {id: RevisionDetailTab, label: string}[] = [
    { id: 'containers', label: 'Containers' },
    { id: 'volumes', label: 'Volumes' },
    { id: 'networking', label: 'Networking' },
    { id: 'security', label: 'Security' },
    { id: 'yaml', label: 'YAML' },
  ];

  ngOnInit(): void {
    this.selectedRevision.set(this.revisions()[0] ?? null);
  }

  filteredAndSortedRevisions = computed(() => {
    const term = this.revisionFilterTerm().toLowerCase();
    const revisions = this.revisions().filter(revision => revision.name.toLowerCase().includes(term));
    const column = this.revisionSortColumn();
    const direction = this.revisionSortDirection();

    return revisions.sort((a, b) => {
      const aValue = column === 'deployed' ? new Date(a[column]) : a[column];
      const bValue = column === 'deployed' ? new Date(b[column]) : b[column];

      let comparison = 0;
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }
      return direction === 'asc' ? comparison : -comparison;
    });
  });
  
  onRevisionFilterChange(event: Event) {
    this.revisionFilterTerm.set((event.target as HTMLInputElement).value);
  }

  sortByRevision(column: RevisionSortableColumn) {
    if (this.revisionSortColumn() === column) {
      this.revisionSortDirection.update(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.revisionSortColumn.set(column);
      this.revisionSortDirection.set('desc');
    }
  }

  selectRevision(revision: ServiceRevision) {
    this.selectedRevision.set(revision);
  }
  
  setActiveRevisionDetailTab(tab: RevisionDetailTab) {
    this.activeRevisionDetailTab.set(tab);
  }
}