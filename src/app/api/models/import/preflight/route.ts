import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { modelId, hfToken } = await request.json();

  if (!modelId) {
    return NextResponse.json({ error: 'modelId is required' }, { status: 400 });
  }

  try {
    const headers: HeadersInit = {};
    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }

    const modelApiUrl = `https://huggingface.co/api/models/${modelId}`;
    const response = await fetch(modelApiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch model info from Hugging Face Hub: ${response.status}`;
      if (response.status === 401) {
        errorMessage = 'Unauthorized. The provided Hugging Face token may be invalid or missing for a gated model.';
      }
      console.error(`HF API Error for ${modelId}: ${errorText}`);
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const modelInfo = await response.json();

    // Proactive check: if model is marked as gated, a token is required.
    if (modelInfo.gated && !hfToken) {
        return NextResponse.json({ 
            error: `Model '${modelId}' is gated. A Hugging Face token is required for access.` 
        }, { status: 401 });
    }

    const files = modelInfo.siblings?.map((file: any) => file.rfilename) || [];

    if (files.length === 0) {
      return NextResponse.json({ error: `No files found for model ${modelId}.` }, { status: 404 });
    }

    // To get the size, we have to send a HEAD request for each file's LFS url
    let isGatedContentSuspected = false;
    const fileDetails = await Promise.all(
        modelInfo.siblings.map(async (file: any) => {
            const fileUrl = `https://huggingface.co/${modelId}/resolve/main/${file.rfilename}`;
            const fileResponse = await fetch(fileUrl, { method: 'HEAD', headers });
            const size = fileResponse.headers.get('content-length');
            const parsedSize = size ? parseInt(size, 10) : 0;

            // Heuristic check: if a model file is tiny, it's likely an LFS pointer
            // indicating that authentication is needed to get the real file.
            const isModelFile = file.rfilename.endsWith('.safetensors') || file.rfilename.endsWith('.bin') || file.rfilename.endsWith('.gguf');
            if (isModelFile && parsedSize < 1024) {
                isGatedContentSuspected = true;
            }

            return {
                name: file.rfilename,
                size: parsedSize,
            };
        })
    );

    // If we suspect gated content based on file sizes and have no token, ask for one.
    if (isGatedContentSuspected && !hfToken) {
        return NextResponse.json({ 
            error: `Model '${modelId}' appears to contain gated files. A Hugging Face token is required for access.` 
        }, { status: 401 });
    }

    const totalSize = fileDetails.reduce((acc: number, file: any) => acc + file.size, 0);

    return NextResponse.json({
      files: fileDetails,
      totalSize,
    });

  } catch (error: any) {
    console.error(`Failed during pre-flight check for ${modelId}:`, error.message);
    return NextResponse.json(
      { error: 'An internal error occurred while fetching model details.' },
      { status: 500 }
    );
  }
}
