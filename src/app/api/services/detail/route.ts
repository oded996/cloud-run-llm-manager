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

    const response = await run.projects.locations.services.get({
      name: `projects/${projectId}/locations/${region}/services/${serviceName}`,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to get service details:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
