import { type SchemaTypeDefinition } from "sanity";
import { personType } from "./person";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [personType],
};
