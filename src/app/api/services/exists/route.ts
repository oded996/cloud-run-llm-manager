import { NextResponse } from 'next/server';
import { ServicesClient } from '@google-cloud/run';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const region = searchParams.get('region')?.toLowerCase();
  const serviceName = searchParams.get('serviceName');

  if (!projectId || !region || !serviceName) {
    return NextResponse.json({ error: 'projectId, region, and serviceName are required' }, { status: 400 });
  }

  try {
    const runClient = new ServicesClient({
        apiEndpoint: `${region}-run.googleapis.com`,
    });

    const name = `projects/${projectId}/locations/${region}/services/${serviceName}`;
    
    await runClient.getService({ name });

    // If the above call succeeds without throwing an error, the service exists.
    return NextResponse.json({ exists: true });

  } catch (error: any) {
    // The client library throws an error with a `code` property for non-2xx responses.
    // A code of 5 corresponds to NOT_FOUND.
    if (error.code === 5) {
      return NextResponse.json({ exists: false });
    }

    // For other errors, return an error response
    console.error('Failed to check service existence:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}