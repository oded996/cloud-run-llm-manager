import { Storage } from '@google-cloud/storage';

const METADATA_FILE_NAME = 'llm-manager-metadata.json';

// This function is the main entry point for the API route.
// It handles streaming an Ollama model from the registry to GCS.
export async function POST(request: Request) {
  const { modelId, bucketName, projectId, totalSize, files, manifest } = await request.json();

  if (!modelId || !bucketName || !projectId || !files || !manifest) {
    return new Response('Missing required parameters', { status: 400 });
  }

  // Use a TransformStream to send progress updates back to the client.
  const {readable, writable} = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendProgress = (file: string, progress: number, total: number) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ file, progress, total })}\n\n`));
  };

  const sendError = (error: string) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`));
    writer.close();
  }

  const log = (message: string) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
    console.log(message);
  };

  // Start the download process but don't wait for it to finish.
  syncModelToGCS(writer, { modelId, bucketName, projectId, totalSize, modelFiles: files, manifest, log, sendProgress, sendError });

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
    { modelId, bucketName, projectId, totalSize, modelFiles, manifest, log, sendProgress, sendError }:
    { modelId: string, bucketName: string, projectId: string, totalSize: number, modelFiles: { name: string, size: number }[], manifest: any, log: (message: string) => void, sendProgress: (file: string, progress: number, total: number) => void, sendError: (error: string) => void }
) {
  try {
    const [modelName, tag] = modelId.split(':');
    log(`Starting sync of Ollama model ${modelId} to GCS bucket ${bucketName}.`);
    const storage = new Storage({ projectId });
    const bucket = storage.bucket(bucketName);

    // Create placeholder files to ensure directories exist in the FUSE mount
    log('Ensuring base directories exist...');
    await bucket.file('ollama/manifests/').save('');
    await bucket.file('ollama/blobs/').save('');
    log('Base directories ensured.');

    // 1. Save the manifest file to the correct OCI structure.
    log('Saving manifest to GCS...');
    const manifestPath = `ollama/manifests/registry.ollama.ai/library/${modelName}/${tag || 'latest'}`;
    const manifestFile = bucket.file(manifestPath);
    await manifestFile.save(JSON.stringify(manifest, null, 2), {
        contentType: 'application/json',
    });
    log('Manifest saved.');

    // 2. Iterate through each file (layers and config) and stream it to the blobs directory.
    for (const file of modelFiles) {
      const digest = file.name; // e.g., "sha256:12345..."
      const gcsFilename = digest.replace(':', '-'); // "sha256-12345..."
      const gcsPath = `ollama/blobs/${gcsFilename}`;
      const gcsFile = bucket.file(gcsPath);

      const [exists] = await gcsFile.exists();
      if (exists) {
        const [metadata] = await gcsFile.getMetadata();
        if (metadata.size == file.size) {
            log(`Blob ${digest.substring(0, 15)}... already exists in GCS with the correct size. Skipping.`);
            sendProgress(digest, file.size, file.size);
            continue;
        } else {
            log(`Blob ${digest.substring(0, 15)}... exists but has a different size. Re-downloading.`);
        }
      }

      log(`Downloading blob ${digest.substring(0, 15)}...`);
      const downloadUrl = `https://registry.ollama.ai/v2/library/${modelName}/blobs/${digest}`;
      const downloadResponse = await fetch(downloadUrl);

      if (!downloadResponse.ok || !downloadResponse.body) {
        throw new Error(`Failed to download blob ${digest}: ${downloadResponse.statusText}`);
      }

      // 3. Stream the file from the download URL to GCS, reporting progress.
      await new Promise<void>((resolve, reject) => {
        const fileSize = file.size || 0;
        let downloadedSize = 0;

        const gcsWriteStream = gcsFile.createWriteStream();
        const reader = downloadResponse.body!.getReader();

        const pump = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              gcsWriteStream.end();
              sendProgress(digest, fileSize, fileSize);
              log(`Successfully uploaded blob ${digest.substring(0, 15)}...`);
              resolve();
              return;
            }

            gcsWriteStream.write(value);
            downloadedSize += value.length;
            sendProgress(digest, downloadedSize, fileSize);
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
            source: 'ollama',
            size: totalSize,
            status: 'completed',
            downloadedAt: new Date().toISOString(),
        });
    } else {
        // If it exists, update its status
        metadata.models = metadata.models.map((m: any) => 
            m.id === modelId ? { ...m, status: 'completed', size: totalSize, downloadedAt: new Date().toISOString() } : m
        );
    }

    await metadataFile.save(JSON.stringify(metadata, null, 2), {
        contentType: 'application/json',
    });

    log(`Sync completed successfully for Ollama model ${modelId}.`);

  } catch (error: unknown)
   {
    console.error(`Error during Ollama sync for ${modelId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    sendError(errorMessage);
  } finally {
    writer.close();
  }
}
