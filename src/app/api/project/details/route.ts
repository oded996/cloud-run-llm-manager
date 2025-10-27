import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId parameter is required' }, { status: 400 });
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

    const response = await resourceManager.projects.get({ projectId });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`Failed to get project ${projectId}:`, error.message);
    return NextResponse.json(
        { error: `Could not retrieve details for project ${projectId}. It may not exist or you may not have permission to view it.` },
        { status: error.code || 500 }
    );
  }
}
