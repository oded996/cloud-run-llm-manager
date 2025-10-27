import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

import { ALL_REGION_NAMES } from '@/app/config/regions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
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

    let allServices = [];
    for (const region of ALL_REGION_NAMES) {
        try {
            const response = await run.projects.locations.services.list({
                parent: `projects/${projectId}/locations/${region}`,
            });
            if (response.data.services) {
                const managedServices = response.data.services.filter(
                    (service: any) => service.labels && service.labels['managed-by'] === 'llm-manager'
                );
                allServices.push(...managedServices);
            }
        } catch (error: any) {
            // Ignore errors for regions where the API might not be enabled
            // or which don't exist for the project.
            if (error.code !== 404 && error.code !== 403) {
                console.warn(`Could not fetch services for region ${region}:`, error.message);
            }
        }
    }

    return NextResponse.json(allServices);

  } catch (error: any) {
    console.error('Failed to list services:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
