import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export async function GET() {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform.read-only'],
    }) as any;
    const client = await auth.getClient();
    const resourceManager = google.cloudresourcemanager({
      version: 'v1',
      auth: client,
    });

    const response = await resourceManager.projects.list();
    return NextResponse.json({
      projects: response.data.projects || [],
      canListProjects: true,
    });
  } catch (error: any) {
    console.error('Failed to list projects:', error.message);
    // Check if the error is due to insufficient permissions
    if (error.code === 403) {
      return NextResponse.json({
        projects: [],
        canListProjects: false,
        error: 'Permission denied. You may need to enable the Cloud Resource Manager API or grant the "Project Viewer" role.',
      });
    }
    // For other errors
    return NextResponse.json({
        projects: [],
        canListProjects: false,
        error: error.message || 'An unknown error occurred.',
      }, { status: 500 });
  }
}
