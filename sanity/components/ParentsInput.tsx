import React, { useEffect, useRef } from "react";
import { ArrayOfObjectsInputProps, insert, useClient, useFormValue } from "sanity";

export function ParentsInput(props: ArrayOfObjectsInputProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const rawDocId = useFormValue(["_id"]) as string | undefined;
  const childId = rawDocId ? rawDocId.replace(/^drafts\./, "") : undefined;
  const isSyncingRef = useRef(false);
  const prevParentsRef = useRef<string[] | null>(null);

  useEffect(() => {
    const parentRefs = (props.value || []) as Array<{ _ref?: string; _key?: string }>;
    const currentParentIds = parentRefs
      .map((p) => p._ref?.replace(/^drafts\./, ""))
      .filter(Boolean) as string[];

    // Baseline on mount
    if (prevParentsRef.current === null) {
      prevParentsRef.current = currentParentIds;
    } else {
      // Check for removed parents
      const removedParentIds = prevParentsRef.current.filter(
        (oldId) => !currentParentIds.includes(oldId)
      );
      prevParentsRef.current = currentParentIds;

      if (removedParentIds.length > 0 && childId) {
        for (const pId of removedParentIds) {
          const targetParentIds = [pId, `drafts.${pId}`];
          for (const tId of targetParentIds) {
            try {
              client
                .patch(tId)
                .unset([
                  `children[_ref=="${childId}"]`,
                  `children[_ref=="drafts.${childId}"]`,
                ])
                .commit()
                .catch(() => {});
            } catch {
              // Ignore
            }
          }
        }
      }
    }

    if (parentRefs.length !== 1 || isSyncingRef.current) return;

    const selectedParentId = parentRefs[0]._ref?.replace(/^drafts\./, "");
    if (!selectedParentId) return;

    let isMounted = true;

    async function checkSpouse() {
      try {
        isSyncingRef.current = true;
        // Query raw reference IDs of the parent's spouses
        const spouseRefs: string[] = await client.fetch(
          `*[_type == "person" && _id in [$id, "drafts." + $id]][0].spouses[]._ref`,
          { id: selectedParentId }
        );

        if (!isMounted || !spouseRefs || spouseRefs.length === 0) return;

        const spouseId = spouseRefs[0].replace(/^drafts\./, "");
        const alreadyInList = parentRefs.some(
          (p) => p._ref?.replace(/^drafts\./, "") === spouseId
        );

        if (!alreadyInList) {
          props.onChange(
            insert(
              [
                {
                  _type: "reference",
                  _ref: spouseId,
                  _key: Math.random().toString(36).substring(2, 9),
                },
              ],
              "after",
              [-1]
            )
          );
        }
      } catch (err) {
        console.warn("Could not auto-populate co-parent spouse:", err);
      } finally {
        if (isMounted) isSyncingRef.current = false;
      }
    }

    checkSpouse();

    return () => {
      isMounted = false;
    };
  }, [props.value, client, props.onChange, childId]);

  const sanitize = (node: Element | null) => {
    if (!node) return;
    if (node.id && node.id.includes('"')) {
      node.id = node.id.replace(/"/g, "");
    }
    node.querySelectorAll?.('[id*=\'"\']').forEach((el) => {
      el.id = el.id.replace(/"/g, "");
    });
  };

  return (
    <div
      onFocusCapture={(e) => sanitize(e.target as Element)}
      onPointerDownCapture={(e) => sanitize(e.target as Element)}
    >
      {props.renderDefault(props)}
    </div>
  );
}
