import React, { useEffect, useRef } from "react";
import { ArrayOfObjectsInputProps, useClient, useFormValue } from "sanity";

export function ChildrenInput(props: ArrayOfObjectsInputProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const rawDocId = useFormValue(["_id"]) as string | undefined;
  const parentId = rawDocId ? rawDocId.replace(/^drafts\./, "") : undefined;

  const prevChildrenRef = useRef<string[] | null>(null);

  useEffect(() => {
    const currentRefs = (props.value || []) as Array<{ _ref?: string; _key?: string }>;
    const currentChildIds = currentRefs
      .map((c) => c._ref?.replace(/^drafts\./, ""))
      .filter(Boolean) as string[];

    // Baseline initialization on mount
    if (prevChildrenRef.current === null) {
      prevChildrenRef.current = currentChildIds;
      return;
    }

    // Find children removed in this input change
    const removedChildIds = prevChildrenRef.current.filter(
      (oldId) => !currentChildIds.includes(oldId)
    );

    // Find children added in this input change
    const addedChildIds = currentChildIds.filter(
      (newId) => !prevChildrenRef.current!.includes(newId)
    );

    prevChildrenRef.current = currentChildIds;

    if (!parentId) return;

    // 1. Handle removals: unlink this parent from the removed child
    if (removedChildIds.length > 0) {
      async function unpairChildren() {
        for (const childId of removedChildIds) {
          const targetChildIds = [childId, `drafts.${childId}`];
          for (const tId of targetChildIds) {
            try {
              await client
                .patch(tId)
                .unset([
                  `parents[_ref=="${parentId}"]`,
                  `parents[_ref=="drafts.${parentId}"]`,
                ])
                .commit();
            } catch {
              // Ignore if draft doesn't exist
            }
          }
        }
      }
      unpairChildren().catch(() => {});
    }

    // 2. Handle additions: link this parent to the newly added child
    if (addedChildIds.length > 0) {
      async function pairChildren() {
        for (const childId of addedChildIds) {
          const targetChildIds = [childId, `drafts.${childId}`];
          for (const tId of targetChildIds) {
            try {
              // Check if already in child's parents
              const existingParents: Array<{ _ref?: string }> = await client.fetch(
                `*[_type == "person" && _id == $id][0].parents`,
                { id: tId }
              );
              const alreadyHasParent = (existingParents || []).some(
                (p) => p?._ref?.replace(/^drafts\./, "") === parentId
              );
              if (!alreadyHasParent) {
                await client
                  .patch(tId)
                  .setIfMissing({ parents: [] })
                  .append("parents", [
                    {
                      _type: "reference",
                      _ref: parentId,
                      _key: Math.random().toString(36).substring(2, 9),
                    },
                  ])
                  .commit();
              }
            } catch {
              // Ignore if document not found
            }
          }
        }
      }
      pairChildren().catch(() => {});
    }
  }, [props.value, client, parentId]);

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
