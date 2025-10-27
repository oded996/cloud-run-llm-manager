import { Storage } from '@google-cloud/storage';
import { Transform } from 'stream';

const METADATA_FILE_NAME = 'llm-manager-metadata.json';

// This function is the main entry point for the API route.
// It handles streaming a model from Hugging Face to GCS.
export async function POST(request: Request) {
  const { modelId, bucketName, hfToken, projectId, totalSize } = await request.json();

  if (!modelId || !bucketName || !projectId) {
    return new Response('Missing modelId, bucketName, or projectId', { status: 400 });
  }

  // Use a TransformStream to send progress updates back to the client.
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const log = (message: string) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
  };

  const sendProgress = (file: string, progress: number, total: number) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ file, progress, total })}\n\n`));
  };

  const sendError = (error: string) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`));
    writer.close();
  }

  // Start the download process but don't wait for it to finish.
  // The response will be sent back to the client immediately with the readable stream.
  syncModelToGCS(writer, { modelId, bucketName, hfToken, projectId, totalSize, log, sendProgress, sendError });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// This function contains the core logic for syncing the model.
async function syncModelToGCS(
    writer: WritableStreamDefaultWriter,
    { modelId, bucketName, hfToken, projectId, totalSize, log, sendProgress, sendError }:
    { modelId: string, bucketName: string, hfToken?: string, projectId: string, totalSize: number, log: (message: string) => void, sendProgress: (file: string, progress: number, total: number) => void, sendError: (error: string) => void }
) {
  try {
    log(`Starting sync of model ${modelId} to GCS bucket ${bucketName}.`);
    const storage = new Storage({ projectId });
    const bucket = storage.bucket(bucketName);
    const modelPathPrefix = modelId;

    // 1. Fetch the list of files for the model from the Hugging Face API.
    const headers: HeadersInit = {};
    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }
    const modelApiUrl = `https://huggingface.co/api/models/${modelId}`;
    const response = await fetch(modelApiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch model info from Hugging Face Hub: ${response.status} ${errorText}`);
    }

    const modelInfo = await response.json();
    const modelFiles = modelInfo.siblings || [];

    if (modelFiles.length === 0) {
      log(`No files found for model ${modelId}. Nothing to sync.`);
      writer.close();
      return;
    }

    log(`Found ${modelFiles.length} files for model ${modelId}. Starting sync...`);

    // 2. Iterate through each file and stream it to GCS.
    for (const file of modelFiles) {
      const relativePath = file.rfilename;
      const gcsPath = `${modelPathPrefix}/${relativePath}`;
      const gcsFile = bucket.file(gcsPath);

      const [exists] = await gcsFile.exists();
      if (exists) {
        log(`File ${relativePath} already exists in GCS. Skipping.`);
        continue;
      }

      log(`File ${relativePath} not found in GCS. Downloading...`);
      const downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${relativePath}`;
      const downloadResponse = await fetch(downloadUrl, { headers });

      if (!downloadResponse.ok || !downloadResponse.body) {
        log(`Failed to download ${relativePath}: ${downloadResponse.statusText}`);
        continue;
      }

      // 3. Stream the file from the download URL to GCS, reporting progress along the way.
      await new Promise<void>((resolve, reject) => {
        const fileSize = Number(downloadResponse.headers.get('content-length')) || 0;
        let downloadedSize = 0;

        const gcsWriteStream = gcsFile.createWriteStream();
        const reader = downloadResponse.body!.getReader();

        const pump = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              gcsWriteStream.end();
              sendProgress(relativePath, fileSize, fileSize); // Final progress update
              log(`Successfully uploaded ${relativePath} to GCS.`);
              resolve();
              return;
            }

            gcsWriteStream.write(value);
            downloadedSize += value.length;
            sendProgress(relativePath, downloadedSize, fileSize);
            pump();
          }).catch(err => {
            gcsWriteStream.destroy(err);
            reject(err);
          });
        };

        pump();
      });
    }

    // 4. After all files are downloaded, update the metadata file.
    log('All files downloaded. Updating metadata...');
    const metadataFile = bucket.file(METADATA_FILE_NAME);
    let metadata;
    try {
        const [contents] = await metadataFile.download();
        metadata = JSON.parse(contents.toString());
    } catch (e) {
        log('Could not download or parse existing metadata. Creating a new one.');
        metadata = {
            description: 'This bucket is managed by the Cloud Run LLM Manager.',
            models: [],
        };
    }

    const modelExists = metadata.models.some((m: any) => m.id === modelId);
    if (!modelExists) {
        metadata.models.push({
            id: modelId,
            source: 'huggingface',
            size: totalSize,
            status: 'completed',
            downloadedAt: new Date().toISOString(),
        });
    }

    await metadataFile.save(JSON.stringify(metadata, null, 2), {
        contentType: 'application/json',
    });

    log(`Sync completed successfully for model ${modelId}.`);

  } catch (error: any) {
    console.error(`Error during sync for ${modelId}:`, error);
    sendError(error.message || 'An unknown error occurred.');
  } finally {
    // 5. Close the stream to the client.
    writer.close();
  }
}
