import { Storage } from '@google-cloud/storage';

const METADATA_FILE_NAME = 'llm-manager-metadata.json';

// This function is the main entry point for the API route.
// It handles streaming a model from Hugging Face to GCS.
export async function POST(request: Request) {
  const { modelId, bucketName, hfToken, projectId, totalSize, files } = await request.json();

  if (!modelId || !bucketName || !projectId || !files) {
    return new Response('Missing modelId, bucketName, projectId, or files', { status: 400 });
  }

  // Use a TransformStream to send progress updates back to the client.
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const log = (message: string) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
    console.log(message);
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
  syncModelToGCS(writer, { modelId, bucketName, hfToken, projectId, totalSize, modelFiles: files, log, sendProgress, sendError });

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
    { modelId, bucketName, hfToken, projectId, totalSize, modelFiles, log, sendProgress, sendError }:
    { modelId: string, bucketName: string, hfToken?: string, projectId: string, totalSize: number, modelFiles: { name: string, size: number }[], log: (message: string) => void, sendProgress: (file: string, progress: number, total: number) => void, sendError: (error: string) => void }
) {
  try {
    log(`Starting sync of model ${modelId} to GCS bucket ${bucketName}.`);
    const storage = new Storage({ projectId });
    const bucket = storage.bucket(bucketName);
    const modelPathPrefix = modelId;
    const headers: HeadersInit = {};
    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }

    if (modelFiles.length === 0) {
      log(`No files found for model ${modelId}. Nothing to sync.`);
      writer.close();
      return;
    }

    log(`Found ${modelFiles.length} files for model ${modelId}. Starting sync...`);

    // 2. Iterate through each file and stream it to GCS.
    for (const file of modelFiles) {
      const relativePath = file.name;
      const gcsPath = `${modelPathPrefix}/${relativePath}`;
      const gcsFile = bucket.file(gcsPath);

      const [exists] = await gcsFile.exists();
      if (exists) {
        const [metadata] = await gcsFile.getMetadata();
        if (metadata.size == file.size) {
            log(`File ${relativePath} already exists in GCS with the correct size. Skipping.`);
            sendProgress(relativePath, file.size, file.size); // Notify client of skipped file
            continue;
        } else {
            log(`File ${relativePath} exists but has a different size. Expected: ${file.size}, Actual: ${metadata.size}. Re-downloading.`);
        }
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
        const fileSize = file.size || 0;
        let downloadedSize = 0;

        const gcsWriteStream = gcsFile.createWriteStream({
          highWaterMark: 16 * 1024 * 1024, // 16 MB buffer for better performance
        });
        const reader = downloadResponse.body!.getReader();

        gcsWriteStream.on('finish', () => {
            sendProgress(relativePath, fileSize, fileSize); // Final progress update
            log(`Successfully uploaded ${relativePath} to GCS.`);
            resolve();
        });
        gcsWriteStream.on('error', (err) => {
            log(`Error uploading ${relativePath}: ${err.message}`);
            reject(err);
        });

        const pump = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              gcsWriteStream.end();
              return;
            }

            downloadedSize += value.length;
            sendProgress(relativePath, downloadedSize, fileSize);

            // Write the data and check for backpressure.
            if (!gcsWriteStream.write(value)) {
              // The buffer is full, so we wait for it to drain before reading more.
              gcsWriteStream.once('drain', pump);
            } else {
              // The buffer has space, so we can ask for the next chunk immediately.
              pump();
            }
          }).catch(reject);
        }

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
    } catch {
        log('Could not download or parse existing metadata. Creating a new one.');
        metadata = {
            description: 'This bucket is managed by the Cloud Run LLM Manager.',
            models: [],
        };
    }

    const modelExists = metadata.models.some((m: { id: string }) => m.id === modelId);
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

  } catch (error: unknown) {
    console.error(`Error during sync for ${modelId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    sendError(errorMessage);
  } finally {
    // 5. Close the stream to the client.
    writer.close();
  }
}
