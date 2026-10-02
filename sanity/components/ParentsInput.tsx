import React, { useEffect, useRef } from "react";
import { ArrayOfObjectsInputProps, useClient, useFormValue } from "sanity";

export function ParentsInput(props: ArrayOfObjectsInputProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const rawDocId = useFormValue(["_id"]) as string | undefined;
  const childId = rawDocId ? rawDocId.replace(/^drafts\./, "") : undefined;
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
  }, [props.value, client, childId]);

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
