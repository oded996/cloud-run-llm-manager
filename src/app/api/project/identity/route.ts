import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

async function getIdentity() {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();

    // First, try to get credentials and check for a service account email.
    // This works for service account key files and when running on GCP.
    if ('getCredentials' in client && typeof client.getCredentials === 'function') {
        const credentials = await client.getCredentials();
        if (credentials.client_email) {
            return {
                type: 'Service Account',
                email: credentials.client_email,
            };
        }
    }

    // If it's not a service account, it's likely user credentials from ADC.
    // Get an access token and call the userinfo endpoint.
    const tokenResponse = await client.getAccessToken();
    if (tokenResponse.token) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenResponse.token}`,
        },
      });

      if (response.ok) {
        const userInfo = await response.json();
        return {
          type: 'User Credential (ADC)',
          email: userInfo.email,
        };
      } else {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }
    }

    return {
      type: 'Unknown',
      email: 'Could not determine identity.',
    };
  } catch (error) {
    console.error('Error getting application default credentials:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: 'Error',
      email: errorMessage,
    };
  }
}

export async function GET() {
  const identity = await getIdentity();
  return NextResponse.json(identity);
}