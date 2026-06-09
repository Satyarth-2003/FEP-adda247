"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Video, Loader2 } from "lucide-react";
import { scoreColor } from "@/lib/utils";

interface LeaderRow {
  trainee: string;
  facultyId: string;
  videoCount: number;
  avgGradi: number;
  avgManager: number;
  avgCombined: number;
}

interface VideoLogRow {
  trainee: string;
  facultyId: string;
  gradiScore: number | null;
  gradiContrib: number | null;
  managerTotal: number | null;
  combinedTotal: number | null;
}

export default function LeaderboardPage() {
  const dataQ = useQuery<{ rows: VideoLogRow[] }>({
    queryKey: ["leaderboard-data"],
    queryFn: () => fetch("/api/archive/videolog").then(r => r.json()),
    refetchInterval: 15_000,
  });

  const rows = dataQ.data?.rows ?? [];

  // Aggregate by faculty
  const byFaculty = new Map<string, { trainee: string; facultyId: string; gradiScores: number[]; managerTotals: number[]; combinedTotals: number[] }>();
  for (const r of rows) {
    const key = r.facultyId;
    if (!byFaculty.has(key)) {
      byFaculty.set(key, { trainee: r.trainee, facultyId: r.facultyId, gradiScores: [], managerTotals: [], combinedTotals: [] });
    }
    const entry = byFaculty.get(key)!;
    if (r.gradiScore != null) entry.gradiScores.push(r.gradiScore);
    if (r.managerTotal != null) entry.managerTotals.push(r.managerTotal);
    if (r.combinedTotal != null) entry.combinedTotals.push(r.combinedTotal);
  }

  const leaderboard: LeaderRow[] = Array.from(byFaculty.values())
    .map(e => ({
      trainee: e.trainee,
      facultyId: e.facultyId,
      videoCount: e.gradiScores.length || e.managerTotals.length,
      avgGradi: e.gradiScores.length ? e.gradiScores.reduce((a, b) => a + b, 0) / e.gradiScores.length : 0,
      avgManager: e.managerTotals.length ? e.managerTotals.reduce((a, b) => a + b, 0) / e.managerTotals.length : 0,
      avgCombined: e.combinedTotals.length ? e.combinedTotals.reduce((a, b) => a + b, 0) / e.combinedTotals.length : 0,
    }))
    .filter(e => e.videoCount > 0)
    .sort((a, b) => b.avgCombined - a.avgCombined || b.avgGradi - a.avgGradi);

  if (dataQ.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 md:px-6 py-8 md:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        </div>
        <p className="text-sm text-fg-muted mb-8">
          Ranked by combined score (Manager /25 + Gradi AI /25 = /50). Updates live as videos are rated.
        </p>
      </motion.div>

      {leaderboard.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <Trophy className="h-8 w-8 text-fg-dim mx-auto mb-3" />
          <p className="text-sm text-fg-muted">No scored videos yet.</p>
          <p className="text-[11px] text-fg-dim mt-1">Upload videos and rate them to populate the leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((row, i) => {
            const color = scoreColor(row.avgCombined / 10);
            const isTop3 = i < 3;
            return (
              <motion.div
                key={row.facultyId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="group glass rounded-xl p-4 flex items-center gap-4 hover:border-border-strong transition-colors"
              >
                {/* Rank */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-mono text-sm font-bold shrink-0"
                  style={{
                    background: isTop3
                      ? i === 0 ? "rgba(245,158,11,0.15)" : i === 1 ? "rgba(168,162,158,0.15)" : "rgba(180,83,9,0.15)"
                      : "var(--bg-elev)",
                    color: isTop3
                      ? i === 0 ? "#f59e0b" : i === 1 ? "#a8a29e" : "#b45309"
                      : "var(--fg-muted)",
                    border: isTop3 ? `1px solid ${i === 0 ? "rgba(245,158,11,0.3)" : i === 1 ? "rgba(168,162,158,0.3)" : "rgba(180,83,9,0.3)"}` : "1px solid var(--border)",
                  }}
                >
                  {i + 1}
                </div>

                {/* Avatar + name */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fg/20 to-fg/5 text-xs font-semibold shrink-0">
                  {row.trainee.split(" ").map(s => s[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{row.trainee}</p>
                  <div className="flex items-center gap-3 text-[11px] text-fg-muted mt-0.5">
                    <span className="flex items-center gap-1"><Video className="h-3 w-3" />{row.videoCount} videos</span>
                    <span>Gradi avg: <span className="text-mono" style={{ color: scoreColor(row.avgGradi) }}>{row.avgGradi.toFixed(1)}</span>/5</span>
                    <span>Manager avg: <span className="text-mono">{row.avgManager > 0 ? `${row.avgManager.toFixed(0)}/25` : "—"}</span></span>
                  </div>
                </div>

                {/* Combined score */}
                <div className="text-right shrink-0">
                  <div className="text-mono text-2xl font-bold" style={{ color }}>
                    {row.avgCombined.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-fg-muted">/ 50</div>
                </div>

                {/* Trend arrow */}
                <TrendingUp className="h-4 w-4 shrink-0" style={{ color }} />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
