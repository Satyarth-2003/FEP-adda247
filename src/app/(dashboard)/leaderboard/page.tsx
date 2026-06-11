"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import archiveData from "@/data/programArchive.json";

interface VideoLogRow {
  trainee: string;
  facultyId: string;
  date: string | null;
  combinedTotal: number | null;
  videoId?: string;
}

interface FacultyScore {
  name: string;
  score: number;
}

const AVATAR_COLORS = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#6366f1","#84cc16"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Parse archive scoreboard into week-wise data
const scoreboard = (archiveData as { scoreboard: { name: string; wk1: number; wk2: number; wk3: number; wk4: number; total: number }[] }).scoreboard ?? [];
const weekLabels = ["Wk 1 · 6–12 Apr", "Wk 2 · 13–19 Apr", "Wk 3 · 20–26 Apr", "Wk 4 · 27 Apr–3 May"];

function getWeekData(weekIdx: number): FacultyScore[] {
  const key = `wk${weekIdx + 1}` as "wk1" | "wk2" | "wk3" | "wk4";
  return scoreboard
    .map(s => ({ name: s.name, score: s[key] ?? 0 }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

export default function LeaderboardPage() {
  const [selectedTab, setSelectedTab] = useState<string>("live");

  const [showAllTop, setShowAllTop] = useState(false);
  const [showAllBottom, setShowAllBottom] = useState(false);

  const dataQ = useQuery<{ rows: VideoLogRow[] }>({
    queryKey: ["leaderboard-data"],
    queryFn: () => fetch("/api/archive/videolog").then(r => r.json()),
    refetchInterval: 15_000,
  });

  const rows = dataQ.data?.rows ?? [];

  // Live leaderboard from actual scored videos
  const liveLeaderboard: FacultyScore[] = useMemo(() => {
    const byFaculty = new Map<string, { name: string; scores: number[] }>();
    for (const r of rows) {
      if (!byFaculty.has(r.facultyId)) byFaculty.set(r.facultyId, { name: r.trainee, scores: [] });
      if (r.combinedTotal != null) byFaculty.get(r.facultyId)!.scores.push(r.combinedTotal);
    }
    return Array.from(byFaculty.values())
      .map(e => ({ name: e.name, score: e.scores.length ? e.scores.reduce((a, b) => a + b, 0) / e.scores.length : 0 }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [rows]);

  // Tabs: Live + Week 1-4
  const tabs = [
    { key: "live", label: "Live" },
    ...weekLabels.map((l, i) => ({ key: `wk${i}`, label: l })),
  ];

  // Get current data based on selected tab
  const currentData: FacultyScore[] = useMemo(() => {
    if (selectedTab === "live") return liveLeaderboard;
    const idx = parseInt(selectedTab.replace("wk", ""));
    return getWeekData(idx);
  }, [selectedTab, liveLeaderboard]);

  const topPerformers = showAllTop ? currentData : currentData.slice(0, 10);
  const bottomPerformers = currentData.length > 3
    ? (showAllBottom ? currentData.slice(-Math.max(3, Math.ceil(currentData.length * 0.2))) : currentData.slice(-Math.max(3, Math.ceil(currentData.length * 0.2))).slice(0, 10))
    : [];
  const totalBottom = currentData.length > 3 ? Math.max(3, Math.ceil(currentData.length * 0.2)) : 0;

  if (dataQ.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fg-muted" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 md:py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-5 w-5 text-amber-500" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Faculty Leaderboard</h1>
          <p className="text-[11px] text-fg-muted">Adda247 EduSkill</p>
        </div>
      </div>

      {/* Week selector nav */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSelectedTab(t.key)}
            className={cn("relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors isolate",
              selectedTab === t.key ? "text-white" : "text-fg-muted hover:text-fg border border-border")}>
            {selectedTab === t.key && <motion.span layoutId="lb-pill" className="absolute inset-0 rounded-full bg-emerald-600 -z-10" transition={{ duration: 0.2 }} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Performers */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold">Top Performers</h3>
            </div>
            <span className="text-[10px] rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 px-2 py-0.5">
              {topPerformers.length} faculty
            </span>
          </div>
          <div className="space-y-1">
            <AnimatePresence>
              {topPerformers.map((f, i) => (
                <motion.div key={f.name} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-2 hover:bg-bg-elev/60 transition-colors">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-mono",
                    i === 0 ? "bg-amber-500/15 text-amber-500 border border-amber-500/30" : i < 3 ? "bg-bg-elev border border-border text-fg" : "text-fg-muted"
                  )}>{i + 1}</span>
                  <ColorAvatar name={f.name} />
                  <span className="flex-1 text-xs font-medium text-fg/90 truncate">{f.name}</span>
                  <span className="text-mono text-sm font-bold text-emerald-400">{f.score.toFixed(1)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {topPerformers.length === 0 && <p className="text-xs text-fg-muted text-center py-4">No data yet</p>}
          </div>
          {currentData.length > 10 && (
            <button onClick={() => setShowAllTop(p => !p)}
              className="mt-3 w-full text-center text-[11px] font-medium text-fg-muted hover:text-fg transition-colors py-2 rounded-lg border border-border hover:border-border-strong">
              {showAllTop ? `Show less` : `Show all ${currentData.length} faculty`}
            </button>
          )}
        </div>

        {/* Bottom Performers */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <h3 className="text-sm font-semibold">Bottom Performers</h3>
            </div>
            <span className="text-[10px] rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-500 px-2 py-0.5">Bottom 20%</span>
          </div>
          <div className="space-y-1">
            <AnimatePresence>
              {bottomPerformers.map((f, i) => (
                <motion.div key={f.name} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-2 hover:bg-bg-elev/60 transition-colors">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-mono bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {currentData.length - bottomPerformers.length + i + 1}
                  </span>
                  <ColorAvatar name={f.name} />
                  <span className="flex-1 text-xs font-medium text-fg/90 truncate">{f.name}</span>
                  <span className="text-mono text-sm font-bold text-rose-500">{f.score.toFixed(1)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {bottomPerformers.length === 0 && <p className="text-xs text-fg-muted text-center py-4">No data yet</p>}
          </div>
          {totalBottom > 10 && (
            <button onClick={() => setShowAllBottom(p => !p)}
              className="mt-3 w-full text-center text-[11px] font-medium text-fg-muted hover:text-fg transition-colors py-2 rounded-lg border border-border hover:border-border-strong">
              {showAllBottom ? `Show less` : `Show all ${totalBottom} faculty`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ColorAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const color = getAvatarColor(name);
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 text-white" style={{ background: color }}>
      {initial}
    </span>
  );
}
