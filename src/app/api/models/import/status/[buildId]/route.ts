import { CloudBuildClient } from '@google-cloud/cloudbuild';
import { Storage } from '@google-cloud/storage';
import { NextRequest } from 'next/server';

const METADATA_FILE_NAME = 'llm-manager-metadata.json';

export async function GET(request: NextRequest, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  const projectId = request.nextUrl.searchParams.get('projectId');
  const bucketName = request.nextUrl.searchParams.get('bucketName');
  const modelId = request.nextUrl.searchParams.get('modelId');

  if (!projectId || !bucketName || !modelId) {
    return new Response('Missing projectId, bucketName, or modelId in query parameters', { status: 400 });
  }
  try {
    const cloudBuildClient = new CloudBuildClient({ projectId });
    const storage = new Storage({ projectId });

    // 1. Get the build details from Cloud Build API.
    const [build] = await cloudBuildClient.getBuild({ projectId, id: buildId });

    if (!build) {
      return new Response(JSON.stringify({ error: 'Build not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch the logs from the GCS bucket.
    let logs = 'Logs are not available yet.';
    if (build.logsBucket) {
      const logBucketName = build.logsBucket.split('/').pop() || '';
      const logFileName = `log-${build.id}.txt`;
      const logFile = storage.bucket(logBucketName).file(logFileName);
      
      try {
        const [logContents] = await logFile.download();
        logs = logContents.toString();
      } catch (error) {
        console.warn(`Could not fetch logs for build ${buildId}:`, error);
        logs = 'Logs are being generated...';
      }
    }

    // 3. If the build is in a terminal state, update the metadata file.
    const terminalStates = ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT', 'CANCELLED'];
    if (build.status && terminalStates.includes(build.status as string)) {
      const bucket = storage.bucket(bucketName);
      const metadataFile = bucket.file(METADATA_FILE_NAME);
      
      try {
        const [contents] = await metadataFile.download();
        const metadata = JSON.parse(contents.toString());

        const modelIndex = metadata.models.findIndex((m: { id: string }) => m.id === modelId);

        if (modelIndex > -1 && metadata.models[modelIndex].status !== 'completed' && metadata.models[modelIndex].status !== 'failed') {
          metadata.models[modelIndex].status = build.status === 'SUCCESS' ? 'completed' : 'failed';
          metadata.models[modelIndex].finishedAt = new Date().toISOString();
          
          await metadataFile.save(JSON.stringify(metadata, null, 2), {
            contentType: 'application/json',
          });
          console.log(`Updated metadata for model ${modelId} to ${metadata.models[modelIndex].status}.`);
        }
      } catch (error) {
        console.error(`Failed to update metadata for model ${modelId}:`, error);
        // Don't block the response if metadata update fails.
      }
    }

    // 4. Return the build status and logs.
    return new Response(JSON.stringify({
      status: build.status,
      logs: logs,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error(`Error fetching status for build ${buildId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
