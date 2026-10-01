import { useState } from "react";
import { DocumentActionComponent, DocumentActionProps, useClient } from "sanity";
import { syncPersonLinks, syncAllClanLinks } from "../lib/syncLinks";

/**
 * Wraps Sanity's PublishAction to automatically sync reciprocal spouses,
 * parents, and children when a member is published.
 */
export function createSyncPublishAction(originalPublishAction: DocumentActionComponent): DocumentActionComponent {
  return function SyncPublishAction(props: DocumentActionProps) {
    const originalResult = originalPublishAction(props);
    const client = useClient({ apiVersion: "2024-01-01" });

    if (!originalResult) return null;

    return {
      ...originalResult,
      label: originalResult.label || "Publish",
      onHandle: async () => {
        // Run original publish
        if (originalResult.onHandle) {
          originalResult.onHandle();
        }

        // Run bidirectional sync for this document
        try {
          await syncPersonLinks(client, props.id);
        } catch (err) {
          console.warn("Error running bidirectional sync on publish:", err);
        }
      },
    };
  };
}

/**
 * A handy document action allowing the user to reconcile all family links
 * across the entire clan dataset in 1 click.
 */
export function SyncAllClanLinksAction(props: DocumentActionProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const [isSyncing, setIsSyncing] = useState(false);

  return {
    label: isSyncing ? "Syncing Links..." : "Sync All Clan Links",
    title: "Reconcile bidirectional spouses, parents, and children across all clan members",
    disabled: isSyncing,
    onHandle: async () => {
      setIsSyncing(true);
      try {
        await syncAllClanLinks(client);
      } catch (err) {
        console.error("Failed to sync clan links:", err);
      } finally {
        setIsSyncing(false);
      }
    },
  };
}
