import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { apiVersion, dataset, projectId, hasSanityCredentials } from "../../../../sanity/env";
import { PERSON_QUERY } from "../../../../sanity/lib/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSanityCredentials) {
    return NextResponse.json({
      source: "mock",
      hasSanityConfigured: false,
      members: [],
    });
  }

  try {
    const serverClient = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
    });

    const data = await serverClient.fetch(PERSON_QUERY);

    const rawMembers = (data || []).map((d: any) => {
      // Deduplicate spouses by _id
      const spouseMap = new Map<string, { _id: string; name: string }>();
      (d.spouses || []).forEach((s: any) => {
        if (s?._id && !spouseMap.has(s._id)) {
          spouseMap.set(s._id, { _id: s._id, name: s.name });
        }
      });

      return {
        _id: d._id,
        name: d.name,
        nickname: d.nickname || undefined,
        gender: d.gender || undefined,
        isDeceased: Boolean(d.isDeceased),
        birthDate: d.birthDate || undefined,
        deathDate: d.deathDate || undefined,
        photoUrl: d.photo?.asset?.url || undefined,
        bio: d.bio || undefined,
        isFounder: Boolean(d.isFounder),
        parents: d.parents || [],
        spouses: Array.from(spouseMap.values()),
      };
    });

    // Propagate isFounder to spouse if either partner has isFounder == true
    const memberMap = new Map<string, any>();
    rawMembers.forEach((m: any) => memberMap.set(m._id, m));

    rawMembers.forEach((m: any) => {
      if (m.isFounder) {
        (m.spouses || []).forEach((sp: any) => {
          const spouseObj = memberMap.get(sp._id);
          if (spouseObj) {
            spouseObj.isFounder = true;
          }
        });
      }
    });

    const members = Array.from(memberMap.values());

    return NextResponse.json({
      source: "sanity",
      hasSanityConfigured: true,
      projectId,
      members,
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
