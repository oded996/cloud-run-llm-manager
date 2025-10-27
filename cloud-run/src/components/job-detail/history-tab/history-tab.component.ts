import { ChangeDetectionStrategy, Component, input, signal, OnInit } from '@angular/core';

export interface ExecutionTask {
    taskIndex: number;
    lastExitCode: number;
    retries: number;
    startTime: string;
    endTime: string;
    status: 'succeeded';
}

export interface JobExecution {
  id: string;
  creationTime: string;
  tasks: string;
  endTime: string;
  status: 'succeeded';
  tasksDetails: ExecutionTask[];
}

type ExecutionDetailTab = 'tasks' | 'containers' | 'volumes' | 'networking' | 'security' | 'yaml';


@Component({
  selector: 'app-history-tab',
  templateUrl: './history-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryTabComponent implements OnInit {
  executions = input.required<JobExecution[]>();
  
  selectedExecution = signal<JobExecution | null>(null);
  activeExecutionDetailTab = signal<ExecutionDetailTab>('tasks');
  
  executionDetailTabs: {id: ExecutionDetailTab, label: string}[] = [
    { id: 'tasks', label: 'Tasks' },
    { id: 'containers', label: 'Containers' },
    { id: 'volumes', label: 'Volumes' },
    { id: 'networking', label: 'Networking' },
    { id: 'security', label: 'Security' },
    { id: 'yaml', label: 'YAML' },
  ];

  ngOnInit(): void {
    this.selectedExecution.set(this.executions()[0] ?? null);
  }

  selectExecution(execution: JobExecution) {
    this.selectedExecution.set(execution);
  }

  setActiveExecutionDetailTab(tab: ExecutionDetailTab) {
    this.activeExecutionDetailTab.set(tab);
  }
}