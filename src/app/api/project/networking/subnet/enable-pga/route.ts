// src/app/api/project/networking/subnet/enable-pga/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const { projectId, region, subnetName } = await request.json();

    if (!projectId || !region || !subnetName) {
      return NextResponse.json(
        { error: 'Project ID, region, and subnet name are required' },
        { status: 400 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const authClient = await auth.getClient();
    google.options({ auth: authClient as any });

    const compute = google.compute('v1');

    const operation = await compute.subnetworks.setPrivateIpGoogleAccess({
      project: projectId,
      region: region,
      subnetwork: subnetName,
      requestBody: {
        privateIpGoogleAccess: true,
      },
    });

    return NextResponse.json({ success: true, operation: operation.data });

  } catch (error: any) {
    console.error('Error enabling Private Google Access:', error);
    return NextResponse.json(
      { error: 'An error occurred while enabling Private Google Access.' },
      { status: 500 }
    );
  }
}
