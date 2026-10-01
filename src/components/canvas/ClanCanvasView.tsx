"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Node,
} from "@xyflow/react";
import { Person, ImmediateFamily } from "../../types/clan";
import {
  buildClanGraph,
  getImmediateFamily,
  findPersonById,
  getLineageMemberIds,
} from "../../lib/graphLayout";
import { CoupleNodeComponent } from "./CoupleNodeComponent";
import { SingleNodeComponent } from "./SingleNodeComponent";
import {
  ArrowLeft,
  Search,
  Maximize2,
  Map,
  Users,
  Heart,
  ChevronRight,
  Cross,
  Sparkles,
  X,
} from "lucide-react";

interface ClanCanvasViewProps {
  members: Person[];
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  onExitCanvas: () => void;
  onDeepFocusInExplorer: (personId: string) => void;
}

const nodeTypes = {
  coupleNode: CoupleNodeComponent,
  singleNode: SingleNodeComponent,
};

function ClanCanvasInternal({
  members,
  selectedPersonId,
  onSelectPerson,
  onExitCanvas,
  onDeepFocusInExplorer,
}: ClanCanvasViewProps) {
  const { fitView } = useReactFlow();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);

  // Selected person and their immediate family
  const selectedPerson = useMemo(
    () => (selectedPersonId ? findPersonById(members, selectedPersonId) : null),
    [members, selectedPersonId]
  );

  const immediateFamily = useMemo(
    () => (selectedPersonId ? getImmediateFamily(selectedPersonId, members) : null),
    [members, selectedPersonId]
  );

  // Build the graph nodes & edges
  const { nodes, edges, personToNodeMap } = useMemo(
    () =>
      buildClanGraph({
        members,
        selectedPersonId,
        onSelectPerson: (id) => {
          onSelectPerson(id);
          setIsInspectorOpen(true);
        },
      }),
    [members, selectedPersonId, onSelectPerson]
  );

  // Smoothly frames the entire lineage of the selected person
  const zoomToLineage = useCallback(
    (personId: string, duration = 650) => {
      const lineageIds = getLineageMemberIds(personId, members);
      const lineageNodeIds = new Set<string>();
      lineageIds.forEach((mId) => {
        const nId = personToNodeMap.get(mId);
        if (nId) lineageNodeIds.add(nId);
      });

      if (lineageNodeIds.size > 0) {
        const targetNodes = Array.from(lineageNodeIds).map((id) => ({ id }));
        fitView({
          nodes: targetNodes,
          padding: 0.28,
          duration,
          maxZoom: 1.05,
        });
      } else {
        fitView({ padding: 0.2, duration, maxZoom: 1.05 });
      }
    },
    [members, personToNodeMap, fitView]
  );

  // Guard camera framing so zooming/panning is preserved and only new selections trigger initial zoom
  const lastCenteredPersonIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!selectedPersonId || selectedPersonId === lastCenteredPersonIdRef.current) return;
    lastCenteredPersonIdRef.current = selectedPersonId;

    const timer = setTimeout(() => {
      zoomToLineage(selectedPersonId, 650);
    }, 60);

    return () => clearTimeout(timer);
  }, [selectedPersonId, zoomToLineage]);

  // Initial fit view on mount if no person is selected
  const hasInitialFitRef = React.useRef(false);
  useEffect(() => {
    if (hasInitialFitRef.current) return;
    hasInitialFitRef.current = true;
    if (!selectedPersonId) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [selectedPersonId, fitView]);

  // Search filter
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return members
      .filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 6);
  }, [members, searchQuery]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B0F17] select-none">
      {/* Top Floating Figma-Style Toolbar */}
      <div className="absolute top-5 left-5 right-5 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Exit Canvas & Clan Badge */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onExitCanvas}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-[#E5C07B] border border-[#D4AF37]/30 hover:border-[#D4AF37] shadow-xl backdrop-blur-md transition-all font-medium text-sm group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Explorer</span>
          </button>

          <div className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-slate-300 font-mono">
              Figma Canvas View • {members.length} Members
            </span>
          </div>
        </div>

        {/* Right: Quick Search and Fit-to-screen */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Quick Search */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 backdrop-blur-md focus-within:border-[#D4AF37] shadow-lg transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Find person in tree..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none w-36 sm:w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown Results */}
            {isSearchOpen && filteredMembers.length > 0 && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl p-1.5 z-30">
                {filteredMembers.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => {
                      onSelectPerson(m._id);
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 text-left transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-[#E5C07B] truncate">
                        {m.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Gen {m.generation || "?"} • {m.isDeceased ? "Deceased" : "Living"}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#E5C07B]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle MiniMap Button */}
          <button
            onClick={() => setShowMiniMap((prev) => !prev)}
            title={showMiniMap ? "Hide Minimap" : "Show Minimap"}
            className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all ${
              showMiniMap
                ? "bg-slate-800 text-[#E5C07B] border-[#D4AF37]/50"
                : "bg-slate-900/90 hover:bg-slate-800 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            <Map className="w-4 h-4" />
          </button>

          {/* Fit Lineage Button (if someone is selected) */}
          {selectedPersonId && (
            <button
              onClick={() => zoomToLineage(selectedPersonId, 600)}
              title="Frame Selected Lineage"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#E5C07B] border border-[#D4AF37]/40 hover:border-[#D4AF37] shadow-lg backdrop-blur-md transition-all text-xs font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Fit Lineage</span>
            </button>
          )}

          {/* Fit View / Entire Clan Button */}
          <button
            onClick={() => fitView({ padding: 0.2, duration: 600 })}
            title="Reset to Entire Clan Tree"
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 shadow-lg backdrop-blur-md transition-all"
          >
            <Maximize2 className="w-4 h-4 text-[#E5C07B]" />
          </button>
        </div>
      </div>

      {/* React Flow Infinite Canvas with responsive right boundary to prevent overlapping the inspector */}
      <div
        className={`h-full transition-all duration-300 relative ${
          selectedPerson && immediateFamily && isInspectorOpen
            ? "w-full md:w-[calc(100%-360px)]"
            : "w-full"
        }`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          minZoom={0.15}
          maxZoom={2.5}
          defaultEdgeOptions={{
            type: "smoothstep",
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1.5}
            color="rgba(212, 175, 55, 0.2)"
          />
          {/* Navigation Controls docked cleanly on bottom-left */}
          <Controls
            showInteractive={false}
            position="bottom-left"
            className="!bottom-6 !left-6 !bg-slate-900/90 !border-slate-800 !rounded-xl"
          />
          {showMiniMap && (
            <MiniMap
              position="bottom-left"
              nodeColor={(node: Node) => {
                if (node.type === "coupleNode") return "#D4AF37";
                return "#4A5568";
              }}
              maskColor="rgba(11, 15, 23, 0.75)"
              className="!bottom-6 !left-20 !w-44 !h-28"
              zoomable
              pannable
            />
          )}
        </ReactFlow>
      </div>

      {/* Re-open Family Focus Pill when panel is closed */}
      {selectedPerson && !isInspectorOpen && (
        <button
          onClick={() => setIsInspectorOpen(true)}
          className="absolute top-20 right-5 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-[#E5C07B] border border-[#D4AF37]/40 hover:border-[#D4AF37] shadow-2xl backdrop-blur-md transition-all text-xs font-semibold group animate-in fade-in"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] group-hover:rotate-12 transition-transform" />
          <span>Family Focus ({selectedPerson.name.split(" ")[0]})</span>
        </button>
      )}

      {/* Floating Immediate Family Focus Inspector Drawer on Right Side */}
      {selectedPerson && immediateFamily && isInspectorOpen && (
        <div className="absolute top-20 right-5 bottom-6 w-84 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-slate-900/95 border border-[#D4AF37]/30 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden z-20 animate-in fade-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-xs uppercase tracking-widest text-[#E5C07B] font-mono">
                Immediate Family Focus
              </h3>
            </div>
            <button
              onClick={() => setIsInspectorOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Member Hero Strip */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-xl overflow-hidden border shrink-0 ${
                  selectedPerson.isDeceased
                    ? "border-slate-700 grayscale contrast-105"
                    : "border-[#D4AF37]/50"
                } bg-slate-800`}
              >
                {selectedPerson.photoUrl ? (
                  <img
                    src={selectedPerson.photoUrl}
                    alt={selectedPerson.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg">
                    {selectedPerson.name[0]}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-100 truncate">
                  {selectedPerson.name}
                </h4>
                {selectedPerson.nickname && (
                  <p className="text-xs text-slate-400 italic">
                    &ldquo;{selectedPerson.nickname}&rdquo;
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-slate-400">
                    {selectedPerson.birthDate || "?"} –{" "}
                    {selectedPerson.isDeceased
                      ? selectedPerson.deathDate || "✝"
                      : "Living"}
                  </span>
                  {selectedPerson.isDeceased && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Memorial
                    </span>
                  )}
                </div>
                {selectedPerson.generation && (
                  <div className="mt-1.5">
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      Gen {selectedPerson.generation}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedPerson.bio && (
              <p className="mt-3 text-xs text-slate-300/80 line-clamp-3 leading-relaxed">
                {selectedPerson.bio}
              </p>
            )}

            {/* Deep Focus Button */}
            <button
              onClick={() => onDeepFocusInExplorer(selectedPerson._id)}
              className="mt-3.5 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3CF65] text-slate-950 font-semibold text-xs transition-all shadow-md"
            >
              <Users className="w-3.5 h-3.5" />
              Focus In Deep Explorer
            </button>
          </div>

          {/* Immediate Family Links Roster */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Parents */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Parents ({immediateFamily.parents.length})
              </span>
              {immediateFamily.parents.length > 0 ? (
                <div className="space-y-1.5">
                  {immediateFamily.parents.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => onSelectPerson(p._id)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-700 shrink-0">
                        {p.photoUrl && (
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className={`w-full h-full object-cover ${
                              p.isDeceased ? "grayscale" : ""
                            }`}
                          />
                        )}
                      </div>
                      <span className="text-xs text-slate-200 group-hover:text-[#E5C07B] truncate flex-1 font-medium">
                        {p.name}
                      </span>
                      {p.isDeceased && (
                        <Cross className="w-3 h-3 text-slate-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  No recorded parents
                </p>
              )}
            </div>

            {/* Spouse(s) */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Spouse / Partner ({immediateFamily.spouses.length})
              </span>
              {immediateFamily.spouses.length > 0 ? (
                <div className="space-y-1.5">
                  {immediateFamily.spouses.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => onSelectPerson(s._id)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-700 shrink-0">
                        {s.photoUrl && (
                          <img
                            src={s.photoUrl}
                            alt={s.name}
                            className={`w-full h-full object-cover ${
                              s.isDeceased ? "grayscale" : ""
                            }`}
                          />
                        )}
                      </div>
                      <span className="text-xs text-slate-200 group-hover:text-[#E5C07B] truncate flex-1 font-medium">
                        {s.name}
                      </span>
                      <Heart className="w-3 h-3 text-[#D4AF37] shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">Single</p>
              )}
            </div>

            {/* Children */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Children ({immediateFamily.children.length})
              </span>
              {immediateFamily.children.length > 0 ? (
                <div className="space-y-1.5">
                  {immediateFamily.children.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => onSelectPerson(c._id)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-700 shrink-0">
                        {c.photoUrl && (
                          <img
                            src={c.photoUrl}
                            alt={c.name}
                            className={`w-full h-full object-cover ${
                              c.isDeceased ? "grayscale" : ""
                            }`}
                          />
                        )}
                      </div>
                      <span className="text-xs text-slate-200 group-hover:text-[#E5C07B] truncate flex-1 font-medium">
                        {c.name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#E5C07B] shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No registered children</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const ClanCanvasView: React.FC<ClanCanvasViewProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ClanCanvasInternal {...props} />
    </ReactFlowProvider>
  );
};
