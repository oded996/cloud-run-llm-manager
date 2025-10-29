// src/app/api/services/update/route.ts
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
\n`));
  };

  updateService(payload, sendEvent).finally(() => {
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

async function updateService(payload: any, sendEvent: (data: any) => void) {
  try {
    sendEvent({ message: 'Initializing Google Cloud client...' });

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

    sendEvent({ message: 'Constructing updated service configuration...' });

    const serviceConfig = {
        ...payload,
        labels: {
            ...(payload.labels || {}),
            'managed-by': 'llm-manager',
        },
    };
    if (isAlpha) {
        serviceConfig.launchStage = 'ALPHA';
    }

    sendEvent({ message: `Initiating update for service '${serviceName}'...` });
    
    await runClient.updateService({
        service: serviceConfig,
    });

    sendEvent({ 
        message: `Service '${serviceName}' update initiated.`,
        serviceName: serviceName,
        region: region,
        creationStarted: true // Re-use the same event type to trigger redirect
    });

  } catch (error: any) {
    console.error('Failed to update service:', error);
    const errorMessage = error.details || error.message || 'An unknown error occurred.';
    sendEvent({ error: errorMessage });
  }
}
