"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Video, Users, Loader2, BarChart3 } from "lucide-react";
import { scoreColor } from "@/lib/utils";

interface VideoLogRow {
  trainee: string;
  facultyId: string;
  date: string | null;
  gradiScore: number | null;
  gradiContrib: number | null;
  managerTotal: number | null;
  combinedTotal: number | null;
}

interface FacultyAgg {
  name: string;
  facultyId: string;
  videoCount: number;
  avgGradi: number;
  avgManager: number;
  avgCombined: number;
}

export default function LeaderboardPage() {
  const dataQ = useQuery<{ rows: VideoLogRow[] }>({
    queryKey: ["leaderboard-data"],
    queryFn: () => fetch("/api/archive/videolog").then(r => r.json()),
    refetchInterval: 15_000,
  });

  const rows = dataQ.data?.rows ?? [];

  // Aggregate by faculty
  const leaderboard = useMemo(() => {
    const byFaculty = new Map<string, { name: string; id: string; gradi: number[]; mgr: number[]; combined: number[] }>();
    for (const r of rows) {
      if (!byFaculty.has(r.facultyId)) {
        byFaculty.set(r.facultyId, { name: r.trainee, id: r.facultyId, gradi: [], mgr: [], combined: [] });
      }
      const e = byFaculty.get(r.facultyId)!;
      if (r.gradiScore != null) e.gradi.push(r.gradiScore);
      if (r.managerTotal != null) e.mgr.push(r.managerTotal);
      if (r.combinedTotal != null) e.combined.push(r.combinedTotal);
    }
    return Array.from(byFaculty.values())
      .map(e => ({
        name: e.name,
        facultyId: e.id,
        videoCount: Math.max(e.gradi.length, e.mgr.length, 1),
        avgGradi: e.gradi.length ? e.gradi.reduce((a, b) => a + b, 0) / e.gradi.length : 0,
        avgManager: e.mgr.length ? e.mgr.reduce((a, b) => a + b, 0) / e.mgr.length : 0,
        avgCombined: e.combined.length ? e.combined.reduce((a, b) => a + b, 0) / e.combined.length : 0,
      }))
      .filter(e => e.avgGradi > 0 || e.avgManager > 0);
  }, [rows]);

  // Week-wise grouping
  const weeklyData = useMemo(() => {
    const byWeek = new Map<string, Map<string, { name: string; gradi: number[]; mgr: number[] }>>();
    for (const r of rows) {
      if (!r.date) continue;
      const d = new Date(r.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      if (!byWeek.has(weekKey)) byWeek.set(weekKey, new Map());
      const wk = byWeek.get(weekKey)!;
      if (!wk.has(r.facultyId)) wk.set(r.facultyId, { name: r.trainee, gradi: [], mgr: [] });
      const e = wk.get(r.facultyId)!;
      if (r.gradiScore != null) e.gradi.push(r.gradiScore);
      if (r.managerTotal != null) e.mgr.push(r.managerTotal);
    }
    return Array.from(byWeek.entries())
      .map(([weekKey, faculty]) => {
        const top = Array.from(faculty.values())
          .map(f => ({ name: f.name, avgGradi: f.gradi.length ? f.gradi.reduce((a, b) => a + b, 0) / f.gradi.length : 0 }))
          .sort((a, b) => b.avgGradi - a.avgGradi)
          .slice(0, 5);
        return { week: weekKey, topFaculty: top };
      })
      .sort((a, b) => b.week.localeCompare(a.week));
  }, [rows]);

  // Sorted views
  const byGradi = useMemo(() => [...leaderboard].sort((a, b) => b.avgGradi - a.avgGradi), [leaderboard]);
  const byManager = useMemo(() => [...leaderboard].filter(f => f.avgManager > 0).sort((a, b) => b.avgManager - a.avgManager), [leaderboard]);
  const bottomPerformers = useMemo(() => [...leaderboard].sort((a, b) => a.avgCombined - b.avgCombined).slice(0, Math.max(3, Math.ceil(leaderboard.length * 0.2))), [leaderboard]);

  const stats = useMemo(() => ({
    faculty: leaderboard.length,
    videos: rows.length,
    avgScore: leaderboard.length ? (leaderboard.reduce((a, b) => a + b.avgGradi, 0) / leaderboard.length).toFixed(1) : "0",
  }), [leaderboard, rows]);

  if (dataQ.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 md:py-10">
      {/* Stats tiles */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile icon={Users} label="Faculty" value={stats.faculty} />
        <StatTile icon={Video} label="Videos Scored" value={stats.videos} />
        <StatTile icon={BarChart3} label="Avg Gradi" value={stats.avgScore} />
      </div>

      {/* Title + filter area */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-semibold tracking-tight">Faculty Leaderboard</h1>
          <span className="text-[11px] text-fg-muted">Adda247</span>
        </div>
      </div>

      {/* Week-wise section */}
      {weeklyData.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-muted mb-3">Week-wise Top Performers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {weeklyData.slice(0, 3).map(wk => (
              <div key={wk.week} className="glass rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-fg/85">Week of {wk.week}</span>
                  <span className="text-[10px] text-fg-muted rounded-full border border-border px-2 py-0.5">
                    {wk.topFaculty.length} faculty
                  </span>
                </div>
                <div className="space-y-1.5">
                  {wk.topFaculty.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-mono"
                        style={{ background: i === 0 ? "rgba(245,158,11,0.15)" : "var(--bg-elev)", color: i === 0 ? "#f59e0b" : "var(--fg-muted)", border: "1px solid var(--border)" }}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-xs text-fg/90 truncate">{f.name}</span>
                      <span className="text-mono text-xs font-semibold" style={{ color: scoreColor(f.avgGradi) }}>
                        {f.avgGradi.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Three-column leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Gradi AI Score */}
        <RankingCard
          title="Gradi AI Score"
          color="#10b981"
          badge={`${byGradi.length} faculty`}
          rows={byGradi.slice(0, 10)}
          valueKey="avgGradi"
          valueFormat={(v) => v.toFixed(1)}
          maxVal={5}
        />

        {/* Column 2: Manager Score */}
        <RankingCard
          title="Manager Score"
          color="#f59e0b"
          badge={`${byManager.length} faculty`}
          rows={byManager.slice(0, 10)}
          valueKey="avgManager"
          valueFormat={(v) => v.toFixed(0)}
          maxVal={25}
          suffix="/25"
        />

        {/* Column 3: Bottom Performers */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <h3 className="text-sm font-semibold">Bottom Performers</h3>
            </div>
            <span className="text-[10px] rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-500 px-2 py-0.5">
              Bottom 20%
            </span>
          </div>

          {bottomPerformers.length > 0 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">Gradi Score</span>
                  <span className="ml-auto text-[10px] text-fg-muted">{bottomPerformers.length} faculty</span>
                </div>
                <div className="space-y-1">
                  {bottomPerformers.filter(f => f.avgGradi > 0).slice(0, 5).map((f, i) => (
                    <div key={f.facultyId} className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-mono bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        {leaderboard.length - bottomPerformers.length + i + 1}
                      </span>
                      <InitialsAvatar name={f.name} />
                      <span className="flex-1 text-xs text-fg/90 truncate">{f.name}</span>
                      <span className="text-mono text-xs font-semibold text-rose-500">{f.avgGradi.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {bottomPerformers.some(f => f.avgManager > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">Manager Score</span>
                  </div>
                  <div className="space-y-1">
                    {bottomPerformers.filter(f => f.avgManager > 0).slice(0, 5).map((f, i) => (
                      <div key={f.facultyId + "-mgr"} className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-mono bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          {leaderboard.length - bottomPerformers.length + i + 1}
                        </span>
                        <InitialsAvatar name={f.name} />
                        <span className="flex-1 text-xs text-fg/90 truncate">{f.name}</span>
                        <span className="text-mono text-xs font-semibold text-rose-500">+{f.avgManager.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RankingCard({ title, color, badge, rows, valueKey, valueFormat, maxVal, suffix = "" }: {
  title: string; color: string; badge: string;
  rows: FacultyAgg[]; valueKey: keyof FacultyAgg;
  valueFormat: (v: number) => string; maxVal: number; suffix?: string;
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
      <div className="space-y-1">
        {rows.map((f, i) => {
          const val = f[valueKey] as number;
          return (
            <motion.div key={f.facultyId}
              initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-2 hover:bg-bg-elev/60 transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-mono"
                style={{
                  background: i === 0 ? "rgba(245,158,11,0.15)" : i < 3 ? "var(--bg-elev)" : "transparent",
                  color: i === 0 ? "#f59e0b" : i < 3 ? "var(--fg)" : "var(--fg-muted)",
                  border: i < 3 ? `1px solid ${i === 0 ? "rgba(245,158,11,0.3)" : "var(--border)"}` : "none",
                }}>
                {i + 1}
              </span>
              <InitialsAvatar name={f.name} />
              <span className="flex-1 text-xs font-medium text-fg/90 truncate">{f.name}</span>
              <span className="text-mono text-sm font-bold" style={{ color: scoreColor(val / (maxVal / 5)) }}>
                {valueFormat(val)}{suffix}
              </span>
            </motion.div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-xs text-fg-muted text-center py-4">No data yet</p>
        )}
      </div>
    </div>
  );
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(s => s[0]).slice(0, 2).join("");
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-fg/20 to-fg/5 text-[9px] font-semibold shrink-0">
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
