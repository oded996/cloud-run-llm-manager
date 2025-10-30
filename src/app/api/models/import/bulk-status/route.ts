import { CloudBuildClient } from '@google-cloud/cloudbuild';
import { Storage } from '@google-cloud/storage';
import { NextRequest } from 'next/server';

const METADATA_FILE_NAME = 'llm-manager-metadata.json';

interface ModelToCheck {
  buildId: string;
  projectId: string;
  bucketName: string;
  modelId: string;
}

export async function POST(request: NextRequest) {
  const { modelsToCheck }: { modelsToCheck: ModelToCheck[] } = await request.json();

  if (!modelsToCheck || !Array.isArray(modelsToCheck) || modelsToCheck.length === 0) {
    return new Response('Missing or invalid modelsToCheck array', { status: 400 });
  }

  const updatedModels: { modelId: string, bucketName: string, status: string }[] = [];

  await Promise.all(modelsToCheck.map(async (model) => {
    const { buildId, projectId, bucketName, modelId } = model;

    try {
      const cloudBuildClient = new CloudBuildClient({ projectId });
      const storage = new Storage({ projectId });

      const [build] = await cloudBuildClient.getBuild({ projectId, id: buildId });

      if (!build || !build.status) {
        return;
      }

      const terminalStates = ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT', 'CANCELLED'];
      if (terminalStates.includes(build.status as string)) {
        const bucket = storage.bucket(bucketName);
        const metadataFile = bucket.file(METADATA_FILE_NAME);
        
        try {
          const [contents] = await metadataFile.download();
          const metadata = JSON.parse(contents.toString());

          const modelIndex = metadata.models.findIndex((m: { id: string }) => m.id === modelId);

          if (modelIndex > -1 && metadata.models[modelIndex].status === 'downloading') {
            const newStatus = build.status === 'SUCCESS' ? 'completed' : 'failed';
            metadata.models[modelIndex].status = newStatus;
            metadata.models[modelIndex].finishedAt = new Date().toISOString();
            
            await metadataFile.save(JSON.stringify(metadata, null, 2), {
              contentType: 'application/json',
            });
            
            console.log(`Bulk update: Updated metadata for model ${modelId} to ${newStatus}.`);
            updatedModels.push({ modelId, bucketName, status: newStatus });
          }
        } catch (error) {
          console.error(`Bulk update: Failed to update metadata for model ${modelId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Bulk update: Error fetching status for build ${buildId}:`, error);
    }
  }));

  return new Response(JSON.stringify({ updatedModels }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
