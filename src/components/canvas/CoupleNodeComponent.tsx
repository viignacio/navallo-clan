"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { CoupleNodeData } from "../../types/clan";
import { Heart, Cross, User } from "lucide-react";

export const CoupleNodeComponent = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as CoupleNodeData;
  const {
    primaryPerson,
    spousePerson,
    generation,
    isImmediateFamily,
    isHighlighted,
    selectedPersonId,
    onSelectPerson,
  } = nodeData;

  const isPrimaryMale = primaryPerson.gender === "male";
  const isSpouseFemale = spousePerson.gender === "female";
  const isCoupleMaleLeft = isPrimaryMale || isSpouseFemale;
  const leftPerson = isCoupleMaleLeft ? primaryPerson : spousePerson;
  const rightPerson = isCoupleMaleLeft ? spousePerson : primaryPerson;

  const isLeftSelected = selectedPersonId === leftPerson._id;
  const isRightSelected = selectedPersonId === rightPerson._id;
  const isFounderCouple = Boolean(
    primaryPerson.isFounder || spousePerson.isFounder || generation === 1
  );

  return (
    <div
      className={`relative rounded-2xl p-3.5 transition-all duration-300 backdrop-blur-md select-none ${
        isHighlighted
          ? "bg-slate-900/95 border-2 border-[#D4AF37] ring-4 ring-[#D4AF37]/30 shadow-[0_0_35px_rgba(212,175,55,0.35)] scale-[1.03]"
          : isImmediateFamily
          ? "bg-slate-900/90 border-2 border-[#E5C07B] shadow-xl shadow-black/50"
          : "bg-slate-900/80 border border-slate-700/80 hover:border-slate-500/80 hover:bg-slate-900/95 shadow-lg shadow-black/30"
      }`}
      style={{ width: 380 }}
    >
      {/* Target handle at the top for parent lines */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-[#D4AF37] !border-2 !border-slate-900"
      />

      {/* Generation Tag */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
        <span className="text-[10px] uppercase font-mono tracking-wider text-[#E5C07B]/80">
          Generation {generation} • Couple
        </span>
        {nodeData.childIds.length > 0 && (
          <span className="text-[10px] text-slate-400 font-mono">
            {nodeData.childIds.length} {nodeData.childIds.length === 1 ? "Child" : "Children"}
          </span>
        )}
      </div>

      {/* Couple Dual Display: Husband left, Wife right */}
      <div className="grid grid-cols-2 gap-2 relative">
        {/* Marriage Bridge Indicator in center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-slate-950 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shadow-md">
          <Heart className="w-3 h-3 fill-[#D4AF37]/30 text-[#D4AF37]" />
        </div>

        {/* Left Person (Husband) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectPerson(leftPerson._id);
          }}
          className={`p-2 rounded-xl transition-all cursor-pointer border ${
            isLeftSelected
              ? "bg-[#D4AF37]/15 border-[#D4AF37]"
              : "bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <div
                className={`w-10 h-10 rounded-lg overflow-hidden border ${
                  leftPerson.isDeceased
                    ? "border-slate-700 grayscale contrast-105"
                    : "border-[#D4AF37]/40"
                } bg-slate-800 flex items-center justify-center`}
              >
                {leftPerson.photoUrl ? (
                  <img
                    src={leftPerson.photoUrl}
                    alt={leftPerson.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-slate-500" />
                )}
              </div>
              {leftPerson.isDeceased && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-600 flex items-center justify-center">
                  <Cross className="w-2 h-2 text-slate-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-semibold text-slate-100 truncate">
                {leftPerson.name.split(" ")[0]} {leftPerson.name.split(" ").slice(-1)[0]}
              </h5>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {leftPerson.birthDate || "?"} – {leftPerson.isDeceased ? leftPerson.deathDate || "✝" : "Living"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Person (Wife) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectPerson(rightPerson._id);
          }}
          className={`p-2 rounded-xl transition-all cursor-pointer border ${
            isRightSelected
              ? "bg-[#D4AF37]/15 border-[#D4AF37]"
              : "bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <div
                className={`w-10 h-10 rounded-lg overflow-hidden border ${
                  rightPerson.isDeceased
                    ? "border-slate-700 grayscale contrast-105"
                    : "border-[#D4AF37]/40"
                } bg-slate-800 flex items-center justify-center`}
              >
                {rightPerson.photoUrl ? (
                  <img
                    src={rightPerson.photoUrl}
                    alt={rightPerson.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-slate-500" />
                )}
              </div>
              {rightPerson.isDeceased && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-600 flex items-center justify-center">
                  <Cross className="w-2 h-2 text-slate-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-semibold text-slate-100 truncate">
                {rightPerson.name.split(" ")[0]} {rightPerson.name.split(" ").slice(-1)[0]}
              </h5>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {rightPerson.birthDate || "?"} – {rightPerson.isDeceased ? rightPerson.deathDate || "✝" : "Living"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Source handle at the bottom for children lines */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-[#D4AF37] !border-2 !border-slate-900"
      />
    </div>
  );
});

CoupleNodeComponent.displayName = "CoupleNodeComponent";
