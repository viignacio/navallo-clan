import React, { useEffect, useRef } from "react";
import { ArrayOfObjectsInputProps, insert, useClient } from "sanity";

export function ParentsInput(props: ArrayOfObjectsInputProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const isSyncingRef = useRef(false);

  // Monitor value changes: if a parent was added and that parent has a spouse, auto-add spouse
  useEffect(() => {
    const parentRefs = (props.value || []) as Array<{ _ref?: string; _key?: string }>;
    if (parentRefs.length !== 1 || isSyncingRef.current) return;

    const selectedParentId = parentRefs[0]._ref?.replace(/^drafts\./, "");
    if (!selectedParentId) return;

    let isMounted = true;

    async function checkSpouse() {
      try {
        isSyncingRef.current = true;
        // Query raw reference IDs of the parent's spouses (no joins needed)
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
  }, [props.value, client, props.onChange]);

  return props.renderDefault(props);
}
