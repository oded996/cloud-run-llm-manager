import { Logging } from '@google-cloud/logging';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const region = searchParams.get('region');
  const serviceName = searchParams.get('serviceName');
  const since = searchParams.get('since'); // ISO 8601 timestamp

  if (!projectId || !region || !serviceName) {
    return NextResponse.json({ error: 'Missing projectId, region, or serviceName' }, { status: 400 });
  }

  try {
    const logging = new Logging({ projectId });

    let filter = `resource.type="cloud_run_revision" resource.labels.service_name="${serviceName}" resource.labels.location="${region}"`;

    if (since) {
      // Add the timestamp filter if 'since' is provided
      filter += ` timestamp > "${since}"`;
    } else {
      // If no 'since' is provided, get logs from the last 5 minutes for the initial load
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toJSON();
      filter += ` timestamp > "${fiveMinutesAgo}"`;
    }

    const entries = await logging.getEntries({
      filter: filter,
      orderBy: 'timestamp asc',
      pageSize: 1000, // Get up to 1000 log entries per request
    });
    const formattedEntries = entries[0].map(entry => {
      const rawMessage = String(entry.data);
      // Default to the entry's severity, which can act as a fallback
      let level = entry.metadata.severity || 'DEFAULT';
      let message = rawMessage;

      // Attempt to parse a more specific level from the text payload
      // Example format: time=... level=INFO msg="..."
      const levelMatch = rawMessage.match(/level=([A-Z]+)/);
      if (levelMatch) {
        level = levelMatch[1];
      }

      // The message is the full text payload for now, can be refined if needed
      message = rawMessage;

      const receiveTimestamp = entry.metadata.receiveTimestamp as { seconds?: number | null, nanos?: number | null } | null;
      let isoTimestamp = new Date().toJSON(); // Default to now as a fallback

      if (receiveTimestamp && typeof receiveTimestamp.seconds === 'number') {
          isoTimestamp = new Date(receiveTimestamp.seconds * 1000 + (receiveTimestamp.nanos || 0) / 1e6).toJSON();
      }

      return {
        // Move timestamp formatting to the backend
        timestamp: new Date(entry.metadata.timestamp as any).toLocaleString(),
        level: level,
        message: message,
        // Also return the raw timestamp for the frontend to use for polling
        receiveTimestamp: isoTimestamp,
      };
    });

    return NextResponse.json(formattedEntries);

  } catch (error: any) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}
