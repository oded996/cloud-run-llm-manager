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

    const formattedEntries = entries[0].map(entry => ({
      timestamp: entry.metadata.timestamp,
      message: entry.data,
    }));

    return NextResponse.json(formattedEntries);

  } catch (error: any) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}
