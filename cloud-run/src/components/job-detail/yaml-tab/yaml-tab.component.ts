import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Job } from '../../jobs/jobs.component';

@Component({
  selector: 'app-yaml-tab',
  templateUrl: './yaml-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YamlTabComponent {
  job = input.required<Job>();

  yamlContent = computed(() => {
    const job = this.job();
    if (!job) return '';

    return `apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: ${job.name}
  namespace: '906505197961'
  selfLink: /apis/run.googleapis.com/v1/namespaces/906505197961/jobs/${job.name}
  uid: 5a9e3a62-1b15-4169-8260-2101183c7901
  resourceVersion: AAY68kHlHkA
  generation: 4
  creationTimestamp: '2025-04-23T21:45:01.127419Z'
  labels:
    cloud.googleapis.com/location: ${job.region}
  annotations:
    run.googleapis.com/client-name: cloud-console
    run.googleapis.com/last-modifier: ${job.createdBy}
spec:
  template:
    spec:
      template:
        spec:
          containers:
          - image: us-docker.pkg.dev/cloudrun/container/job:latest
            name: job
            resources: {}
          restartPolicy: OnFailure
          terminationGracePeriodSeconds: '1800'
`;
  });

  yamlLines = computed(() => this.yamlContent().split('\n'));
}
