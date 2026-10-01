"use client";

import React from "react";
import { Person } from "../../types/clan";
import { getImmediateFamily, getAncestryPath, findPersonById } from "../../lib/graphLayout";
import { PersonCard } from "../cards/PersonCard";
import {
  Users,
  Compass,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Heart,
  Maximize2,
  Calendar,
  Sparkles,
  Info,
  PlusCircle,
  Crown,
} from "lucide-react";

interface FocusedFamilyExplorerProps {
  members: Person[];
  selectedPersonId: string;
  onSelectPerson: (personId: string) => void;
  onOpenCanvas: () => void;
}

export const FocusedFamilyExplorer: React.FC<FocusedFamilyExplorerProps> = ({
  members,
  selectedPersonId,
  onSelectPerson,
  onOpenCanvas,
}) => {
  if (members.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C07B] mx-auto shadow-2xl shadow-[#D4AF37]/10">
          <Users className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sanity Connected
          </div>
          <h3 className="text-2xl font-bold text-slate-100 font-serif">
            Your Clan Archive is Ready
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Your Sanity CMS dataset is empty right now. Start building your clan tree by creating your first member in Sanity Studio!
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/studio"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C29D26] hover:from-[#F3CF65] hover:to-[#D4AF37] text-slate-950 font-semibold text-sm shadow-xl shadow-[#D4AF37]/20 transition-all hover:scale-[1.02]"
          >
            <span>Open Sanity Studio (/studio)</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <div className="mt-8 p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono uppercase tracking-wider text-[11px]">
            <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
            Recommended sequence for creating entries:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 leading-relaxed">
            <li>Create the first ancestor or couple.</li>
            <li>Create their spouse and link them via the <strong className="text-slate-300">Spouse</strong> reference field.</li>
            <li>Create children and select their parents in the <strong className="text-slate-300">Parents</strong> reference field.</li>
            <li>Watch them instantly link together in both the Explorer and Canvas!</li>
          </ol>
        </div>
      </div>
    );
  }

  const person = findPersonById(members, selectedPersonId) || members[0];
  const immediateFamily = getImmediateFamily(person._id, members);
  const ancestryPath = getAncestryPath(person._id, members);

  if (!immediateFamily) return null;

  const { parents, spouses, children, siblings } = immediateFamily;
  const isPersonFounder = Boolean(person.isFounder || person.generation === 1);

  // Husband (male) on left, Wife (female) on right
  const primarySpouse = spouses[0];
  const isPersonMale = person.gender === "male";
  const isSpouseFemale = primarySpouse?.gender === "female";
  const isCoupleMaleLeft = isPersonMale || isSpouseFemale;
  const leftMember = isCoupleMaleLeft ? person : primarySpouse;
  const rightMember = isCoupleMaleLeft ? primarySpouse : person;

  // Sort parents: Father (male) on left, Mother (female) on right
  const sortedParents = [...parents].sort((a, b) => {
    if (a.gender === "male" && b.gender !== "male") return -1;
    if (b.gender === "male" && a.gender !== "male") return 1;
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 animate-in fade-in duration-300">
      {/* Ancestry Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        {/* Breadcrumb Lineage */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-mono mr-2 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            Lineage:
          </span>
          {ancestryPath.map((ancestor, index) => {
            const isLast = index === ancestryPath.length - 1;
            return (
              <React.Fragment key={ancestor._id}>
                <button
                  onClick={() => onSelectPerson(ancestor._id)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                    isLast
                      ? "bg-[#D4AF37]/20 text-[#E5C07B] border border-[#D4AF37]/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {ancestor.name.split(" ")[0]}
                </button>
                {!isLast && (
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* View in Canvas CTA */}
        <button
          onClick={onOpenCanvas}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-[#D4AF37] text-slate-300 hover:text-slate-950 border border-slate-700 hover:border-[#D4AF37] transition-all text-xs font-semibold shadow-md group"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#E5C07B] group-hover:text-slate-950 transition-colors" />
          <span>View in Figma Canvas</span>
        </button>
      </div>

      {/* TOP ANCESTRAL LEVEL - Only shown for non-founders who have or need parents */}
      {!isPersonFounder && (
        <section className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-slate-700" />
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#E5C07B] font-mono bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
              <ArrowUp className="w-3 h-3 text-[#D4AF37]" />
              Parents Generation
            </div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-slate-700" />
          </div>

          {parents.length > 0 ? (
            <div className="space-y-0">
              {parents.length === 1 ? (
                <div className="flex justify-center max-w-md mx-auto">
                  <div className="w-full sm:w-[340px] md:w-[380px]">
                    <PersonCard
                      person={parents[0]}
                      roleLabel={parents[0].gender === "female" ? "Mother" : "Father"}
                      size="md"
                      onClick={() => onSelectPerson(parents[0]._id)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto relative">
                  {/* Marriage connector between parents */}
                  <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                    <div className="w-5 h-0.5 bg-[#D4AF37]/60" />
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-[#D4AF37]/60 flex items-center justify-center shadow-md">
                      <Heart className="w-3 h-3 text-[#E5C07B]" fill="currentColor" />
                    </div>
                    <div className="w-5 h-0.5 bg-[#D4AF37]/60" />
                  </div>

                  {sortedParents.map((parent) => (
                    <PersonCard
                      key={parent._id}
                      person={parent}
                      roleLabel={parent.gender === "female" ? "Mother" : "Father"}
                      size="md"
                      onClick={() => onSelectPerson(parent._id)}
                    />
                  ))}
                </div>
              )}

              {parents.length < 2 && (
                <div className="flex justify-center mt-3">
                  <a
                    href={`/studio/structure/person;${person._id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs text-[#E5C07B] border border-slate-800 hover:border-[#D4AF37]/40 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Link Second Parent in Studio</span>
                  </a>
                </div>
              )}

              {/* Descent Line from Parents down to Focal Member */}
              <div className="flex justify-center my-2">
                <div className="w-0.5 h-8 bg-slate-700" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-5 px-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 max-w-md mx-auto space-y-3">
                <p className="text-xs text-slate-400 font-mono">
                  No parents linked for this member
                </p>
                <div>
                  <a
                    href={`/studio/structure/person;${person._id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-[#E5C07B] border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all shadow-md group"
                  >
                    <PlusCircle className="w-4 h-4 text-[#D4AF37] group-hover:rotate-90 transition-transform" />
                    <span>Link Parents to {person.name.split(" ")[0]} in Studio</span>
                  </a>
                </div>
              </div>

              <div className="flex justify-center my-2">
                <div className="w-0.5 h-6 border-l-2 border-dashed border-slate-700" />
              </div>
            </div>
          )}
        </section>
      )}

      {/* CENTER STAGE: FOCUSED PERSON & SPOUSE */}
      <section className="relative">
        {spouses.length > 0 ? (
          <div className="max-w-4xl mx-auto relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch relative">
              {/* Marriage connector between spouses on desktop */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                <div className="w-5 h-0.5 bg-[#D4AF37]/60" />
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-[#D4AF37]/60 flex items-center justify-center shadow-lg">
                  <Heart className="w-3.5 h-3.5 text-[#E5C07B]" fill="currentColor" />
                </div>
                <div className="w-5 h-0.5 bg-[#D4AF37]/60" />
              </div>

              {/* Mobile heart connector when stacked */}
              <div className="md:hidden flex justify-center -my-2 z-10">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-[#D4AF37]/60 flex items-center justify-center shadow-md">
                  <Heart className="w-3 h-3 text-[#E5C07B]" fill="currentColor" />
                </div>
              </div>

              {/* Left Member (Husband) */}
              <div className="relative">
                <PersonCard
                  person={leftMember}
                  size="lg"
                  isFocused={leftMember._id === selectedPersonId}
                  roleLabel={
                    leftMember._id === selectedPersonId
                      ? "Focal Member"
                      : leftMember.gender === "male"
                      ? "Husband"
                      : "Spouse / Partner"
                  }
                  onClick={() => onSelectPerson(leftMember._id)}
                />
              </div>

              {/* Right Member (Wife) */}
              <div className="relative">
                <PersonCard
                  person={rightMember}
                  size="lg"
                  isFocused={rightMember._id === selectedPersonId}
                  roleLabel={
                    rightMember._id === selectedPersonId
                      ? "Focal Member"
                      : rightMember.gender === "female"
                      ? "Wife"
                      : "Spouse / Partner"
                  }
                  onClick={() => onSelectPerson(rightMember._id)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <PersonCard
              person={person}
              size="lg"
              isFocused
              roleLabel="Focal Member"
            />
            <div className="flex justify-center mt-3">
              <a
                href={`/studio/structure/person;${person._id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-[#E5C07B] border border-slate-800 hover:border-[#D4AF37]/50 text-xs font-medium transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Link Spouse to {person.name.split(" ")[0]} in Studio</span>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* Tree Connector: Couple down to Children */}
      <div className="relative flex flex-col items-center">
        <div className="w-0.5 h-6 bg-slate-700" />

        {/* Children section badge & action */}
        <div className="relative z-10 flex items-center justify-center w-full max-w-4xl px-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#E5C07B] font-mono bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800 shadow-md">
            <ArrowDown className="w-3 h-3 text-[#D4AF37]" />
            Children ({children.length})
          </div>

          <div className="absolute right-4 hidden sm:block">
            <a
              href="/studio/structure/person"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs text-[#E5C07B] border border-slate-800 hover:border-[#D4AF37]/50 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>+ Add Child</span>
            </a>
          </div>
        </div>

        <div className="w-0.5 h-6 bg-slate-700" />
      </div>

      {/* Generation Below: CHILDREN */}
      <section className="space-y-4">
        {children.length > 0 ? (
          <div className="w-full overflow-x-auto pb-6 pt-1 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="inline-flex justify-center min-w-full px-4">
              <div className="flex flex-nowrap items-start gap-8">
                {children.map((child, index) => {
                  const isFirst = index === 0;
                  const isLast = index === children.length - 1;
                  const grandchildrenCount = members.filter((m) =>
                    (m.parents || []).some((p) => p._id === child._id)
                  ).length;

                  // Find spouses of this child
                  const childSpouses = (child.spouses || [])
                    .map((s) => findPersonById(members, s._id))
                    .filter(Boolean) as Person[];
                  const hasSpouse = childSpouses.length > 0;
                  const primarySpouse = childSpouses[0];

                  // Arrange couple: Husband (male) on left, Wife (female) on right
                  let leftPartner = child;
                  let rightPartner = primarySpouse;
                  if (hasSpouse) {
                    const isChildMale = child.gender === "male";
                    const isSpouseFemale = primarySpouse.gender === "female";
                    const isMaleLeft = isChildMale || isSpouseFemale;
                    leftPartner = isMaleLeft ? child : primarySpouse;
                    rightPartner = isMaleLeft ? primarySpouse : child;
                  }

                  return (
                    <div
                      key={child._id}
                      className="relative flex flex-col items-center shrink-0"
                    >
                      {/* Tree connector lines for multiple children */}
                      {children.length > 1 && (
                        <div className="w-full h-6 relative">
                          {isFirst && (
                            <div className="absolute top-0 right-[-16px] left-1/2 h-0.5 bg-slate-700" />
                          )}
                          {isLast && (
                            <div className="absolute top-0 left-[-16px] right-1/2 h-0.5 bg-slate-700" />
                          )}
                          {!isFirst && !isLast && (
                            <div className="absolute top-0 left-[-16px] right-[-16px] h-0.5 bg-slate-700" />
                          )}
                          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-slate-700" />
                        </div>
                      )}

                      {/* Child & Spouse Display */}
                      {hasSpouse ? (
                        <div className="flex items-center gap-2 relative">
                          {/* Left Partner (Husband) */}
                          <div className="w-[200px] sm:w-[220px]">
                            <PersonCard
                              person={leftPartner}
                              size="sm"
                              roleLabel={
                                leftPartner._id === child._id
                                  ? grandchildrenCount > 0
                                    ? `Parent of ${grandchildrenCount}`
                                    : "Child"
                                  : leftPartner.gender === "male"
                                  ? "Husband"
                                  : "Spouse"
                              }
                              onClick={() => onSelectPerson(leftPartner._id)}
                            />
                          </div>

                          {/* Marriage Heart */}
                          <div className="shrink-0 w-5 h-5 rounded-full bg-slate-900 border border-[#D4AF37]/50 flex items-center justify-center -mx-1 z-10 shadow-md">
                            <Heart className="w-2.5 h-2.5 text-[#E5C07B]" fill="currentColor" />
                          </div>

                          {/* Right Partner (Wife) */}
                          <div className="w-[200px] sm:w-[220px]">
                            <PersonCard
                              person={rightPartner}
                              size="sm"
                              roleLabel={
                                rightPartner._id === child._id
                                  ? grandchildrenCount > 0
                                    ? `Parent of ${grandchildrenCount}`
                                    : "Child"
                                  : rightPartner.gender === "female"
                                  ? "Wife"
                                  : "Spouse"
                              }
                              onClick={() => onSelectPerson(rightPartner._id)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="w-[210px] sm:w-[230px]">
                          <PersonCard
                            person={child}
                            size="sm"
                            roleLabel={
                              grandchildrenCount > 0
                                ? `Parent of ${grandchildrenCount}`
                                : "Child"
                            }
                            onClick={() => onSelectPerson(child._id)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 px-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 max-w-md mx-auto space-y-3">
            <p className="text-xs text-slate-400 font-mono">
              No registered children recorded for this member.
            </p>
            <a
              href="/studio/structure/person"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37]/20 to-[#C29D26]/20 hover:from-[#D4AF37]/30 hover:to-[#C29D26]/30 text-[#E5C07B] border border-[#D4AF37]/40 text-xs font-semibold transition-all shadow-md group"
            >
              <PlusCircle className="w-4 h-4 text-[#D4AF37] group-hover:rotate-90 transition-transform" />
              <span>Create Child for {person.name.split(" ")[0]} in Studio</span>
            </a>
          </div>
        )}
      </section>

      {/* SIBLINGS SECTION (if any exist) */}
      {siblings.length > 0 && (
        <section className="pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs uppercase tracking-widest font-mono text-slate-400 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
              Siblings ({siblings.length})
            </h4>
            <span className="text-[11px] text-slate-500">
              Click any sibling to jump to their branch
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {siblings.map((sibling) => (
              <button
                key={sibling._id}
                onClick={() => onSelectPerson(sibling._id)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 hover:border-[#D4AF37]/50 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                  {sibling.photoUrl && (
                    <img
                      src={sibling.photoUrl}
                      alt={sibling.name}
                      className={`w-full h-full object-cover ${
                        sibling.isDeceased ? "grayscale" : ""
                      }`}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-200 group-hover:text-[#E5C07B] truncate">
                    {sibling.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {sibling.isDeceased ? "✝ Deceased" : "Living"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
