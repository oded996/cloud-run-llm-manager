// src/app/api/services/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export async function POST(request: Request) {
  const { serviceUrl, path, payload, method = 'POST' } = await request.json();

  if (!serviceUrl || !path) {
    return NextResponse.json({ error: 'Missing serviceUrl or path' }, { status: 400 });
  }

  try {
    console.log(`[CHAT_PROXY] Authenticating to call ${serviceUrl}`);
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(serviceUrl);

    const proxyUrl = new URL(path, serviceUrl).toString();
    console.log(`[CHAT_PROXY] Forwarding ${method} request to ${proxyUrl}`);

    const proxyResponse = await client.request({
      url: proxyUrl,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(method !== 'GET' && { body: JSON.stringify(payload) }),
    });

    console.log(`[CHAT_PROXY] Received response with status: ${proxyResponse.status}`);

    const contentType = proxyResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await proxyResponse.data;
      console.log('[CHAT_PROXY] Returning JSON response to client:', data);
      return NextResponse.json(data as any);
    }

    console.log('[CHAT_PROXY] Returning non-JSON response to client.');
    return new Response(proxyResponse.data as any, {
      status: proxyResponse.status,
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error: any) {
    console.error('[CHAT_PROXY] Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to proxy request: ${errorMessage}` }, { status: 500 });
  }
}
