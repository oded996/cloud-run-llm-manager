import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

type AuthOption = 'public' | 'require-auth';

@Component({
  selector: 'app-security-tab',
  templateUrl: './security-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityTabComponent {
  selectedAuthOption = signal<AuthOption>('public');
}
