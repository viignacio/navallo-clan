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
  photo {
    asset->{
      _id,
      url
    }
  },
  bio,
  isFounder,
  "parents": parents[]->{
    _id,
    name
  },
  "spouses": array::unique(
    coalesce(spouses[]->{_id, name}, []) +
    *[_type == "person" && ^._id in spouses[]._ref]{_id, name}
  )
}`;

