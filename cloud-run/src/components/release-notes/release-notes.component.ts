import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ReleaseNote {
  product: string;
  type: 'FEATURE';
  parts: { text: string; link?: string }[];
}

interface ReleaseNoteGroup {
  date: string;
  notes: ReleaseNote[];
}

@Component({
  selector: 'app-release-notes',
  templateUrl: './release-notes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class ReleaseNotesComponent {
  close = output<void>();

  releaseNotes = signal<ReleaseNoteGroup[]>([
    {
      date: 'Oct 6, 2025',
      notes: [
        {
          product: 'Cloud Run',
          type: 'FEATURE',
          parts: [
            { text: 'Support for applying ' },
            { text: 'maximum instance configuration', link: '#' },
            { text: ' at the service level is in General Availability (GA).' }
          ]
        }
      ]
    },
    {
      date: 'Sep 24, 2025',
      notes: [
        {
          product: 'Cloud Run',
          type: 'FEATURE',
          parts: [
            { text: 'Support for setting multiple environment variables using the .env file is in General Availability (GA). For more information, see ' },
            { text: 'Configure environment variables for services, jobs, and worker pools.', link: '#' }
          ]
        }
      ]
    },
    {
      date: 'Sep 23, 2025',
      notes: [
        {
          product: 'Cloud Run',
          type: 'FEATURE',
          parts: [
            { text: 'You can specify mount options when you configure Cloud Storage volume mounts for Cloud Run ' },
            { text: 'services, jobs, and worker pools.', link: '#' },
            { text: ' (GA)'}
          ]
        }
      ]
    },
    {
      date: 'Sep 10, 2025',
      notes: [
        {
          product: 'Cloud Run',
          type: 'FEATURE',
          parts: [
            { text: 'You can deploy and configure a ' },
            { text: 'multi-region service', link: '#' },
            { text: ' from a single gcloud CLI command or by using a YAML or Terraform file (GA).' }
          ]
        }
      ]
    }
  ]);
}
