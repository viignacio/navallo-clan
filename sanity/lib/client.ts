import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId, useCdn, hasSanityCredentials } from "../env";

export const client = hasSanityCredentials
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn,
    })
  : null;

export const PERSON_QUERY = `*[_type == "person"] | order(birthDate asc) {
  _id,
  name,
  nickname,
  gender,
  isDeceased,
  birthDate,
  deathDate,
  "photoUrl": photo.asset->url,
  bio,
  isFounder,
  "parents": coalesce(parents[]->{_id, name}, []),
  "spouses": coalesce(spouses[]->{_id, name}, []),
  "children": coalesce(children[]->{_id, name}, [])
}`;

