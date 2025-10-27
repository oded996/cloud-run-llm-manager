import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId parameter is required' }, { status: 400 });
  }

  try {
    const storage = new Storage({ projectId });
    const [buckets] = await storage.getBuckets();

    const bucketDetails = await Promise.all(
      buckets.map(async (bucket) => {
        const [metadata] = await bucket.getMetadata();
        return {
          name: bucket.name,
          location: metadata.location,
        };
      })
    );

    return NextResponse.json(bucketDetails);
  } catch (error: any) {
    console.error('Failed to list all buckets:', error.message);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}
