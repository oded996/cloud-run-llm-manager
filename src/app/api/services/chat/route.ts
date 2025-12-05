// src/app/api/services/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { GaxiosOptions } from 'gaxios';

// Helper to convert a Node.js Readable stream to a Web ReadableStream
function nodeStreamToWebStream(nodeStream: NodeJS.ReadableStream): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      (nodeStream as any).destroy();
    },
  });
}

export async function POST(request: Request) {
  const { serviceUrl, path, payload, method = 'POST' } = await request.json();

  if (!serviceUrl || !path) {
    return NextResponse.json({ error: 'Missing serviceUrl or path' }, { status: 400 });
  }

  try {
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(serviceUrl);

    const proxyUrl = new URL(path, serviceUrl).toString();
    console.log(`[CHAT_PROXY] Forwarding streaming ${method} request to ${proxyUrl}`);

    const requestConfig: GaxiosOptions = {
        url: proxyUrl,
        method: method,
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
        },
        responseType: 'stream',
    };

    // gaxios uses the `data` property for the request body
    if (method !== 'GET' && payload) {
        requestConfig.data = payload;
    }

    const proxyResponse = await client.request(requestConfig as any);

    console.log(`[CHAT_PROXY] Received streaming response with status: ${proxyResponse.status}`);

    const nodeStream = proxyResponse.data as NodeJS.ReadableStream;
    const webStream = nodeStreamToWebStream(nodeStream);

    // Forward relevant headers from the downstream service to the client
    const headers = new Headers();
    const contentType = (proxyResponse.headers as any)['content-type'];
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    // These headers are important for streaming
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');

    return new Response(webStream, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: headers,
    });

  } catch (error: any) {
    console.error('[CHAT_PROXY] Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to proxy request: ${errorMessage}` }, { status: 500 });
  }
}
