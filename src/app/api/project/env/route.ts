import { NextResponse } from 'next/server';

export async function GET() {
  const lockedProjectId = process.env.GCP_PROJECT_ID;

  if (lockedProjectId) {
    return NextResponse.json({
      isProjectLocked: true,
      lockedProjectId,
    });
  }

  return NextResponse.json({
    isProjectLocked: false,
  });
}
