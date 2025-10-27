import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    projects: [
      { id: 'cloud-run-demo', name: 'Cloud Run Demo' },
      { id: 'another-project', name: 'Another Project' },
    ],
  });
}
