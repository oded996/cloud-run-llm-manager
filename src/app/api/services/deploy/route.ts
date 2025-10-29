import { NextResponse } from 'next/server';
import { ServicesClient } from '@google-cloud/run';
import { SUPPORTED_REGIONS } from '@/app/config/regions';

export async function POST(request: Request) {
  const payload = await request.json();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (data: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}

`));
  };

  deployService(payload, sendEvent).finally(() => {
    writer.close();
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function deployService(payload: any, sendEvent: (data: any) => void) {
  const {
    projectId,
    region,
    serviceName,
    containerImage,
    containerPort,
    cpu,
    memory,
    gpu,
    gpuZonalRedundancyDisabled,
    minInstances,
    maxInstances,
    args,
    envVars,
    bucketName,
    useVpc,
    subnet,
  } = payload;

  try {
    sendEvent({ message: 'Initializing Google Cloud client...' });

    const regionConfig = SUPPORTED_REGIONS.find(r => r.name === region.toLowerCase());
    const gpuConfig = regionConfig?.gpus.find(g => g.accelerator === gpu);
    const isAlpha = gpuConfig?.status === 'Private Preview';

    let apiEndpoint = `${region.toLowerCase()}-run.googleapis.com`;
    if (isAlpha) {
        apiEndpoint = `run.googleapis.com`; // The alpha endpoint is global
        sendEvent({ message: `Using alpha API endpoint for Private Preview GPU...` });
    }

    // The client will automatically use Application Default Credentials.
    const runClient = new ServicesClient({
        apiEndpoint: apiEndpoint,
    });

    sendEvent({ message: 'Constructing service configuration...' });

    const serviceConfig: any = {
      template: {
          gpuZonalRedundancyDisabled: gpuZonalRedundancyDisabled,
          annotations: {},
          scaling: {
              minInstanceCount: minInstances,
              maxInstanceCount: maxInstances,
          },
          nodeSelector: {
              accelerator: gpu,
          },
          containers: [
              {
                  image: containerImage,
                  ports: [{ containerPort: parseInt(containerPort, 10) }],
                  resources: {
                      limits: {
                          cpu,
                          memory,
                          'nvidia.com/gpu': '1',
                      }
                  },
                  args: args.map((arg: { key: string, value: string }) => `${arg.key}=${arg.value}`),
                  env: envVars.map((env: { key: string, value: string }) => ({ name: env.key, value: env.value })),
                  volumeMounts: [{
                      name: 'gcs-bucket',
                      mountPath: `/gcs/${bucketName}`,
                  }],
              },
          ],
          volumes: [{
              name: 'gcs-bucket',
              gcs: {
                  bucket: bucketName,
                  readOnly: true,
              }
          }],
      },
      labels: {
          'managed-by': 'llm-manager',
      },
  };

  if (isAlpha) {
    serviceConfig.launchStage = 'ALPHA';
  }

  if (useVpc && subnet) {
      sendEvent({ message: `Configuring VPC network interface for subnet: ${subnet}` });
      serviceConfig.template.annotations['run.googleapis.com/network-interfaces'] = `[{"subnetwork":"${subnet}"}]`;
      serviceConfig.template.annotations['run.googleapis.com/vpc-access-egress'] = 'all-traffic';
  }

    sendEvent({ message: `Initiating deployment for service '${serviceName}'...` });
    
    const parent = `projects/${projectId}/locations/${region.toLowerCase()}`;
    const [operation] = await runClient.createService({
        parent: parent,
        service: serviceConfig,
        serviceId: serviceName,
    });

    sendEvent({
        message: `Service '${serviceName}' creation initiated. Operation: ${operation.name}`,
        serviceName: serviceName,
        region: region,
        creationStarted: true 
    });

  } catch (error: any) {
    console.error('Failed to deploy service:', error);
    const errorMessage = error.details || error.message || 'An unknown error occurred.';
    sendEvent({ error: errorMessage });
  }
}
