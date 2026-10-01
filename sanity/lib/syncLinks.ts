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

interface FieldSets {
  spouses: Set<string>;
  parents: Set<string>;
  children: Set<string>;
}

const createFieldSets = (): FieldSets => ({
  spouses: new Set<string>(),
  parents: new Set<string>(),
  children: new Set<string>(),
});

/**
 * Reconciles bidirectional links for a specific person or the entire clan dataset.
 * Handles both reciprocal ADDITIONS and reciprocal REMOVALS:
 * 1. Spouses: Person A <-> Person B
 * 2. Parents & Children:
 *    - Addition: If C has parent P (and P has spouse S), C gets [P, S] as parents, P and S get C as child.
 *    - Removal: If P unlinks C as child, C unlinks [P, S] as parents, and S unlinks C as child.
 *               If C unlinks P as parent, P and S unlink C as child.
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
  const idVersionsMap = new Map<string, Set<string>>();

  for (const d of allDocs) {
    const cid = cleanId(d._id);
    if (!idVersionsMap.has(cid)) {
      idVersionsMap.set(cid, new Set());
    }
    idVersionsMap.get(cid)!.add(d._id);

    // Prefer draft document for most up-to-date state
    if (!docMap.has(cid) || d._id.startsWith("drafts.")) {
      docMap.set(cid, d);
    }
  }

  const pendingAdditions = new Map<string, FieldSets>();
  const pendingRemovals = new Map<string, FieldSets>();

  const getAdditions = (id: string) => {
    const cid = cleanId(id);
    if (!pendingAdditions.has(cid)) pendingAdditions.set(cid, createFieldSets());
    return pendingAdditions.get(cid)!;
  };

  const getRemovals = (id: string) => {
    const cid = cleanId(id);
    if (!pendingRemovals.has(cid)) pendingRemovals.set(cid, createFieldSets());
    return pendingRemovals.get(cid)!;
  };

  // 1. REMOVALS PASS: If a specific document was modified/published, check for unlinks
  if (rawDocId) {
    const currentDoc = docMap.get(cleanId(rawDocId));
    if (currentDoc) {
      const docId = cleanId(currentDoc._id);
      const spouseIds = new Set((currentDoc.spouses || []).map((s) => cleanId(s._ref)));
      const parentIds = new Set((currentDoc.parents || []).map((p) => cleanId(p._ref)));
      const childIds = new Set((currentDoc.children || []).map((c) => cleanId(c._ref)));

      for (const otherDoc of docMap.values()) {
        const otherId = cleanId(otherDoc._id);
        if (otherId === docId) continue;

        const otherParentIds = new Set((otherDoc.parents || []).map((p) => cleanId(p._ref)));
        const otherChildIds = new Set((otherDoc.children || []).map((c) => cleanId(c._ref)));
        const otherSpouseIds = new Set((otherDoc.spouses || []).map((s) => cleanId(s._ref)));

        // A. If otherDoc had current as parent, but current no longer has otherDoc as child:
        if (otherParentIds.has(docId) && !childIds.has(otherId)) {
          getRemovals(otherId).parents.add(docId);
          for (const sId of spouseIds) {
            getRemovals(otherId).parents.add(sId);
            getRemovals(sId).children.add(otherId);
          }
        }

        // B. If otherDoc had current as child, but current no longer has otherDoc as parent:
        if (otherChildIds.has(docId) && !parentIds.has(otherId)) {
          getRemovals(otherId).children.add(docId);
          const otherSpouses = new Set((otherDoc.spouses || []).map((s) => cleanId(s._ref)));
          for (const sId of otherSpouses) {
            getRemovals(sId).children.add(docId);
            getRemovals(docId).parents.add(sId);
          }
        }

        // C. If otherDoc had current as spouse, but current no longer has otherDoc as spouse:
        if (otherSpouseIds.has(docId) && !spouseIds.has(otherId)) {
          getRemovals(otherId).spouses.add(docId);
        }
      }
    }
  }

  // 2. ADDITIONS PASS: Reconcile reciprocal links across targets
  const targets = rawDocId
    ? [docMap.get(cleanId(rawDocId))].filter(Boolean) as PersonDoc[]
    : Array.from(docMap.values());

  for (const current of targets) {
    const docId = cleanId(current._id);
    const spouseIds = new Set((current.spouses || []).map((s) => cleanId(s._ref)));
    const parentIds = new Set((current.parents || []).map((p) => cleanId(p._ref)));
    const childIds = new Set((current.children || []).map((c) => cleanId(c._ref)));

    // A. Spouses: Person A <-> Person B
    for (const sId of spouseIds) {
      if (getRemovals(sId).spouses.has(docId)) continue;
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

    // B. Parents: If current has parent P, P must have current in children
    for (const pId of parentIds) {
      if (getRemovals(pId).children.has(docId)) continue;
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
          if (getRemovals(docId).parents.has(spouseId)) continue;
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

    // C. Children: If current has child C, C must have current (and spouses) as parents
    const allParentIds = new Set([docId, ...spouseIds]);
    for (const cId of childIds) {
      if (getRemovals(cId).parents.has(docId)) continue;
      const childDoc = docMap.get(cId);
      if (childDoc) {
        for (const pId of allParentIds) {
          if (getRemovals(cId).parents.has(pId)) continue;
          const hasParentRef = (childDoc.parents || []).some(
            (p) => cleanId(p._ref) === pId
          );
          if (!hasParentRef) {
            getAdditions(cId).parents.add(pId);
          }
        }
      }

      // Ensure current's spouses have this child
      for (const sId of spouseIds) {
        if (getRemovals(sId).children.has(cId)) continue;
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

  // 3. COMMIT PATCHES: Apply additions and removals to documents
  const allTouchedDocIds = new Set([
    ...pendingRemovals.keys(),
    ...pendingAdditions.keys(),
  ]);

  for (const targetId of allTouchedDocIds) {
    const existingDoc = docMap.get(targetId);
    if (!existingDoc) continue;

    const removals = pendingRemovals.get(targetId);
    const additions = pendingAdditions.get(targetId);

    const fields: Array<"spouses" | "parents" | "children"> = ["spouses", "parents", "children"];
    const fieldPatches: Record<string, any> = {};
    let hasChanges = false;

    for (const field of fields) {
      const fieldRemovals = removals ? removals[field] : new Set<string>();
      const fieldAdditions = additions ? additions[field] : new Set<string>();

      if (fieldRemovals.size === 0 && fieldAdditions.size === 0) continue;

      const currentItems = (existingDoc[field] || []) as Array<{
        _ref: string;
        _key?: string;
        _type?: string;
      }>;

      // Filter out removals
      const keptItems = currentItems.filter(
        (item) => !fieldRemovals.has(cleanId(item._ref))
      );

      // Add missing additions
      const keptIds = new Set(keptItems.map((item) => cleanId(item._ref)));
      const itemsToAdd = Array.from(fieldAdditions)
        .filter((id) => !keptIds.has(id))
        .map((id) => ({
          _type: "reference",
          _ref: id,
          _key: genKey(),
        }));

      const finalItems = [...keptItems, ...itemsToAdd];

      const currentIds = currentItems.map((item) => cleanId(item._ref));
      const finalIds = finalItems.map((item) => cleanId(item._ref));

      const isChanged =
        currentIds.length !== finalIds.length ||
        currentIds.some((id, idx) => id !== finalIds[idx]);

      if (isChanged) {
        fieldPatches[field] = finalItems;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      // Patch all versions of this document (e.g. draft and published)
      const docVersions = idVersionsMap.get(targetId) || new Set([existingDoc._id]);
      for (const docVersionId of docVersions) {
        try {
          await client.patch(docVersionId).set(fieldPatches).commit({ autoGenerateArrayKeys: true });
        } catch (err) {
          console.warn(`Failed to commit patch for ${docVersionId}:`, err);
        }
      }
    }
  }
}

export async function syncAllClanLinks(client: SanityClient) {
  return syncPersonLinks(client);
}
