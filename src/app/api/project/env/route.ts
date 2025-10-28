// src/app/api/project/env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const lockedProjectId = process.env.GCP_PROJECT_ID;

  return NextResponse.json({
    isProjectLocked: !!lockedProjectId,
    lockedProjectId: lockedProjectId || null,
  });
}
