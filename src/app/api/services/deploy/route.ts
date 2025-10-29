import { NextResponse } from 'next/server';
import { ServicesClient } from '@google-cloud/run';
import { google } from 'googleapis';
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

  try {

    sendEvent({ message: 'Initializing Google Cloud client...' });



    // The payload is the full service object. We need to extract the details.

    const nameParts = payload.name.split('/');

    const projectId = nameParts[1];

    const region = nameParts[3];

    const serviceName = nameParts[5];

    const gpu = payload.template.nodeSelector.accelerator;



    const regionConfig = SUPPORTED_REGIONS.find(r => r.name === region.toLowerCase());

    const gpuConfig = regionConfig?.gpus.find(g => g.accelerator === gpu);

    const isAlpha = gpuConfig?.status === 'Private Preview';



    let apiEndpoint = `${region.toLowerCase()}-run.googleapis.com`;

    if (isAlpha) {

        apiEndpoint = `run.googleapis.com`;

        sendEvent({ message: `Using alpha API endpoint for Private Preview GPU...` });

    }



    const runClient = new ServicesClient({ apiEndpoint });



    sendEvent({ message: 'Constructing service configuration...' });

    

                const serviceConfig = {

    

                    ...payload,

    

                    labels: {

    

                        'managed-by': 'llm-manager',

    

                    },

    

                };

    

                if (isAlpha) {

    

                    serviceConfig.launchStage = 'ALPHA';

    

                }

    

        

    

            if (serviceConfig.template.annotations?.['run.googleapis.com/network-interfaces']) {

    

                const subnet = JSON.parse(serviceConfig.template.annotations['run.googleapis.com/network-interfaces'])[0].subnetwork;

    

                const compute = google.compute({ version: 'v1', auth: runClient.auth });

    

                const subnetDetails = await compute.subnetworks.get({

    

                    project: projectId,

    

                    region: region.toLowerCase(),

    

                    subnetwork: subnet,

    

                });

    

                const networkName = subnetDetails.data.network?.split('/').pop();

    

                if (!networkName) {

    

                    throw new Error(`Could not determine network name for subnet ${subnet}`);

    

                }

    

                serviceConfig.template.annotations['run.googleapis.com/network-interfaces'] = `[{"network":"${networkName}","subnetwork":"${subnet}"}]`;

    

            }

    

        

    

            // For create requests, the name must be empty in the service object

    

            // and provided in the parent parameter.

    

            delete serviceConfig.name;

    

    

    

        sendEvent({ message: `Initiating deployment for service '${serviceName}'...` });

    

        

    

        const [operation] = await runClient.createService({

    

            parent: `projects/${projectId}/locations/${region.toLowerCase()}`,

    

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
