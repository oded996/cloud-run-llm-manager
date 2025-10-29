// src/app/api/project/networking/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { SUPPORTED_REGIONS } from '@/app/config/regions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const authClient = await auth.getClient();
    google.options({ auth: authClient as any });

    const compute = google.compute('v1');

    // 1. Get all subnets across all regions
    const subnetsResponse = await compute.subnetworks.aggregatedList({
      project: projectId,
    });

    const aggregatedSubnets = subnetsResponse.data.items || {};
    
    // 2. Create a map of region -> list of subnets with their status
    const regionSubnetMap = new Map<string, { name: string; privateIpGoogleAccess: boolean }[]>();

    for (const key in aggregatedSubnets) {
        if (aggregatedSubnets[key].subnetworks) {
            for (const subnet of aggregatedSubnets[key].subnetworks) {
                if (subnet.region && subnet.name) {
                    const regionName = subnet.region.split('/').pop()!;
                    if (!regionSubnetMap.has(regionName)) {
                        regionSubnetMap.set(regionName, []);
                    }
                    regionSubnetMap.get(regionName)!.push({
                        name: subnet.name,
                        privateIpGoogleAccess: subnet.privateIpGoogleAccess || false,
                    });
                }
            }
        }
    }

    // 3. Structure the final response for supported regions
    const networkingStatus = SUPPORTED_REGIONS.map(region => ({
      region: region.name,
      description: region.description,
      subnets: regionSubnetMap.get(region.name) || [],
    }));

    return NextResponse.json(networkingStatus);
  } catch (error: any) {
    console.error('Error checking networking status:', error);
    // Check for specific error indicating Compute API is not enabled
    if (error.code === 403 && error.message?.includes('Compute Engine API has not been used')) {
        return NextResponse.json({ error: 'Compute Engine API is not enabled for this project.' }, { status: 412 });
    }
    return NextResponse.json(
      { error: 'An error occurred while checking networking status.' },
      { status: 500 }
    );
  }
}