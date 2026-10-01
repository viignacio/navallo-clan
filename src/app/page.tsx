"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Person } from "../types/clan";
import { Navbar } from "../components/Navbar";
import { FocusedFamilyExplorer } from "../components/explorer/FocusedFamilyExplorer";
import { ClanCanvasView } from "../components/canvas/ClanCanvasView";
import { enrichClanMembers } from "../lib/graphLayout";
import { hasSanityCredentials } from "../../sanity/env";
import {
  Maximize2,
  Users,
  Compass,
  Heart,
  Cross,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

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
          setSanityMembers(json.members);
        }
      }
    } catch (err) {
      console.error("Failed to fetch clan data from API:", err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Initial fetch and real-time polling
  useEffect(() => {
    fetchSanityData(false);

    // Auto-refresh when user focuses window (e.g. returning from Sanity Studio tab)
    const onFocus = () => fetchSanityData(true);
    window.addEventListener("focus", onFocus);

    // Periodic background poll every 4 seconds to catch new entries published in Sanity
    const interval = setInterval(() => {
      fetchSanityData(true);
    }, 4000);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
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
        hasSanityConfigured={hasSanityCredentials}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchSanityData(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20">
        {/* Heritage Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-[#0B0F17] to-[#0B0F17] pt-12 pb-8 px-4">
          {/* Subtle gold background ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#E5C07B] text-xs font-mono tracking-wider uppercase">
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              Navallo Clan Digital Archive & Tree
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100 font-serif">
              Generations of Bloodline & Legacy
            </h2>

            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Explore the lineage of the Navallo family. Select any ancestor to
              trace their parents, partners, and children, or switch to the
              infinite Figma-style canvas for a full clan panoramic view.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setViewMode("canvas")}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C29D26] hover:from-[#F3CF65] hover:to-[#D4AF37] text-slate-950 font-semibold text-sm shadow-xl shadow-[#D4AF37]/20 transition-all hover:scale-[1.02]"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Open Full Figma Canvas</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              {members.length > 0 && (
                <button
                  onClick={() => setSelectedPersonId(members[0]._id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-sm font-medium transition-all"
                >
                  <Compass className="w-4 h-4 text-[#D4AF37]" />
                  <span>Jump to Root</span>
                </button>
              )}

              <a
                href="/studio"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-[#E5C07B] border border-[#D4AF37]/30 hover:border-[#D4AF37] text-sm font-medium transition-all"
              >
                <span>Add / Manage Entries in Studio</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

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
          <p>© 1922 – {new Date().getFullYear()} Navallo Clan Archive. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a
              href="/studio"
              className="text-[#E5C07B] hover:underline flex items-center gap-1"
            >
              Sanity Studio CMS
            </a>
            <span>•</span>
            <span className="text-emerald-400">Project: cluf6jle</span>
            <span>•</span>
            <span>Auto-Sync Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
