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

    const resource = `projects/${projectId}/locations/${region}/services/${serviceName}`;
    const policy = await run.projects.locations.services.getIamPolicy({ resource });

    const invokerBinding = policy.data.bindings?.find(b => b.role === 'roles/run.invoker');
    const isPublic = invokerBinding?.members?.includes('allUsers') || false;
    const invokerPrincipals = invokerBinding?.members?.filter(m => m !== 'allUsers') || [];

    return NextResponse.json({ isPublic, invokerPrincipals });
  } catch (error: any) {
    console.error('Failed to get IAM policy:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { projectId, region, serviceName, isPublic, addPrincipal } = await request.json();

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

    const resource = `projects/${projectId}/locations/${region}/services/${serviceName}`;
    const policyResponse = await run.projects.locations.services.getIamPolicy({ resource });
    const policy = policyResponse.data;

    const invokerRole = 'roles/run.invoker';
    let invokerBinding = policy.bindings?.find(b => b.role === invokerRole);

    if (!invokerBinding) {
      invokerBinding = { role: invokerRole, members: [] };
      policy.bindings = [...(policy.bindings || []), invokerBinding];
    }
    
    invokerBinding.members = invokerBinding.members || [];

    if (addPrincipal) {
      let principal = addPrincipal;
      
      // If a prefix like `user:` exists, remove it.
      if (principal.includes(':')) {
        principal = principal.split(':')[1];
      }

      // Ensure the correct `serviceAccount:` prefix is used for service accounts.
      if (principal.endsWith('.gserviceaccount.com')) {
        principal = `serviceAccount:${principal}`;
      }

      if (!invokerBinding.members.includes(principal)) {
        invokerBinding.members.push(principal);
      }
    } else if (isPublic === true) {
      if (!invokerBinding.members.includes('allUsers')) {
        invokerBinding.members.push('allUsers');
      }
    } else if (isPublic === false) {
      invokerBinding.members = invokerBinding.members.filter(m => m !== 'allUsers');
    }

    await run.projects.locations.services.setIamPolicy({
      resource,
      requestBody: { policy },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to set IAM policy:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
