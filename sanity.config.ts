import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schema } from "./sanity/schemaTypes";
import { apiVersion, dataset, projectId } from "./sanity/env";

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
});
