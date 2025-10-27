import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const region = searchParams.get('region');
  const serviceName = searchParams.get('serviceName');

  if (!projectId || !region || !serviceName) {
    return NextResponse.json({ error: 'projectId, region, and serviceName are required' }, { status: 400 });
  }

  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    }) as any;
    const client = await auth.getClient();
    const run = google.run({
      version: 'v2',
      auth: client,
    });

    await run.projects.locations.services.get({
      name: `projects/${projectId}/locations/${region}/services/${serviceName}`,
    });

    // If the above call succeeds, the service exists
    return NextResponse.json({ exists: true });
  } catch (error: any) {
    // A 404 error means the service does not exist, which is a valid state
    if (error.code === 404) {
      return NextResponse.json({ exists: false });
    }
    // For other errors, return an error response
    console.error('Failed to check service existence:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
