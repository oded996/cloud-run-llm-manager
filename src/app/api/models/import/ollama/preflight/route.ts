import { NextResponse } from 'next/server';

interface Manifest {
    schemaVersion: number;
    mediaType: string;
    config: {
        mediaType: string;
        size: number;
        digest: string;
    };
    layers: {
        mediaType: string;
        size: number;
        digest: string;
    }[];
}

export async function POST(request: Request) {
    const { modelId } = await request.json();

    if (!modelId) {
        return NextResponse.json({ error: 'Missing modelId' }, { status: 400 });
    }

    let [model, tag] = modelId.split(':');
    if (!tag) {
        tag = 'latest';
    }

    try {
        const manifestUrl = `https://registry.ollama.ai/v2/library/${model}/manifests/${tag}`;
        const response = await fetch(manifestUrl, {
            headers: {
                // The Ollama registry sometimes returns text/plain, but we need to ask for the correct OCI media type.
                'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch manifest for ${modelId}: ${response.status} ${errorText}`);
            return NextResponse.json({ error: `Model not found or registry error: ${errorText}` }, { status: response.status });
        }

        const manifest: Manifest = await response.json();

        if (!manifest.layers || manifest.layers.length === 0) {
            return NextResponse.json({ error: 'Manifest does not contain any layers.' }, { status: 400 });
        }

        // Also include the config blob in the files to be downloaded
        const files = [
            { name: manifest.config.digest, size: manifest.config.size },
            ...manifest.layers.map(layer => ({
                name: layer.digest,
                size: layer.size,
            }))
        ];

        const totalSize = files.reduce((acc, file) => acc + file.size, 0);

        // Pass the full manifest back to the client, it will be needed for the download step.
        return NextResponse.json({ files, totalSize, manifest });

    } catch (error: unknown) {
        console.error(`Error during Ollama preflight check for ${modelId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
