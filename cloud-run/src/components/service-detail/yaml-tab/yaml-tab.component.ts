import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CloudRunService } from '../../services-list/services-list.component';

@Component({
  selector: 'app-yaml-tab',
  templateUrl: './yaml-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YamlTabComponent {
  service = input.required<CloudRunService>();

  yamlContent = computed(() => {
    const service = this.service();
    if (!service) return '';
    
    const maxScaleMatch = service.scaling.match(/max\s*(\d+)/);
    const maxScale = maxScaleMatch ? maxScaleMatch[1] : '100';

    return `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${service.name}
  namespace: '906505197961'
  selfLink: /apis/serving.knative.dev/v1/namespaces/906505197961/services/${service.name}
  uid: a988ccb6-5b2e-4924-a0af-cc5e1db3b54d
  resourceVersion: AAY68j4pcS8
  generation: 85
  creationTimestamp: '2022-05-01T00:02:44.84078Z'
  labels:
    gcb-trigger-id: 89fce451-85cb-4671-9404-f325b0373e6e
    managed-by: gcp-cloud-build-deploy-cloud-run
    run.googleapis.com/satisfiesPzs: 'true'
    cloud.googleapis.com/location: ${service.region}
  annotations:
    serving.knative.dev/creator: ${service.deployedBy}
    serving.knative.dev/lastModifier: ${service.deployedBy}
    run.googleapis.com/client-name: cloud-console
    run.googleapis.com/operation-id: a5e83ae9-84ef-4370-bbcd-bdcab2e5ea39
    run.googleapis.com/ingress: all
    run.googleapis.com/ingress-status: all
    run.googleapis.com/maxScale: '${maxScale}'
    run.googleapis.com/urls: '[ "https://${service.name}-906505197961.${service.region}.run.app", "https://${service.name}-6rwm66ar2a-od.a.run.app" ]'
spec:
  template:
    metadata:
      labels:
        client.knative.dev/nonce: 072e0830-337c-460c-8dbe-0a0431d751ef
      annotations:
        run.googleapis.com/startupProbeType: Default
        autoscaling.knative.dev/maxScale: '100'
        run.googleapis.com/client-name: cloud-console
        run.googleapis.com/execution-environment: gen1
        run.googleapis.com/base-images: '{ "frontend-and-email-1" : "us-central1-docker.pkg.dev/serverless-runtimes/google-22/runtimes/nodejs20" }'
        run.googleapis.com/startup-cpu-boost: 'true'
  spec:
    containerConcurrency: 80
    timeoutSeconds: 300`;
  });

  yamlLines = computed(() => this.yamlContent().split('\n'));
}
