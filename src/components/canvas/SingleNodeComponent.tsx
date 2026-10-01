"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { SingleNodeData } from "../../types/clan";
import { Cross, User } from "lucide-react";

export const SingleNodeComponent = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as SingleNodeData;
  const {
    person,
    generation,
    isImmediateFamily,
    isHighlighted,
    selectedPersonId,
    onSelectPerson,
  } = nodeData;

  const isSelected = selectedPersonId === person._id;
  const isFounderSingle = Boolean(person.isFounder || generation === 1);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectPerson(person._id);
      }}
      className={`relative rounded-2xl p-3.5 transition-all duration-300 backdrop-blur-md select-none cursor-pointer ${
        isHighlighted || isSelected
          ? "bg-slate-900/95 border-2 border-[#D4AF37] ring-4 ring-[#D4AF37]/30 shadow-[0_0_35px_rgba(212,175,55,0.35)] scale-[1.03]"
          : isFounderSingle
          ? "bg-slate-900/90 border-2 border-[#D4AF37]/60 shadow-xl shadow-black/40"
          : isImmediateFamily
          ? "bg-slate-900/90 border-2 border-[#E5C07B] shadow-xl shadow-black/50"
          : "bg-slate-900/80 border border-slate-700/80 hover:border-slate-500/80 hover:bg-slate-900/95 shadow-lg shadow-black/30"
      }`}
      style={{ width: 250 }}
    >
      {/* Target handle at the top for parent lines */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-[#D4AF37] !border-2 !border-slate-900"
      />

      {/* Generation Tag */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
        <span
          className={`text-[10px] uppercase font-mono tracking-wider ${
            isFounderSingle
              ? "text-[#F3CF65] font-bold flex items-center gap-1"
              : "text-[#E5C07B]/80"
          }`}
        >
          {isFounderSingle ? "👑 Gen 1 • Clan Founder" : `Generation ${generation} • Individual`}
        </span>
        {nodeData.childIds.length > 0 && (
          <span className="text-[10px] text-slate-400 font-mono">
            {nodeData.childIds.length} {nodeData.childIds.length === 1 ? "Child" : "Children"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <div
            className={`w-12 h-12 rounded-xl overflow-hidden border ${
              person.isDeceased
                ? "border-slate-700 grayscale contrast-105"
                : "border-[#D4AF37]/40"
            } bg-slate-800 flex items-center justify-center`}
          >
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt={person.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-slate-500" />
            )}
          </div>
          {person.isDeceased && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-950 border border-slate-600 flex items-center justify-center">
              <Cross className="w-2.5 h-2.5 text-slate-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h5 className="text-sm font-semibold text-slate-100 truncate">
            {person.name}
          </h5>
          {person.nickname && (
            <p className="text-xs text-slate-400 italic truncate">
              &ldquo;{person.nickname}&rdquo;
            </p>
          )}
          <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
            {person.birthDate || "?"} – {person.isDeceased ? person.deathDate || "✝" : "Living"}
          </p>
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

SingleNodeComponent.displayName = "SingleNodeComponent";
