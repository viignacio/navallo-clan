import { SanityClient } from "sanity";

interface PersonDoc {
  _id: string;
  name?: string;
  spouses?: Array<{ _ref: string; _key?: string }>;
  parents?: Array<{ _ref: string; _key?: string }>;
  children?: Array<{ _ref: string; _key?: string }>;
}

const cleanId = (id: string) => id.replace(/^drafts\./, "");
const genKey = () => Math.random().toString(36).substring(2, 9);

/**
 * Reconciles bidirectional links for a specific person or the entire clan dataset.
 * 1. Spouses: Person A <-> Person B
 * 2. Parents & Children: If C has parent P (and P has spouse S),
 *    then C has parents [P, S], and both P and S have child C.
 */
export async function syncPersonLinks(client: SanityClient, rawDocId?: string) {
  const allDocs: PersonDoc[] = await client.fetch(
    `*[_type == "person"] {
      _id,
      name,
      spouses,
      parents,
      children
    }`
  );

  const docMap = new Map<string, PersonDoc>();
  allDocs.forEach((d) => docMap.set(cleanId(d._id), d));

  // Determine target documents (single document or entire dataset)
  const targets = rawDocId
    ? [docMap.get(cleanId(rawDocId))].filter(Boolean) as PersonDoc[]
    : allDocs;

  // Track pending additions: Map<docId, { spouses, parents, children }>
  const pendingAdditions = new Map<
    string,
    { spouses: Set<string>; parents: Set<string>; children: Set<string> }
  >();

  const getAdditions = (id: string) => {
    const cid = cleanId(id);
    if (!pendingAdditions.has(cid)) {
      pendingAdditions.set(cid, {
        spouses: new Set<string>(),
        parents: new Set<string>(),
        children: new Set<string>(),
      });
    }
    return pendingAdditions.get(cid)!;
  };

  for (const current of targets) {
    const docId = cleanId(current._id);
    const spouseIds = new Set((current.spouses || []).map((s) => cleanId(s._ref)));
    const parentIds = new Set((current.parents || []).map((p) => cleanId(p._ref)));
    const childIds = new Set((current.children || []).map((c) => cleanId(c._ref)));

    // 1. Spouses: Person A <-> Person B
    for (const sId of spouseIds) {
      const spouseDoc = docMap.get(sId);
      if (spouseDoc) {
        const hasBackRef = (spouseDoc.spouses || []).some(
          (s) => cleanId(s._ref) === docId
        );
        if (!hasBackRef) {
          getAdditions(sId).spouses.add(docId);
        }
      }
    }

    // 2. Parents: If current has parent P, P must have current in children.
    // Also, if P has a spouse S, add S to current's parents and current to S's children.
    for (const pId of parentIds) {
      const parentDoc = docMap.get(pId);
      if (parentDoc) {
        const hasChildRef = (parentDoc.children || []).some(
          (c) => cleanId(c._ref) === docId
        );
        if (!hasChildRef) {
          getAdditions(pId).children.add(docId);
        }

        // Add parent's spouse as co-parent
        for (const sp of parentDoc.spouses || []) {
          const spouseId = cleanId(sp._ref);
          if (!parentIds.has(spouseId)) {
            getAdditions(docId).parents.add(spouseId);
          }
          const spouseDoc = docMap.get(spouseId);
          if (
            spouseDoc &&
            !(spouseDoc.children || []).some((c) => cleanId(c._ref) === docId)
          ) {
            getAdditions(spouseId).children.add(docId);
          }
        }
      }
    }

    // 3. Children: If current has child C, C must have current and current's spouses as parents
    const allParentIds = new Set([docId, ...spouseIds]);
    for (const cId of childIds) {
      const childDoc = docMap.get(cId);
      if (childDoc) {
        for (const pId of allParentIds) {
          const hasParentRef = (childDoc.parents || []).some(
            (p) => cleanId(p._ref) === pId
          );
          if (!hasParentRef) {
            getAdditions(cId).parents.add(pId);
          }
        }
      }

      // Also ensure current's spouses have this child
      for (const sId of spouseIds) {
        const spouseDoc = docMap.get(sId);
        if (
          spouseDoc &&
          !(spouseDoc.children || []).some((c) => cleanId(c._ref) === cId)
        ) {
          getAdditions(sId).children.add(cId);
        }
      }
    }
  }

  // Commit all pending additions in a single pass (1 patch per modified document)
  for (const [targetId, fields] of pendingAdditions.entries()) {
    const existingDoc = docMap.get(targetId);
    if (!existingDoc) continue;

    let patch = client.patch(existingDoc._id);
    let hasChanges = false;

    for (const [fieldName, refSet] of Object.entries(fields) as [
      "spouses" | "parents" | "children",
      Set<string>
    ][]) {
      if (refSet.size === 0) continue;
      const existingRefs = new Set(
        (existingDoc[fieldName] || []).map((r) => cleanId(r._ref))
      );
      const newItems = Array.from(refSet)
        .filter((rId) => !existingRefs.has(rId))
        .map((rId) => ({
          _type: "reference",
          _ref: rId,
          _key: genKey(),
        }));

      if (newItems.length > 0) {
        patch = patch
          .setIfMissing({ [fieldName]: [] })
          .insert("after", `${fieldName}[-1]`, newItems);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      try {
        await patch.commit({ autoGenerateArrayKeys: true });
      } catch (err) {
        console.warn(`Failed to commit reciprocal patch for ${targetId}:`, err);
      }
    }
  }
}

export async function syncAllClanLinks(client: SanityClient) {
  return syncPersonLinks(client);
}
