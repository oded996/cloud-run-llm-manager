import { GoogleAuth } from 'google-auth-library';

let authClient: GoogleAuth | null = null;

export async function getAuthClient() {
  if (!authClient) {
    authClient = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  return authClient;
}
