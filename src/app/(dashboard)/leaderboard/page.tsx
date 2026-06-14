"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FacultyLeaderRow {
  userId: string;
  name: string;
  email: string;
  subjects: string[];
  videoCount: number;
  avgGradiScore: number;
  installs?: number;
  views?: number;
  subscribersGained?: number;
}

const AVATAR_COLORS = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#6366f1","#84cc16"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function LeaderboardPage() {
  const [selectedCohort, setSelectedCohort] = useState<"June FEP" | "March FEP">("June FEP");
  const [selectedTab, setSelectedTab] = useState<string>("total");

  // Fetch March FEP stats
  const marchQ = useQuery<{ leaderboard: FacultyLeaderRow[] }>({
    queryKey: ["leaderboard-march"],
    queryFn: () => fetch("/api/stats?scope=all&cohort=March+FEP").then(r => r.json()),
    refetchInterval: 15_000,
  });

  // Fetch June FEP stats
  const juneQ = useQuery<{ leaderboard: FacultyLeaderRow[] }>({
    queryKey: ["leaderboard-june"],
    queryFn: () => fetch("/api/stats?scope=all&cohort=June+FEP").then(r => r.json()),
    refetchInterval: 15_000,
  });

  const loading = selectedCohort === "June FEP" ? juneQ.isLoading : marchQ.isLoading;
  const list = selectedCohort === "June FEP" ? (juneQ.data?.leaderboard ?? []) : (marchQ.data?.leaderboard ?? []);

  // Tabs: Total
  const tabs = [
    { key: "total", label: "Total" }
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fg-muted" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Faculty Leaderboard</h1>
            <p className="text-[11px] text-fg-muted">Adda247 Faculty Excellence Program</p>
          </div>
        </div>

        {/* Cohort Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-bg-elev/50 p-1 w-fit">
          {(["June FEP", "March FEP"] as const).map(c => (
            <button key={c} onClick={() => { setSelectedCohort(c); setSelectedTab("total"); }}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-medium transition-all cursor-pointer",
                selectedCohort === c
                  ? "bg-fg text-bg shadow-sm"
                  : "text-fg-muted hover:text-fg"
              )}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Week selector nav */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2 border-b border-border/40">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSelectedTab(t.key)}
            className={cn("relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors isolate",
              selectedTab === t.key ? "text-white" : "text-fg-muted hover:text-fg border border-border")}>
            {selectedTab === t.key && <motion.span layoutId="lb-pill" className="absolute inset-0 rounded-full bg-emerald-600 -z-10" transition={{ duration: 0.2 }} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold">Leaderboard Ranking</h3>
          </div>
          <span className="text-[10px] rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5">
            {list.length} faculty members
          </span>
        </div>

        {list.length === 0 ? (
          <p className="text-xs text-fg-muted text-center py-8">No data loaded yet</p>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className={cn(
              "grid gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-fg-dim font-mono font-bold",
              selectedCohort === "March FEP" 
                ? "grid-cols-[40px_1fr_100px_100px_100px_40px]" 
                : "grid-cols-[40px_1fr_120px_40px]"
            )}>
              <span>Rank</span>
              <span>Faculty</span>
              {selectedCohort === "March FEP" ? (
                <>
                  <span className="text-right">Installs</span>
                  <span className="text-right">Views</span>
                  <span className="text-right">Subscribers</span>
                </>
              ) : (
                <span className="text-right">Avg Score /25</span>
              )}
              <span className="text-right">View</span>
            </div>

            <AnimatePresence>
              {list.map((f, i) => (
                <motion.div key={f.userId} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                  <Link href={`/manager?facultyId=${f.userId}`} className={cn(
                    "grid gap-4 items-center rounded-xl border border-border/60 bg-bg-elev/30 hover:border-border-strong hover:bg-bg-elev/60 px-4 py-3.5 transition-colors text-left",
                    selectedCohort === "March FEP" 
                      ? "grid-cols-[40px_1fr_100px_100px_100px_40px]" 
                      : "grid-cols-[40px_1fr_120px_40px]"
                  )}>
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-mono",
                      i === 0 ? "bg-amber-500/15 text-amber-500 border border-amber-500/30" : i < 3 ? "bg-bg-elev border border-border text-fg" : "text-fg-muted"
                    )}>{i + 1}</span>
                    
                    <div className="flex items-center gap-3 min-w-0">
                      <ColorAvatar name={f.name} />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-fg/90 truncate">{f.name}</span>
                        <span className="block text-[10px] text-fg-dim truncate">{f.email}</span>
                      </div>
                    </div>

                    {selectedCohort === "March FEP" ? (
                      <>
                        <span className="text-mono text-sm font-bold text-emerald-400 text-right">{f.installs}</span>
                        <span className="text-mono text-sm font-semibold text-blue-400 text-right">{f.views}</span>
                        <span className="text-mono text-sm font-semibold text-violet-400 text-right">{f.subscribersGained}</span>
                      </>
                    ) : (
                      <span className="text-mono text-sm font-bold text-emerald-400 text-right">
                        {f.avgGradiScore ? (f.avgGradiScore * 5).toFixed(1) : "—"}
                      </span>
                    )}

                    <div className="flex justify-end">
                      <ArrowRight className="h-4 w-4 text-fg-muted hover:text-fg" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function ColorAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const color = getAvatarColor(name);
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold shrink-0 text-white" style={{ background: color }}>
      {initial}
    </span>
  );
}
