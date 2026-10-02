import { NextResponse } from "next/server";
import { projectId, hasSanityCredentials } from "../../../../sanity/env";
import { client, PERSON_QUERY } from "../../../../sanity/lib/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSanityCredentials || !client) {
    return NextResponse.json({
      source: "mock",
      hasSanityConfigured: false,
      members: [],
    });
  }

  try {
    const members = await client.fetch(PERSON_QUERY);

    return NextResponse.json({
      source: "sanity",
      hasSanityConfigured: true,
      projectId,
      members: members || [],
    });
  } catch (error: any) {
    console.error("Error querying Sanity via server:", error);
    return NextResponse.json(
      {
        source: "error",
        hasSanityConfigured: true,
        error: error.message || "Failed to query Sanity",
        members: [],
      },
      { status: 500 }
    );
  }
}
