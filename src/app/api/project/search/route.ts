import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform.read-only'],
    }) as any;
    const client = await auth.getClient();
    const resourceManager = google.cloudresourcemanager({
      version: 'v1',
      auth: client,
    });

    // Use a filter to search for projects by name or ID.
    // The `*` is a wildcard for partial matches.
    const response = await resourceManager.projects.list({
      filter: `name:*${query}* OR id:*${query}*`,
    });

    return NextResponse.json({
      projects: response.data.projects || [],
    });
  } catch (error: any) {
    console.error('Failed to search projects:', error.message);
    return NextResponse.json(
        { error: error.message || 'An unknown error occurred.' },
        { status: 500 }
    );
  }
}
