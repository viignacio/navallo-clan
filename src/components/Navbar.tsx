"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Person } from "../types/clan";
import {
  Maximize2,
  Minimize2,
  Search,
  Settings,
  X,
  ChevronRight,
  Shield,
  RefreshCw,
} from "lucide-react";

interface NavbarProps {
  members: Person[];
  viewMode: "explorer" | "canvas";
  onToggleViewMode: () => void;
  onSelectPerson: (personId: string) => void;
  hasSanityConfigured: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  members,
  viewMode,
  onToggleViewMode,
  onSelectPerson,
  hasSanityConfigured,
  isRefreshing = false,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const total = members.length;
    const deceased = members.filter((m) => m.isDeceased).length;
    const living = total - deceased;
    const maxGen = total > 0 ? Math.max(...members.map((m) => m.generation || 1), 1) : 0;
    return { total, deceased, living, maxGen };
  }, [members]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return members
      .filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 5);
  }, [members, searchQuery]);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-0.5 flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 shrink-0">
            <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#E5C07B]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-serif">
                Navallo Clan
              </h1>
              {hasSanityConfigured && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sanity Live
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats.total > 0
                ? `${stats.total} Members • ${stats.maxGen} Generations`
                : "Awaiting Sanity Entries"}
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative hidden md:block max-w-xs w-full">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 focus-within:border-[#D4AF37] shadow-sm transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={members.length > 0 ? "Search family member..." : "No members yet..."}
              disabled={members.length === 0}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none w-full disabled:opacity-50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl p-1.5 z-40">
              {searchResults.map((m) => (
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
                      {m.name} {m.nickname && `(${m.nickname})`}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Gen {m.generation || "?"} • {m.isDeceased ? "Deceased" : "Living"}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#E5C07B]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Refresh button for Sanity */}
          {hasSanityConfigured && onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh from Sanity"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-[#E5C07B] border border-slate-800 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#D4AF37]" : ""}`}
              />
            </button>
          )}

          {/* View Tree Button (Canvas toggle) */}
          <button
            onClick={onToggleViewMode}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
              viewMode === "canvas"
                ? "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                : "bg-gradient-to-r from-[#D4AF37] to-[#C29D26] hover:from-[#F3CF65] hover:to-[#D4AF37] text-slate-950 shadow-[#D4AF37]/25"
            }`}
          >
            {viewMode === "canvas" ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Canvas</span>
                <span className="sm:hidden">Exit</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>View Tree (Canvas)</span>
              </>
            )}
          </button>

          {/* Sanity Studio Link */}
          <Link
            href="/studio"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors text-xs font-medium"
            title="Open Sanity CMS Studio"
          >
            <Settings className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Sanity Studio</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
