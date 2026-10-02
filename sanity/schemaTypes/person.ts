import { defineField, defineType } from "sanity";

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
      description: "Select the parents of this individual (up to 2).",
    }),
    defineField({
      name: "spouses",
      title: "Spouses / Partners",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "person" }],
        },
      ],
      description: "Select spouse(s). Note: You only need to add this on ONE partner's entry — the app automatically links both partners reciprocally on publish!",
    }),
    defineField({
      name: "children",
      title: "Children",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "person" }],
        },
      ],
      description: "Select or add children for this individual. Reciprocally synced on publish.",
    }),
    defineField({
      name: "isFounder",
      title: "Is Clan Founder?",
      type: "boolean",
      initialValue: false,
      description: "Toggle if this person is one of the clan founders (Generation 1). Founders are automatically placed at the root of the lineage tree.",
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
      const displayName = nickname ? `${title} (${nickname})` : title;

      return {
        title: displayName || "Unnamed Member",
        subtitle: `${dates} • ${statusBadge}`,
        media,
      };
    },
  },
});
