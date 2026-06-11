"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoLogRow {
  trainee: string;
  facultyId: string;
  date: string | null;
  gradiScore: number | null;
  gradiContrib: number | null;
  managerTotal: number | null;
  combinedTotal: number | null;
  videoId?: string;
}

interface YTStats {
  views: number;
  likes: number;
  comments: number;
}

interface FacultyYT {
  name: string;
  facultyId: string;
  views: number;
  subs: number; // using likes as proxy for subs
}

const AVATAR_COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function LeaderboardPage() {
  const [selectedWeek, setSelectedWeek] = useState<string>("live");
  const [ytData, setYtData] = useState<Record<string, YTStats>>({});
  const [loadingYt, setLoadingYt] = useState(false);

  const dataQ = useQuery<{ rows: VideoLogRow[] }>({
    queryKey: ["leaderboard-data"],
    queryFn: () => fetch("/api/archive/videolog").then(r => r.json()),
    refetchInterval: 15_000,
  });

  const rows = dataQ.data?.rows ?? [];

  // Week options
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

  // Fetch YT stats per faculty
  useEffect(() => {
    if (rows.length === 0 || Object.keys(ytData).length > 0 || loadingYt) return;
    const videoIds = new Map<string, { name: string; vids: string[] }>();
    for (const r of rows) {
      if (!r.videoId) continue;
      if (!videoIds.has(r.facultyId)) videoIds.set(r.facultyId, { name: r.trainee, vids: [] });
      videoIds.get(r.facultyId)!.vids.push(r.videoId);
    }
    setLoadingYt(true);
    (async () => {
      const results: Record<string, YTStats> = {};
      for (const [fId, { vids }] of videoIds.entries()) {
        let views = 0, likes = 0, comments = 0;
        for (const vid of vids.slice(0, 10)) {
          try {
            const res = await fetch(`/api/videos/${vid}/youtube-stats`);
            if (res.ok) { const d = await res.json(); views += d.views||0; likes += d.likes||0; comments += d.comments||0; }
          } catch { /* skip */ }
        }
        results[fId] = { views, likes, comments };
      }
      setYtData(results);
      setLoadingYt(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  // Build faculty list sorted by views
  const byViews: FacultyYT[] = useMemo(() => {
    const map = new Map<string, { name: string; views: number; subs: number }>();
    for (const r of rows) {
      if (!map.has(r.facultyId)) map.set(r.facultyId, { name: r.trainee, views: 0, subs: 0 });
    }
    for (const [fId, stats] of Object.entries(ytData)) {
      const e = map.get(fId);
      if (e) { e.views = stats.views; e.subs = stats.likes; }
    }
    return Array.from(map.entries())
      .map(([fId, e]) => ({ name: e.name, facultyId: fId, views: e.views, subs: e.subs }))
      .sort((a, b) => b.views - a.views);
  }, [rows, ytData]);

  const bottomViews = useMemo(() => [...byViews].filter(f => f.views > 0).sort((a, b) => a.views - b.views).slice(0, Math.max(2, Math.ceil(byViews.length * 0.2))), [byViews]);

  if (dataQ.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fg-muted" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Faculty Leaderboard</h1>
            <p className="text-[11px] text-fg-muted">Adda247 EduSkill</p>
          </div>
        </div>
      </div>

      {/* Week selector */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {weeks.map(w => (
          <button key={w.key} onClick={() => setSelectedWeek(w.key)}
            className={cn("relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              selectedWeek === w.key ? "text-bg" : "text-fg-muted hover:text-fg border border-border")}>
            {selectedWeek === w.key && <motion.span layoutId="week-pill" className="absolute inset-0 rounded-full bg-fg -z-10" transition={{ duration: 0.2 }} />}
            {w.label}
          </button>
        ))}
      </div>

      {/* Two-column layout: Top Performers & Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Column 1: Top Performers */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold">Top Performers</h3>
            </div>
            <span className="text-[10px] rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 px-2 py-0.5">
              {byViews.filter(f => f.views > 0).length} faculty
            </span>
          </div>
          {loadingYt ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-fg-muted" /></div>
          ) : (
            <div className="space-y-1">
              {byViews.filter(f => f.views > 0).slice(0, 10).map((f, i) => (
                <motion.div key={f.facultyId}
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-2 hover:bg-bg-elev/60 transition-colors"
                >
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-mono",
                    i === 0 ? "bg-amber-500/15 text-amber-500 border border-amber-500/30" :
                    i < 3 ? "bg-bg-elev border border-border text-fg" : "text-fg-muted"
                  )}>{i + 1}</span>
                  <ColorAvatar name={f.name} />
                  <span className="flex-1 text-xs font-medium text-fg/90 truncate">{f.name}</span>
                  <span className="text-mono text-sm font-bold text-emerald-400">{f.views.toLocaleString("en-IN")}</span>
                </motion.div>
              ))}
              {byViews.filter(f => f.views > 0).length === 0 && <p className="text-xs text-fg-muted text-center py-4">No data yet</p>}
            </div>
          )}
        </div>

        {/* Column 2: Bottom Performers */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <h3 className="text-sm font-semibold">Bottom Performers</h3>
            </div>
            <span className="text-[10px] rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-500 px-2 py-0.5">Bottom 20%</span>
          </div>
          {loadingYt ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-fg-muted" /></div>
          ) : (
            <div className="space-y-1">
              {bottomViews.map((f, i) => (
                <motion.div key={f.facultyId}
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-2 hover:bg-bg-elev/60 transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-mono bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {byViews.length - bottomViews.length + i + 1}
                  </span>
                  <ColorAvatar name={f.name} />
                  <span className="flex-1 text-xs font-medium text-fg/90 truncate">{f.name}</span>
                  <span className="text-mono text-sm font-bold text-rose-500">{f.views.toLocaleString("en-IN")}</span>
                </motion.div>
              ))}
              {bottomViews.length === 0 && <p className="text-xs text-fg-muted text-center py-4">No data yet</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RankingCard({ title, color, badge, rows, valueFormatter, loading }: {
  title: string; color: string; badge: string;
  rows: FacultyYT[]; valueFormatter: (f: FacultyYT) => string; loading: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span className="text-[10px] rounded-full border border-border bg-bg-elev/50 px-2 py-0.5 text-fg-muted">{badge}</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-fg-muted" /></div>
      ) : (
        <div className="space-y-1">
          {rows.map((f, i) => (
            <motion.div key={f.facultyId}
              initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-2 hover:bg-bg-elev/60 transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-mono text-fg-muted">
                {i + 1}
              </span>
              <ColorAvatar name={f.name} />
              <span className="flex-1 text-xs font-medium text-fg/90 truncate">{f.name}</span>
              <span className="text-mono text-sm font-bold" style={{ color }}>
                {valueFormatter(f)}
              </span>
            </motion.div>
          ))}
          {rows.length === 0 && <p className="text-xs text-fg-muted text-center py-4">No data yet</p>}
        </div>
      )}
    </div>
  );
}

function ColorAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const color = getAvatarColor(name);
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 text-white"
      style={{ background: color }}>
      {initial}
    </span>
  );
}
