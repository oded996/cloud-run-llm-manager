import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const { projectId, permissions } = await request.json();

  if (!projectId || !permissions || !Array.isArray(permissions)) {
    return NextResponse.json({ error: 'projectId and a permissions array are required' }, { status: 400 });
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

    const response = await resourceManager.projects.testIamPermissions({
      resource: projectId,
      requestBody: {
        permissions: permissions,
      },
    });

    const grantedPermissions = response.data.permissions || [];
    const results = permissions.map(p => ({
      permission: p,
      isGranted: grantedPermissions.includes(p),
    }));

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Failed to test IAM permissions:', error.message);
    return NextResponse.json(
        { error: error.message || 'An unknown error occurred.' },
        { status: 500 }
    );
  }
}