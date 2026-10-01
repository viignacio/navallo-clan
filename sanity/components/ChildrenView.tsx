import React, { useEffect, useState, useCallback } from "react";
import { StringInputProps, useClient, useFormValue } from "sanity";
import { Card, Stack, Text, Badge, Flex, Button, Box } from "@sanity/ui";

interface ChildDoc {
  _id: string;
  name: string;
  birthDate?: string;
  isDeceased?: boolean;
}

export function ChildrenView(props: StringInputProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const rawId = useFormValue(["_id"]) as string | undefined;
  const personName = useFormValue(["name"]) as string | undefined;
  const documentId = rawId ? rawId.replace(/^drafts\./, "") : undefined;

  const [children, setChildren] = useState<ChildDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChildren = useCallback(async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const query = `*[_type == "person" && !(_id in [$docId, "drafts." + $docId]) && ($docId in parents[]._ref || ("drafts." + $docId) in parents[]._ref)] | order(birthDate asc) {
        _id,
        name,
        birthDate,
        isDeceased
      }`;
      const res: ChildDoc[] = await client.fetch(query, { docId: documentId });
      setChildren(res);
    } catch (err) {
      console.warn("Could not fetch children in studio:", err);
    } finally {
      setLoading(false);
    }
  }, [client, documentId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  return (
    <Card padding={3} radius={2} tone="transparent" border style={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}>
      <Stack gap={3}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={2}>
            <Text size={1} weight="semibold">
              Children of {personName || "this Member"} ({children.length})
            </Text>
            {children.length > 0 && (
              <Badge tone="primary" fontSize={1}>
                {children.length} {children.length === 1 ? "Child" : "Children"}
              </Badge>
            )}
          </Flex>
          <Button
            fontSize={1}
            padding={2}
            mode="ghost"
            tone="primary"
            text="+ Add Child"
            onClick={() => {
              window.open("/studio/structure/person", "_blank");
            }}
          />
        </Flex>

        {children.length > 0 ? (
          <Stack gap={1}>
            {children.map((child) => (
              <Flex
                key={child._id}
                align="center"
                justify="space-between"
                padding={2}
                style={{
                  borderRadius: 6,
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                }}
              >
                <Text size={1} weight="medium">
                  {child.name}{" "}
                  {child.birthDate && (
                    <span style={{ opacity: 0.6, fontSize: "0.85em" }}>
                      (b. {child.birthDate})
                    </span>
                  )}
                  {child.isDeceased && " ✝"}
                </Text>
                <Button
                  fontSize={0}
                  padding={2}
                  mode="bleed"
                  text="Edit Child ↗"
                  onClick={() => {
                    const cleanId = child._id.replace(/^drafts\./, "");
                    window.location.href = `/studio/structure/person;${cleanId}`;
                  }}
                />
              </Flex>
            ))}
          </Stack>
        ) : (
          <Text size={1} muted>
            No children registered yet. To add a child, create a new Family Member and select {personName || "this person"} in their <strong>Parents</strong> field.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
