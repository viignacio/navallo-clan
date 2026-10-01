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

    prevChildrenRef.current = currentChildIds;

    if (removedChildIds.length === 0 || !parentId) return;

    // Immediately remove this parent (and spouse) from the removed child's document
    async function unpairChild() {
      try {
        // Query parent's spouse to unpair co-parent as well
        const spouseRefs: string[] = await client.fetch(
          `*[_type == "person" && _id in [$id, "drafts." + $id]][0].spouses[]._ref`,
          { id: parentId }
        );
        const spouseId = spouseRefs?.[0]?.replace(/^drafts\./, "");

        for (const childId of removedChildIds) {
          const targetChildIds = [childId, `drafts.${childId}`];
          for (const tId of targetChildIds) {
            try {
              const unsetPaths = [
                `parents[_ref=="${parentId}"]`,
                `parents[_ref=="drafts.${parentId}"]`,
              ];
              if (spouseId) {
                unsetPaths.push(
                  `parents[_ref=="${spouseId}"]`,
                  `parents[_ref=="drafts.${spouseId}"]`
                );
              }
              await client.patch(tId).unset(unsetPaths).commit();
            } catch {
              // Ignore if draft doesn't exist
            }
          }

          // If parent has a spouse, also remove child from spouse's children
          if (spouseId) {
            const targetSpouseIds = [spouseId, `drafts.${spouseId}`];
            for (const sId of targetSpouseIds) {
              try {
                await client
                  .patch(sId)
                  .unset([
                    `children[_ref=="${childId}"]`,
                    `children[_ref=="drafts.${childId}"]`,
                  ])
                  .commit();
              } catch {
                // Ignore if draft doesn't exist
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not auto-remove parent from unlinked child:", err);
      }
    }

    unpairChild();
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
