import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const payload = await request.json();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (data: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Start the deployment but don't wait for it to finish.
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
              } = payload;
          
              try {
                  sendEvent({ message: 'Authenticating with Google Cloud...' });
                  const auth = new GoogleAuth({
                      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
                  }) as any;
                  const client = await auth.getClient();
                  const run = google.run({
                      version: 'v2',
                      auth: client,
                  });
          
                  sendEvent({ message: 'Constructing service configuration...' });
        const serviceConfig = {
            template: {
                gpuZonalRedundancyDisabled: gpuZonalRedundancyDisabled,
                scaling: {
                    minInstanceCount: minInstances,
                    maxInstanceCount: maxInstances,
                },
                nodeSelector: {accelerator: gpu},
                containers: [
                    {
                        image: containerImage,
                        ports: [{ containerPort: parseInt(containerPort, 10) }],
                        resources: {
                            limits: {
                                cpu,
                                memory,
                                "nvidia.com/gpu": "1",
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
        };    sendEvent({ message: `Initiating deployment for service '${serviceName}'...` });
        console.log('Service configuration:', JSON.stringify(serviceConfig, null, 2));

        await run.projects.locations.services.create({
          parent: `projects/${projectId}/locations/${region.toLowerCase()}`,
          serviceId: serviceName,
          requestBody: serviceConfig,
        });

    sendEvent({ 
      message: `Service '${serviceName}' creation initiated.`, 
      serviceName: serviceName,
      region: region,
      creationStarted: true 
    });

  } catch (error: any) {
    console.error('Failed to deploy service:', error);
    sendEvent({ error: error.message || 'An unknown error occurred.' });
  }
}
