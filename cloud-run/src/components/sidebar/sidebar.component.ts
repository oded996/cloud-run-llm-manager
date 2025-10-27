import { ChangeDetectionStrategy, Component, input, output, signal, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type View = 'overview' | 'services' | 'jobs' | 'worker-pools' | 'domain-mappings';

interface NavItem {
  id: View;
  icon: SafeHtml;
  label: string;
}

interface RawNavItem {
  id: View;
  icon: string;
  label: string;
}


@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  activeView = input.required<View>();
  isCollapsed = input<boolean>(false);
  viewChange = output<View>();
  releaseNotesClicked = output<void>();
  toggleCollapse = output<void>();

  // Fix: Explicitly set the type for `sanitizer` to `DomSanitizer`. The type was being inferred as `unknown`.
  private sanitizer: DomSanitizer = inject(DomSanitizer);

  navItems = signal<NavItem[]>([]);

  constructor() {
    const rawNavItems: RawNavItem[] = [
      { id: 'overview', icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>`, label: 'Overview' },
      { id: 'services', icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M13 22h8v-7h-3v-4h-2v4h-3v7M11 2h-8v7h3v4h2V9h3V2m-5 3h2v2H6V5m10 12h2v2h-2v-2M8 17v-2H6v2h2m-2-7V8H4v2h2Z"/></svg>`, label: 'Services' },
      { id: 'jobs', icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z"/></svg>`, label: 'Jobs' },
      { id: 'worker-pools', icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61-.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61-.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`, label: 'Worker pools' },
      { id: 'domain-mappings', icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-8v8h8v-8zm-2 6h-4v-4h4v4z"/></svg>`, label: 'Domain mappings' },
    ];

    const sanitizedNavItems = rawNavItems.map(item => ({
      ...item,
      icon: this.sanitizer.bypassSecurityTrustHtml(item.icon)
    }));

    this.navItems.set(sanitizedNavItems);
  }
}