import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schema } from "./sanity/schemaTypes";
import { apiVersion, dataset, projectId } from "./sanity/env";

import { createSyncPublishAction, SyncAllClanLinksAction } from "./sanity/actions/syncPublishAction";

export default defineConfig({
  basePath: "/studio",
  name: "navallo_clan_studio",
  title: "Navallo Clan Archive Studio",
  projectId: projectId || "navallo-demo-project",
  dataset: dataset || "production",
  schema,
  plugins: [
    structureTool({
      title: "Clan Members",
    }),
  ],
  document: {
    actions: (prev, context) => {
      if (context.schemaType === "person") {
        const wrapped = prev.map((originalAction) =>
          originalAction.action === "publish"
            ? createSyncPublishAction(originalAction)
            : originalAction
        );
        return [...wrapped, SyncAllClanLinksAction];
      }
      return prev;
    },
  },
});
