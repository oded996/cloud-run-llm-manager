// src/app/api/services/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export async function POST(request: Request) {
  const { serviceUrl, endpoint, payload, method = 'POST' } = await request.json();

  if (!serviceUrl || !endpoint) {
    return NextResponse.json({ error: 'serviceUrl and endpoint are required' }, { status: 400 });
  }

  try {
    console.log(`[CHAT_PROXY] Received request for serviceUrl: ${serviceUrl}, endpoint: ${endpoint}, method: ${method}`);

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(serviceUrl);
    const idToken = await client.idTokenProvider.fetchIdToken(serviceUrl);
    const headers = {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    };
    console.log('[CHAT_PROXY] Generated authentication headers.');

    const targetUrl = `${serviceUrl}${endpoint}`;
    console.log(`[CHAT_PROXY] Forwarding ${method} request to target: ${targetUrl}`);

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (method === 'POST' && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(targetUrl, fetchOptions);

    console.log(`[CHAT_PROXY] Received response with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CHAT_PROXY] Error from target service: ${errorText}`);
      return NextResponse.json({ error: `Request failed with status ${response.status}: ${errorText}` }, { status: response.status });
    }

    if (payload?.stream) {
      console.log('[CHAT_PROXY] Streaming response back to client.');
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      });
    }

    const data = await response.json();
    console.log('[CHAT_PROXY] Returning JSON response to client:', data);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Failed to proxy chat request:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
