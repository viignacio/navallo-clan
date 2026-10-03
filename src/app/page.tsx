"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Person } from "../types/clan";
import { Navbar } from "../components/Navbar";
import { FocusedFamilyExplorer } from "../components/explorer/FocusedFamilyExplorer";
import { ClanCanvasView } from "../components/canvas/ClanCanvasView";
import { enrichClanMembers } from "../lib/graphLayout";


export default function ClanTreeHomePage() {
  const [sanityMembers, setSanityMembers] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"explorer" | "canvas">("explorer");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active members from Sanity, enriched with computed generations
  const members = useMemo(
    () => enrichClanMembers(sanityMembers),
    [sanityMembers]
  );

  // Set default selected person whenever members change
  useEffect(() => {
    if (members.length > 0) {
      if (!selectedPersonId || !members.some((m) => m._id === selectedPersonId)) {
        setSelectedPersonId(members[0]._id);
      }
    } else {
      setSelectedPersonId("");
    }
  }, [members, selectedPersonId]);

  // Fetch function to call Next.js API server endpoint
  const fetchSanityData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/clan", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.members && Array.isArray(json.members)) {
          setSanityMembers((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(json.members)) {
              return prev;
            }
            return json.members;
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch clan data from API:", err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Initial fetch and focus listener (re-fetches when returning from Studio)
  useEffect(() => {
    fetchSanityData(false);

    const onFocus = () => fetchSanityData(true);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchSanityData]);

  // When canvas mode is active, render full-screen Figma Canvas UI
  if (viewMode === "canvas") {
    return (
      <ClanCanvasView
        members={members}
        selectedPersonId={selectedPersonId}
        onSelectPerson={(id) => setSelectedPersonId(id)}
        onExitCanvas={() => setViewMode("explorer")}
        onDeepFocusInExplorer={(id) => {
          setSelectedPersonId(id);
          setViewMode("explorer");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F1EDE6] flex flex-col selection:bg-[#D4AF37] selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        members={members}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode("canvas")}
        onSelectPerson={(id) => setSelectedPersonId(id)}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchSanityData(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20">
        {/* Focused Family Interactive Tree View */}
        <FocusedFamilyExplorer
          members={members}
          selectedPersonId={selectedPersonId}
          onSelectPerson={(id) => setSelectedPersonId(id)}
          onOpenCanvas={() => setViewMode("canvas")}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 px-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Navallo Clan Archive. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Auto-Sync Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
