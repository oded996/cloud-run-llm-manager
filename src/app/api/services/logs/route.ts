import { Logging } from '@google-cloud/logging';
import { GoogleAuth } from 'google-auth-library';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const region = searchParams.get('region');
  const serviceName = searchParams.get('serviceName');

  if (!projectId || !region || !serviceName) {
    return new Response('Missing projectId, region, or serviceName', { status: 400 });
  }

  const {readable, writable} = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (data: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)).catch(() => {
      // Catch errors if client disconnects while writing.
    });
  };

  const streamLogs = async () => {
    let intervalId: NodeJS.Timeout | undefined;

    request.signal.onabort = () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('Client disconnected, stopping log poll.');
      }
    };

    try {
      const logging = new Logging({ projectId });

      const filter = `resource.type="cloud_run_revision" resource.labels.service_name="${serviceName}" resource.labels.location="${region}"`;
      
      let lastTimestamp = new Date().toJSON();

      const poll = async () => {
        if (request.signal.aborted) {
          return;
        }

        try {
          const entries = await logging.getEntries({
            filter: `${filter} timestamp > "${lastTimestamp}"`,
            orderBy: 'timestamp asc',
            pageSize: 100,
          });

          if (entries[0] && entries[0].length > 0) {
            for (const entry of entries[0]) {
              if (request.signal.aborted) return;
              console.log('Timestamp object:', entry.metadata.timestamp);
              sendEvent({
                timestamp: entry.metadata.timestamp,
                message: entry.data,
              });
              lastTimestamp = new Date((entry.metadata.timestamp as any).seconds * 1000).toJSON();
            }
          }
        } catch (err: any) {
          console.error("Error polling for logs:", err.message);
        }
      };
      
      poll();
      intervalId = setInterval(poll, 2000);

    } catch (error: any) {
      console.error('Failed to start log stream:', error);
      sendEvent({ error: error.message || 'An unknown error occurred.' });
    }
  };

  streamLogs();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
