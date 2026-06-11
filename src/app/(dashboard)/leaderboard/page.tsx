"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Video, Users, Loader2, BarChart3, Eye, ThumbsUp, MessageSquare } from "lucide-react";
import { scoreColor, cn } from "@/lib/utils";

interface VideoLogRow {
  trainee: string;
  facultyId: string;
  date: string | null;
  gradiScore: number | null;
  gradiContrib: number | null;
  managerTotal: number | null;
  combinedTotal: number | null;
  youtubeUrl?: string;
  videoId?: string;
}

interface FacultyAgg {
  name: string;
  facultyId: string;
  videoCount: number;
  avgNet: number; // combined /50
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

interface YTStats {
  views: number;
  likes: number;
  comments: number;
}

export default function LeaderboardPage() {
  const [selectedWeek, setSelectedWeek] = useState<string>("live");
  const [ytStats, setYtStats] = useState<Record<string, YTStats>>({});
  const [loadingYt, setLoadingYt] = useState(false);

  const dataQ = useQuery<{ rows: VideoLogRow[] }>({
    queryKey: ["leaderboard-data"],
    queryFn: () => fetch("/api/archive/videolog").then(r => r.json()),
    refetchInterval: 15_000,
  });

  const rows = dataQ.data?.rows ?? [];

  // Get week keys from data
  const weeks = useMemo(() => {
    const weekSet = new Map<string, string>();
    for (const r of rows) {
      if (!r.date) continue;
      const d = new Date(r.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      const label = `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      weekSet.set(key, label);
    }
    return [{ key: "live", label: "Live" }, ...Array.from(weekSet.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => b.key.localeCompare(a.key))];
  }, [rows]);

  // Filter rows by selected week
  const filteredRows = useMemo(() => {
    if (selectedWeek === "live") return rows;
    return rows.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().split("T")[0] === selectedWeek;
    });
  }, [rows, selectedWeek]);

  // Aggregate by faculty - sorted by NET score (/50)
  const leaderboard = useMemo(() => {
    const byFaculty = new Map<string, { name: string; id: string; combined: number[]; videoIds: string[] }>();
    for (const r of filteredRows) {
      if (!byFaculty.has(r.facultyId)) {
        byFaculty.set(r.facultyId, { name: r.trainee, id: r.facultyId, combined: [], videoIds: [] });
      }
      const e = byFaculty.get(r.facultyId)!;
      if (r.combinedTotal != null) e.combined.push(r.combinedTotal);
      if (r.videoId) e.videoIds.push(r.videoId);
    }
    return Array.from(byFaculty.values())
      .map(e => ({
        name: e.name,
        facultyId: e.id,
        videoCount: e.combined.length || 1,
        avgNet: e.combined.length ? e.combined.reduce((a, b) => a + b, 0) / e.combined.length : 0,
        totalViews: ytStats[e.id]?.views ?? 0,
        totalLikes: ytStats[e.id]?.likes ?? 0,
        totalComments: ytStats[e.id]?.comments ?? 0,
      }))
      .filter(e => e.avgNet > 0)
      .sort((a, b) => b.avgNet - a.avgNet);
  }, [filteredRows, ytStats]);

  // Fetch YouTube stats for all faculty videos
  const fetchAllYtStats = async () => {
    if (loadingYt || rows.length === 0) return;
    setLoadingYt(true);
    const byFaculty = new Map<string, string[]>();
    for (const r of rows) {
      if (!r.videoId) continue;
      if (!byFaculty.has(r.facultyId)) byFaculty.set(r.facultyId, []);
      byFaculty.get(r.facultyId)!.push(r.videoId);
    }
    const results: Record<string, YTStats> = {};
    for (const [fId, videoIds] of byFaculty.entries()) {
      let views = 0, likes = 0, comments = 0;
      for (const vid of videoIds.slice(0, 10)) {
        try {
          const res = await fetch(`/api/videos/${vid}/youtube-stats`);
          if (res.ok) {
            const data = await res.json();
            views += data.views || 0;
            likes += data.likes || 0;
            comments += data.comments || 0;
          }
        } catch { /* skip */ }
      }
      results[fId] = { views, likes, comments };
    }
    setYtStats(results);
    setLoadingYt(false);
  };

  // Auto-fetch YT stats on first load
  useMemo(() => {
    if (rows.length > 0 && Object.keys(ytStats).length === 0 && !loadingYt) {
      fetchAllYtStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  const stats = useMemo(() => ({
    faculty: leaderboard.length,
    videos: filteredRows.length,
    avgNet: leaderboard.length ? (leaderboard.reduce((a, b) => a + b.avgNet, 0) / leaderboard.length).toFixed(1) : "0",
  }), [leaderboard, filteredRows]);

  if (dataQ.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
          <span className="text-[11px] text-fg-muted">Adda247 EduSkill</span>
        </div>
      </div>

      {/* Week selector nav */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {weeks.map(w => (
          <button
            key={w.key}
            onClick={() => setSelectedWeek(w.key)}
            className={cn(
              "relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              selectedWeek === w.key ? "text-bg" : "text-fg-muted hover:text-fg border border-border"
            )}
          >
            {selectedWeek === w.key && (
              <motion.span layoutId="week-pill" className="absolute inset-0 rounded-full bg-fg -z-10" transition={{ duration: 0.2 }} />
            )}
            {w.label}
          </button>
        ))}
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile icon={Users} label="Faculty" value={stats.faculty} />
        <StatTile icon={Video} label="Videos" value={stats.videos} />
        <StatTile icon={BarChart3} label="Avg Score /50" value={stats.avgNet} />
      </div>

      {/* Main leaderboard table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_80px_80px_80px_80px] gap-2 px-5 py-3 border-b border-border text-[10px] uppercase tracking-[0.15em] text-fg-muted font-medium">
          <span>#</span>
          <span>Faculty</span>
          <span className="text-center">Net /50</span>
          <span className="text-center"><Eye className="h-3 w-3 inline" /> Views</span>
          <span className="text-center"><ThumbsUp className="h-3 w-3 inline" /> Likes</span>
          <span className="text-center"><MessageSquare className="h-3 w-3 inline" /> Comments</span>
        </div>

        <AnimatePresence>
          {leaderboard.map((f, i) => (
            <motion.div
              key={f.facultyId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[40px_1fr_80px_80px_80px_80px] gap-2 px-5 py-3 border-b border-border/50 hover:bg-bg-elev/30 transition-colors items-center"
            >
              <span className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-mono",
                i === 0 ? "bg-amber-500/15 text-amber-500 border border-amber-500/30" :
                i < 3 ? "bg-bg-elev border border-border text-fg" :
                "text-fg-muted"
              )}>
                {i + 1}
              </span>

              <div className="flex items-center gap-2.5 min-w-0">
                <InitialsAvatar name={f.name} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{f.name}</p>
                  <p className="text-[10px] text-fg-muted">{f.videoCount} videos</p>
                </div>
              </div>

              <div className="text-center">
                <span className="text-mono text-sm font-bold" style={{ color: scoreColor(f.avgNet / 10) }}>
                  {f.avgNet.toFixed(1)}
                </span>
              </div>

              <div className="text-center text-mono text-xs text-fg-muted">
                {f.totalViews > 0 ? f.totalViews.toLocaleString() : loadingYt ? "..." : "—"}
              </div>

              <div className="text-center text-mono text-xs text-fg-muted">
                {f.totalLikes > 0 ? f.totalLikes.toLocaleString() : loadingYt ? "..." : "—"}
              </div>

              <div className="text-center text-mono text-xs text-fg-muted">
                {f.totalComments > 0 ? f.totalComments.toLocaleString() : loadingYt ? "..." : "—"}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {leaderboard.length === 0 && (
          <div className="py-12 text-center text-sm text-fg-muted">
            No scored videos for this period yet.
          </div>
        )}
      </div>
    </div>
  );
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(s => s[0]).slice(0, 2).join("");
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-fg/20 to-fg/5 text-[10px] font-semibold shrink-0">
      {initials}
    </span>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted mb-1">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <div className="text-mono text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
