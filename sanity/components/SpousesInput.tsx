import React, { useEffect, useState, useCallback } from "react";
import {
  ArrayOfObjectsInputProps,
  useClient,
  useFormValue,
  insert,
  setIfMissing,
} from "sanity";
import { Card, Stack, Text, Badge, Flex, Button, Box } from "@sanity/ui";

interface ReciprocalSpouse {
  _id: string;
  name: string;
}

export function SpousesInput(props: ArrayOfObjectsInputProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const rawId = useFormValue(["_id"]) as string | undefined;
  const documentId = rawId ? rawId.replace(/^drafts\./, "") : undefined;

  const [reciprocals, setReciprocals] = useState<ReciprocalSpouse[]>([]);
  const [loading, setLoading] = useState(false);

  // Query for other persons who reference this document as spouse
  const checkReciprocals = useCallback(async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const query = `*[_type == "person" && !(_id in [$docId, "drafts." + $docId]) && ($docId in spouses[]._ref || ("drafts." + $docId) in spouses[]._ref)] {
        _id,
        name
      }`;
      const results: ReciprocalSpouse[] = await client.fetch(query, {
        docId: documentId,
      });

      // Filter to only those not already in this document's direct spouses array
      const existingRefs = new Set(
        (props.value || []).map((item: any) =>
          item._ref?.replace(/^drafts\./, "")
        )
      );

      const notYetInList = results.filter(
        (r) => !existingRefs.has(r._id.replace(/^drafts\./, ""))
      );

      setReciprocals(notYetInList);
    } catch (err) {
      console.warn("Could not check reciprocal spouses:", err);
    } finally {
      setLoading(false);
    }
  }, [client, documentId, props.value]);

  useEffect(() => {
    checkReciprocals();
  }, [checkReciprocals]);

  // Handler to add the reciprocal spouse into this document's array
  const handleAddReciprocal = (spouse: ReciprocalSpouse) => {
    const cleanId = spouse._id.replace(/^drafts\./, "");
    const newRef = {
      _type: "reference",
      _ref: cleanId,
      _key: Math.random().toString(36).substring(2, 9),
    };

    if (!props.value || props.value.length === 0) {
      props.onChange([setIfMissing([]), insert([newRef], "after", [0])]);
    } else {
      props.onChange(insert([newRef], "after", [-1]));
    }
  };

  return (
    <Stack gap={3}>
      {/* Reciprocal Spouse Notification Banner */}
      {reciprocals.length > 0 && (
        <Card
          padding={3}
          radius={2}
          tone="positive"
          border
          style={{ backgroundColor: "rgba(16, 185, 129, 0.08)" }}
        >
          <Stack gap={2}>
            <Flex align="center" gap={2}>
              <Badge tone="positive" fontSize={1} padding={1}>
                Reciprocal Link Active
              </Badge>
              <Text size={1} weight="semibold">
                Linked by Partner
              </Text>
            </Flex>

            {reciprocals.map((r) => (
              <Flex
                key={r._id}
                align="center"
                justify="space-between"
                gap={2}
                padding={1}
              >
                <Box flex={1}>
                  <Text size={1}>
                    <strong>{r.name}</strong> has already linked this person as
                    their spouse! (Already connected in your live family tree).
                  </Text>
                </Box>
                <Button
                  fontSize={1}
                  padding={2}
                  tone="primary"
                  mode="ghost"
                  text="Add to this list too"
                  onClick={() => handleAddReciprocal(r)}
                />
              </Flex>
            ))}
          </Stack>
        </Card>
      )}

      {/* Standard Sanity Array Input */}
      {props.renderDefault(props)}
    </Stack>
  );
}
