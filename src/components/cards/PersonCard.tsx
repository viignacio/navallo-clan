"use client";

import React from "react";
import { Person } from "../../types/clan";
import { User, Cross } from "lucide-react";

interface PersonCardProps {
  person: Person;
  isSelected?: boolean;
  isFocused?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  isSelected = false,
  isFocused = false,
  size = "md",
  onClick,
}) => {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const datesText = [
    person.birthDate ? `b. ${person.birthDate}` : "",
    person.deathDate ? `d. ${person.deathDate}` : "",
  ]
    .filter(Boolean)
    .join(" – ");

  const hasExtraInfo = Boolean(
    datesText ||
    person.isDeceased ||
    (!isSm && person.bio) ||
    (!isSm && person.parents && person.parents.length > 0)
  );

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl h-full transition-all duration-300 cursor-pointer overflow-hidden border ${
        isFocused
          ? "bg-slate-900/90 border-[#D4AF37] ring-2 ring-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.25)]"
          : isSelected
          ? "bg-slate-900/80 border-[#E5C07B] shadow-lg shadow-black/40"
          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 shadow-md shadow-black/20"
      } ${isSm ? "p-3" : isLg ? "p-6" : "p-4"}`}
    >
      <div className={`flex ${hasExtraInfo ? "items-start" : "items-center"} gap-3.5 h-full`}>
        {/* Avatar / Portrait */}
        <div className="relative shrink-0">
          <div
            className={`rounded-xl overflow-hidden border transition-all ${
              person.isDeceased
                ? "border-slate-700 grayscale contrast-105"
                : "border-[#D4AF37]/30 group-hover:border-[#D4AF37]"
            } ${
              isSm
                ? "w-11 h-11"
                : isLg
                ? "w-20 h-20"
                : "w-14 h-14"
            } bg-slate-800 flex items-center justify-center`}
          >
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt={person.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <User
                className={`text-slate-500 ${
                  isSm ? "w-5 h-5" : isLg ? "w-10 h-10" : "w-7 h-7"
                }`}
              />
            )}
          </div>

          {/* Deceased Memorial Badge */}
          {person.isDeceased && (
            <div
              title="Deceased Family Member"
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-950 border border-slate-600 flex items-center justify-center text-slate-300 shadow-sm"
            >
              <Cross className="w-2.5 h-2.5 text-slate-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4
              className={`font-semibold text-slate-100 truncate tracking-tight transition-colors ${
                isSm ? "text-sm" : isLg ? "text-lg" : "text-base"
              } ${isFocused ? "text-[#E5C07B]" : "group-hover:text-[#F3CF65]"}`}
            >
              {person.name}
            </h4>
            {person.nickname && (
              <span className="text-xs text-slate-400 italic">
                &ldquo;{person.nickname}&rdquo;
              </span>
            )}
          </div>

          {/* Dates & Status */}
          {(datesText || person.isDeceased) && (
            <div className="flex items-center gap-2 mt-1">
              {datesText && (
                <p className="text-xs text-slate-400 font-mono">
                  {datesText}
                </p>
              )}
              {person.isDeceased && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700/60">
                  Deceased
                </span>
              )}
            </div>
          )}

          {/* Short Bio (shown on medium and large cards) */}
          {!isSm && person.bio && (
            <p className="mt-2 text-xs text-slate-300/80 line-clamp-2 leading-relaxed">
              {person.bio}
            </p>
          )}

          {/* Parent lineage note */}
          {!isSm && person.parents && person.parents.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-500">
                Child of {person.parents.map((p) => p.name.split(" ")[0]).join(" & ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
