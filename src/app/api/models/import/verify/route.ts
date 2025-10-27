import { Storage } from '@google-cloud/storage';
import { NextRequest, NextResponse } from 'next/server';

const METADATA_FILE_NAME = 'llm-manager-metadata.json';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucketName = searchParams.get('bucketName');
  const modelId = searchParams.get('modelId');
  const projectId = searchParams.get('projectId');

  if (!bucketName || !modelId || !projectId) {
    return NextResponse.json({ error: 'Missing bucketName, modelId, or projectId' }, { status: 400 });
  }

  try {
    const storage = new Storage({ projectId });
    const bucket = storage.bucket(bucketName);
    const metadataFile = bucket.file(METADATA_FILE_NAME);

    const [exists] = await metadataFile.exists();
    if (!exists) {
      return NextResponse.json({ verified: false, error: 'Metadata file not found.' }, { status: 404 });
    }

    const [contents] = await metadataFile.download();
    const metadata = JSON.parse(contents.toString());

    const model = metadata.models.find((m: { id: string, status: string }) => m.id === modelId);

    if (model && model.status === 'completed') {
      return NextResponse.json({ verified: true });
    } else {
      return NextResponse.json({ verified: false, error: 'Model not found or not completed in metadata.' });
    }
  } catch (error: unknown) {
    console.error(`Verification failed for ${modelId} in ${bucketName}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during verification.';
    return NextResponse.json({ verified: false, error: errorMessage }, { status: 500 });
  }
}
