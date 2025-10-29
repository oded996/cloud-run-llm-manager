// src/app/api/project/env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const hfToken = process.env.HUGGING_FACE_HUB_TOKEN || '';
  return NextResponse.json({ hfToken });
}