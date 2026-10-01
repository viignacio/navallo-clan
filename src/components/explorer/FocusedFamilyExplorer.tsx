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
            <li>Create the eldest ancestor / founder (e.g. Patriarch or Matriarch).</li>
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
            const isAncestorFounder = Boolean(ancestor.isFounder || ancestor.generation === 1);
            return (
              <React.Fragment key={ancestor._id}>
                <button
                  onClick={() => onSelectPerson(ancestor._id)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                    isLast
                      ? "bg-[#D4AF37]/20 text-[#E5C07B] border border-[#D4AF37]/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {isAncestorFounder && <Crown className="w-3 h-3 text-[#D4AF37]" />}
                  <span>{ancestor.name.split(" ")[0]}</span>
                  {isAncestorFounder && (
                    <span className="text-[10px] text-[#F3CF65] font-mono opacity-90">
                      (Founder)
                    </span>
                  )}
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

      {/* TOP ANCESTRAL LEVEL */}
      {isPersonFounder ? (
        /* CLAN FOUNDERS BANNER - Root Ancestors (No parents section) */
        <div className="text-center py-7 px-6 rounded-3xl bg-gradient-to-b from-[#D4AF37]/15 via-slate-900/70 to-slate-950/80 border border-[#D4AF37]/40 shadow-2xl shadow-[#D4AF37]/10 max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3CF65] text-xs font-mono tracking-widest uppercase shadow-sm font-semibold">
            <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Clan Founders • Generation 1 (Ancestral Root)</span>
            <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-100 tracking-tight">
            Origin & Founders of the Navallo Clan
          </h3>
          <p className="text-xs sm:text-sm text-slate-300/85 max-w-lg mx-auto leading-relaxed">
            The root ancestors of the Navallo bloodline. All branches, generations, and descendants in this archive originate from this union.
          </p>
        </div>
      ) : (
        /* PARENTS GENERATION (Only for non-founders) */
        <section className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-slate-700" />
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#E5C07B] font-mono bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
              <ArrowUp className="w-3 h-3 text-[#D4AF37]" />
              Parents Generation
            </div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-slate-700" />
          </div>

          {parents.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {parents.map((parent) => (
                  <PersonCard
                    key={parent._id}
                    person={parent}
                    roleLabel={parent.gender === "female" ? "Mother" : "Father"}
                    size="md"
                    onClick={() => onSelectPerson(parent._id)}
                    onFocus={() => onSelectPerson(parent._id)}
                  />
                ))}
              </div>
              {parents.length < 2 && (
                <div className="flex justify-center">
                  <a
                    href={`/studio/structure/person;${person._id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs text-[#E5C07B] border border-slate-800 hover:border-[#D4AF37]/40 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Link Second Parent in Studio</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
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
          )}
        </section>
      )}

      {/* Decorative Connector Downward */}
      <div className="flex justify-center -my-3">
        <div className="w-0.5 h-8 bg-gradient-to-b from-[#D4AF37]/50 via-slate-700 to-[#D4AF37]/50" />
      </div>

      {/* CENTER STAGE: FOCUSED PERSON & SPOUSE */}
      <section className="space-y-4">
        <div className="text-center">
          <span
            className={`text-xs uppercase tracking-widest font-mono px-4 py-1.5 rounded-full border shadow-sm inline-flex items-center gap-2 ${
              isPersonFounder
                ? "text-[#F3CF65] bg-gradient-to-r from-[#D4AF37]/30 via-[#D4AF37]/20 to-[#D4AF37]/30 border-[#D4AF37]/50 shadow-[#D4AF37]/20 font-bold"
                : "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20"
            }`}
          >
            {isPersonFounder ? (
              <>
                <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Clan Founders • Generation 1</span>
                <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
              </>
            ) : (
              <span>Current Focus • Generation {person.generation || "?"}</span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
          {/* Main Focused Person Card */}
          <div className="relative">
            <PersonCard
              person={person}
              size="lg"
              isFocused
              roleLabel={
                isPersonFounder
                  ? person.gender === "female"
                    ? "Clan Matriarch"
                    : person.gender === "male"
                    ? "Clan Patriarch"
                    : "Clan Founder"
                  : "Focal Member"
              }
            />
          </div>

          {/* Spouse or Single Status */}
          {spouses.length > 0 ? (
            <div className="relative flex flex-col justify-center">
              <div className="space-y-4">
                {spouses.map((spouse) => (
                  <div key={spouse._id} className="relative">
                    <PersonCard
                      person={spouse}
                      size="lg"
                      roleLabel={
                        spouse.isFounder || isPersonFounder
                          ? spouse.gender === "female"
                            ? "Clan Matriarch"
                            : spouse.gender === "male"
                            ? "Clan Patriarch"
                            : "Clan Founder"
                          : "Spouse / Partner"
                      }
                      onClick={() => onSelectPerson(spouse._id)}
                      onFocus={() => onSelectPerson(spouse._id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 flex flex-col items-center justify-center text-center bg-slate-900/20">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-medium text-slate-400">Single Member</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                No recorded spouse for this entry.
              </p>
              <a
                href={`/studio/structure/person;${person._id}`}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-[#E5C07B] border border-slate-700 hover:border-[#D4AF37]/50 text-xs font-medium transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Link Spouse to {person.name.split(" ")[0]} in Studio</span>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Decorative Connector Downward */}
      <div className="flex justify-center -my-3">
        <div className="w-0.5 h-8 bg-gradient-to-b from-[#D4AF37]/50 via-slate-700 to-[#D4AF37]/50" />
      </div>

      {/* Generation Below: CHILDREN */}
      <section className="space-y-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto px-1">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#E5C07B] font-mono bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
            <ArrowDown className="w-3 h-3 text-[#D4AF37]" />
            {isPersonFounder
              ? `First Generation Descendants (${children.length})`
              : `Children & Descendants (${children.length})`}
          </div>

          <a
            href="/studio/structure/person"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs text-[#E5C07B] border border-slate-800 hover:border-[#D4AF37]/50 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>
              {isPersonFounder ? "+ Add Child of Founders" : "+ Add Child in Studio"}
            </span>
          </a>
        </div>

        {children.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {children.map((child) => {
              // Check if this child has children of their own
              const grandchildrenCount = members.filter((m) =>
                (m.parents || []).some((p) => p._id === child._id)
              ).length;

              return (
                <div key={child._id} className="relative">
                  <PersonCard
                    person={child}
                    size="md"
                    roleLabel={grandchildrenCount > 0 ? `Parent of ${grandchildrenCount}` : "Child"}
                    onClick={() => onSelectPerson(child._id)}
                    onFocus={() => onSelectPerson(child._id)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 px-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 max-w-md mx-auto space-y-3">
            <p className="text-xs text-slate-400 font-mono">
              {isPersonFounder
                ? "No registered children recorded for the Clan Founders yet."
                : "No registered children recorded for this member."}
            </p>
            <a
              href="/studio/structure/person"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37]/20 to-[#C29D26]/20 hover:from-[#D4AF37]/30 hover:to-[#C29D26]/30 text-[#E5C07B] border border-[#D4AF37]/40 text-xs font-semibold transition-all shadow-md group"
            >
              <PlusCircle className="w-4 h-4 text-[#D4AF37] group-hover:rotate-90 transition-transform" />
              <span>
                {isPersonFounder
                  ? "Create First Generation Child in Studio"
                  : `Create Child for ${person.name.split(" ")[0]} in Studio`}
              </span>
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
