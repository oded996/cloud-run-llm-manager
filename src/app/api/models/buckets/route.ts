import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';

const METADATA_FILE_NAME = 'llm-manager-metadata.json';

async function getProjectId() {
  const auth = new GoogleAuth();
  return await auth.getProjectId();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId parameter is required' }, { status: 400 });
  }

  try {
    const storage = new Storage({ projectId });
    const [buckets] = await storage.getBuckets();

    const managedBuckets = await Promise.all(
      buckets.map(async (bucket) => {
        const file = bucket.file(METADATA_FILE_NAME);
        const [exists] = await file.exists();
        if (exists) {
          try {
            const [metadataContents] = await file.download();
            const metadata = JSON.parse(metadataContents.toString());
            const [bucketMetadata] = await bucket.getMetadata();
            return {
              name: bucket.name,
              location: bucketMetadata.location.toLowerCase(),
              models: metadata.models || [],
            };
          } catch (e) {
            console.error(`Error reading metadata for bucket ${bucket.name}:`, e);
            return null; // Ignore buckets with invalid metadata
          }
        }
        return null;
      })
    );

    return NextResponse.json(managedBuckets.filter(b => b !== null));
  } catch (error: any) {
    console.error('Failed to list buckets:', error.message);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
    const { bucketName, location, projectId } = await request.json();

    if (!bucketName || !location || !projectId) {
        return NextResponse.json({ error: 'bucketName, location and projectId are required' }, { status: 400 });
    }

    try {
        const storage = new Storage({ projectId });
        const bucket = storage.bucket(bucketName);
        const [exists] = await bucket.exists();

        if (exists) {
            return NextResponse.json({ error: `Bucket ${bucketName} already exists.` }, { status: 409 });
        }

        await storage.createBucket(bucketName, {
            location,
        });

        const metadataFile = bucket.file(METADATA_FILE_NAME);
        const initialMetadata = {
            description: 'This bucket is managed by the Cloud Run LLM Manager. Do not delete this file unless you want to remove the bucket from the manager UI.',
            models: [],
        };

        await metadataFile.save(JSON.stringify(initialMetadata, null, 2), {
            contentType: 'application/json',
        });

        return NextResponse.json({ success: true, name: bucketName, location: location.toLowerCase(), models: [] });
    } catch (error: any) {
        console.error('Failed to create bucket:', error.message);
        return NextResponse.json(
            { error: error.message || 'An unknown error occurred.' },
            { status: 500 }
        );
    }
}
