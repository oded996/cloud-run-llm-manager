import { Storage } from '@google-cloud/storage';
import { CloudBuildClient } from '@google-cloud/cloudbuild';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

const METADATA_FILE_NAME = 'llm-manager-metadata.json';

export async function POST(request: Request) {
  const { modelId, bucketName, projectId, totalSize } = await request.json();

  if (!modelId || !bucketName || !projectId) {
    return new Response('Missing modelId, bucketName, or projectId', { status: 400 });
  }

  try {
    // 1. Load the Cloud Build configuration from the YAML file.
    const yamlPath = path.join(process.cwd(), 'src', 'app', 'cloudbuild', 'ollama.yaml');
    const yamlFile = await fs.readFile(yamlPath, 'utf8');
    const buildConfig = yaml.load(yamlFile) as { steps: any[], timeout: string, options: any };

    // 2. Initialize clients for GCS and Cloud Build.
    const storage = new Storage({ projectId });
    const cloudBuildClient = new CloudBuildClient({ projectId });
    const bucket = storage.bucket(bucketName);

    // 3. Update metadata to indicate that the download is starting.
    const metadataFile = bucket.file(METADATA_FILE_NAME);
    let metadata: any;
    try {
      const [contents] = await metadataFile.download();
      metadata = JSON.parse(contents.toString());
    } catch (error) {
      console.log('Metadata file not found or invalid. Creating a new one.');
      metadata = {
        description: 'This bucket is managed by the Cloud Run LLM Manager.',
        models: [],
      };
    }

    // Clean up any previous attempts for this model before adding the new one.
    // This ensures we don't have duplicate or stuck entries.
    metadata.models = metadata.models.filter((m: { id: string }) => m.id !== modelId);

    const modelData = {
      id: modelId,
      source: 'ollama',
      size: totalSize,
      status: 'downloading',
      submittedAt: new Date().toISOString(),
    };

    metadata.models.push(modelData);

    await metadataFile.save(JSON.stringify(metadata, null, 2), {
      contentType: 'application/json',
    });

    // 4. Define substitutions for the Cloud Build job.
    const substitutions = {
      _MODEL_ID: modelId,
      _BUCKET_NAME: bucketName,
    };

    // 5. Create and submit the Cloud Build job.
    const timeoutSeconds = parseInt(buildConfig.timeout.replace('s', ''), 10);
    const [operation] = await cloudBuildClient.createBuild({
      projectId,
      build: {
        steps: buildConfig.steps,
        timeout: { seconds: timeoutSeconds },
        options: buildConfig.options,
        substitutions,
      },
    });

    const build = (operation.metadata as any)?.build;

    if (!build || !build.id) {
        throw new Error('Failed to create build job.');
    }

    console.log(`Started Cloud Build job ${build.id} for model ${modelId}.`);

    // 6. Update metadata with the build ID and log URL.
    metadata.models = metadata.models.map((m: { id: string }) => 
      m.id === modelId ? { ...m, buildId: build.id, logUrl: build.logUrl } : m
    );

    await metadataFile.save(JSON.stringify(metadata, null, 2), {
      contentType: 'application/json',
    });

    // 7. Return the build information to the client.
    return new Response(JSON.stringify({
      message: 'Cloud Build job started successfully.',
      buildId: build.id,
      logUrl: build.logUrl,
    }), {
      status: 202, // Accepted
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error(`Error starting Cloud Build job for ${modelId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
