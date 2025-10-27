import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const services = searchParams.getAll('service'); // e.g., run.googleapis.com

  if (!projectId || services.length === 0) {
    return NextResponse.json({ error: 'projectId and at least one service parameter are required' }, { status: 400 });
  }

  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform.read-only'],
    }) as any;
    const client = await auth.getClient();
    const serviceUsage = google.serviceusage({
      version: 'v1',
      auth: client,
    });

    const results = await Promise.all(services.map(async (service) => {
      try {
        const response = await serviceUsage.services.get({
          name: `projects/${projectId}/services/${service}`,
        });
        return {
          service,
          isEnabled: response.data.state === 'ENABLED',
        };
      } catch (error: any) {
        // If the API returns a 404 or 403, it often means the API has never been used,
        // which is effectively 'disabled' for our purposes.
        if (error.code === 404 || error.code === 403) {
            return { service, isEnabled: false };
        }
        throw error; // Re-throw other errors
      }
    }));

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Failed to check service enablement:', error.message);
    return NextResponse.json(
        { error: error.message || 'An unknown error occurred.' },
        { status: 500 }
    );
  }
}
