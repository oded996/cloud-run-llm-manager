import { NextResponse } from 'next/server';

export async function GET() {
  const lockedProjectId = process.env.GCP_PROJECT_ID;
  const hfToken = process.env.HUGGING_FACE_HUB_TOKEN;

  return NextResponse.json({
    isProjectLocked: !!lockedProjectId,
    lockedProjectId: lockedProjectId || null,
    hfToken: hfToken || null,
  });
}
