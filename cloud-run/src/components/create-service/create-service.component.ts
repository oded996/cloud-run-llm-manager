import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

type SourceOption = 'artifact-registry' | 'docker-hub' | 'github' | 'function';
type DeploymentOption = 'single-revision' | 'continuous' | 'inline-editor';
type AuthOption = 'public' | 'require-auth';

@Component({
  selector: 'app-create-service',
  templateUrl: './create-service.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateServiceComponent {
  cancelCreate = output<void>();

  selectedSource = signal<SourceOption>('artifact-registry');
  selectedDeployment = signal<DeploymentOption>('single-revision');
  selectedAuth = signal<AuthOption>('public');

  onCancel() {
    this.cancelCreate.emit();
  }
}
