import { defineField, defineType } from "sanity";
import { SpousesInput } from "../components/SpousesInput";
import { ChildrenView } from "../components/ChildrenView";

export const personType = defineType({
  name: "person",
  title: "Family Member",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Full Name",
      type: "string",
      validation: (Rule) => Rule.required().error("Name is required"),
    }),
    defineField({
      name: "nickname",
      title: "Nickname / Maiden Name",
      type: "string",
    }),
    defineField({
      name: "gender",
      title: "Gender",
      type: "string",
      options: {
        list: [
          { title: "Male", value: "male" },
          { title: "Female", value: "female" },
          { title: "Other / Unspecified", value: "other" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "isDeceased",
      title: "Is Deceased?",
      type: "boolean",
      initialValue: false,
      description: "Mark if this family member has passed away.",
    }),
    defineField({
      name: "birthDate",
      title: "Birth Year / Date",
      type: "string",
      placeholder: "e.g. 1945 or May 12, 1945",
    }),
    defineField({
      name: "deathDate",
      title: "Date of Passing",
      type: "string",
      placeholder: "e.g. 2018 or Nov 4, 2018",
      hidden: ({ parent }) => !parent?.isDeceased,
    }),
    defineField({
      name: "photo",
      title: "Portrait / Photo",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "bio",
      title: "Biography & Memories",
      type: "text",
      rows: 4,
      description: "A brief life story, achievements, memories, or anecdotes.",
    }),
    defineField({
      name: "parents",
      title: "Parents",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "person" }],
        },
      ],
      validation: (Rule) => Rule.max(2).warning("Typically an individual has up to 2 biological/primary parents."),
      description: "Select the parents of this individual. (Children will automatically inherit lineage).",
    }),
    defineField({
      name: "spouses",
      title: "Spouses / Partners",
      type: "array",
      components: {
        input: SpousesInput,
      },
      of: [
        {
          type: "reference",
          to: [{ type: "person" }],
        },
      ],
      description: "Select spouse(s). Note: You only need to add this on ONE partner's entry — the app automatically links both partners reciprocally!",
    }),
    defineField({
      name: "isFounder",
      title: "Is Clan Founder?",
      type: "boolean",
      initialValue: false,
      description: "Toggle if this person is one of the clan founders (Generation 1). When toggled, their spouse is automatically treated as founder too. Only 1 pair of founders is permitted.",
      validation: (Rule) =>
        Rule.custom(async (isFounder, context) => {
          if (!isFounder) return true;
          const { document, getClient } = context;
          if (!document) return true;
          const client = getClient({ apiVersion: "2024-01-01" });
          const rawId = document._id as string;
          const docId = rawId.replace(/^drafts\./, "");

          // Query all other persons who currently have isFounder == true
          const otherFounders = await client.fetch<Array<{ _id: string; name: string }>>(
            `*[_type == "person" && isFounder == true && !(_id in [$docId, "drafts." + $docId])] {
              _id,
              name
            }`,
            { docId }
          );

          if (otherFounders.length === 0) {
            return true;
          }

          // Check if the other founder is this person's spouse
          const spouses = (document.spouses as any[]) || [];
          const spouseRefs = spouses.map((s) => s?._ref?.replace(/^drafts\./, ""));

          if (otherFounders.length === 1) {
            const otherFounderId = otherFounders[0]._id.replace(/^drafts\./, "");
            const isSpouse = spouseRefs.includes(otherFounderId);

            // Also check reciprocal reference (other founder listed this doc as spouse)
            const isReverseSpouse = await client.fetch<boolean>(
              `defined(*[_type == "person" && _id in [$otherId, "drafts." + $otherId] && ($docId in spouses[]._ref || ("drafts." + $docId) in spouses[]._ref)][0])`,
              { otherId: otherFounderId, docId }
            );

            if (isSpouse || isReverseSpouse) {
              return true; // Valid founder pair!
            }

            return `Only 1 pair of clan founders is permitted. "${otherFounders[0].name}" is already marked as founder and is not linked as this person's spouse.`;
          }

          return `Only 1 pair of clan founders is permitted. Found existing founders: ${otherFounders.map((f) => f.name).join(", ")}.`;
        }),
    }),
    defineField({
      name: "childrenOverview",
      title: "Children & Descendants",
      type: "string",
      components: {
        input: ChildrenView,
      },
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      nickname: "nickname",
      media: "photo",
      isDeceased: "isDeceased",
      birthDate: "birthDate",
      deathDate: "deathDate",
      isFounder: "isFounder",
    },
    prepare({ title, nickname, media, isDeceased, birthDate, deathDate, isFounder }) {
      const dates = [birthDate || "?", isDeceased ? deathDate || "Deceased" : "Present"]
        .filter(Boolean)
        .join(" – ");
      const statusBadge = isDeceased ? "✝ Deceased" : "Living";
      const founderTag = isFounder ? "👑 Founder • " : "";
      const displayName = nickname ? `${title} (${nickname})` : title;

      return {
        title: displayName || "Unnamed Member",
        subtitle: `${founderTag}${dates} • ${statusBadge}`,
        media,
      };
    },
  },
});
