"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Sparkles, LayoutGrid, BarChart3 } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";
import { VideoCard } from "@/components/VideoCard";
import { VideoDrawer } from "@/components/VideoDrawer";
import { SubjectTabs } from "@/components/SubjectTabs";
import { SubjectRadar, buildRadarData } from "@/components/SubjectRadar";
import { ScoreRing } from "@/components/ScoreRing";
import { ProgramAnalytics } from "@/components/ProgramAnalytics";
import { cn } from "@/lib/utils";
import type { Subject, Video, GradiAnalysis, JWTPayload } from "@/types";

interface AggregateStats {
  leaderboard: {
    userId: string;
    name: string;
    email: string;
    subjects: string[];
    videoCount: number;
    avgGradiScore: number;
  }[];
  totalFaculty: number;
  totalVideos: number;
  totalAnalyses: number;
  totalRatings: number;
  subjectAgg: Record<string, { keys: string[]; sums: number[]; n: number }>;
}

interface FacultyStats {
  facultyId: string;
  totalVideos: number;
  avgGradiScore: number;
  pctRatedByManager: number;
  bySubject: Record<string, { count: number; avgScore: number; videos: Video[] }>;
  videos: (Video & { analysis?: GradiAnalysis | null })[];
}

export default function ManagerDashboard() {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState("all");
  const [view, setView] = useState<"roster" | "analytics">("roster");

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<{ user: JWTPayload | null }> =>
      (await fetch("/api/auth/me")).json(),
  });

  const subjectsQ = useQuery({
    queryKey: ["subjects"],
    queryFn: async (): Promise<{ subjects: Subject[] }> =>
      (await fetch("/api/subjects")).json(),
  });

  const aggQ = useQuery({
    queryKey: ["aggregate"],
    queryFn: async (): Promise<AggregateStats> =>
      (await fetch("/api/stats?scope=all")).json(),
    refetchInterval: 8000,
  });

  const facultyQ = useQuery({
    queryKey: ["faculty-detail", selectedFaculty],
    queryFn: async (): Promise<FacultyStats> =>
      (
        await fetch(`/api/stats?facultyId=${selectedFaculty}`)
      ).json(),
    enabled: !!selectedFaculty,
  });

  const subjects = subjectsQ.data?.subjects ?? [];
  const subjectsByName = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.subjectId, s.name])),
    [subjects]
  );

  const filteredLeaders = useMemo(() => {
    const list = aggQ.data?.leaderboard ?? [];
    return list.filter((r) => {
      const matchSearch = search
        ? r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.email.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchSubject =
        subjectFilter === "all" || r.subjects.includes(subjectFilter);
      return matchSearch && matchSubject;
    });
  }, [aggQ.data, search, subjectFilter]);

  const filteredVideos = useMemo(() => {
    const list = facultyQ.data?.videos ?? [];
    if (activeSubjectTab === "all") return list;
    return list.filter((v) => v.subjectId === activeSubjectTab);
  }, [facultyQ.data, activeSubjectTab]);

  const facultySubjectTabs = useMemo(() => {
    const tabs = [
      { id: "all", label: "All", count: facultyQ.data?.totalVideos ?? 0 },
    ];
    for (const s of subjects) {
      const c = facultyQ.data?.bySubject?.[s.subjectId]?.count;
      if (c) tabs.push({ id: s.subjectId, label: s.name, count: c });
    }
    return tabs;
  }, [subjects, facultyQ.data]);

  const selectedFacultyRow = useMemo(
    () =>
      aggQ.data?.leaderboard.find((r) => r.userId === selectedFaculty) ?? null,
    [aggQ.data, selectedFaculty]
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elev/50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
            <Sparkles className="h-3 w-3" />
            Manager Console
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-bg-elev/50 p-0.5">
            {(
              [
                { id: "roster" as const, label: "Roster", icon: LayoutGrid },
                { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
              ]
            ).map((v) => {
              const Icon = v.icon;
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    active ? "text-bg" : "text-fg-muted hover:text-fg"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="manager-view-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-fg"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <Icon className="h-3 w-3" />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-fg-muted">
          <Users className="h-3 w-3" />
          <span className="text-mono text-fg/85">
            {aggQ.data?.totalFaculty ?? 0}
          </span>
          <span>faculty</span>
          <span className="text-fg-dim mx-1">·</span>
          <span className="text-mono text-fg/85">
            {aggQ.data?.totalVideos ?? 0}
          </span>
          <span>videos</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {view === "analytics" ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProgramAnalytics subjects={subjects} />
          </motion.div>
        ) : (
          <motion.div
            key="roster"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Top hero strip */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8"
            >
        <div className="glass-strong lg:col-span-2 rounded-2xl p-5 flex items-center gap-5">
          <ScoreRing
            size={88}
            stroke={6}
            label="OVERALL"
            score={
              aggQ.data?.leaderboard?.length
                ? aggQ.data.leaderboard.reduce(
                    (a, b) => a + b.avgGradiScore,
                    0
                  ) /
                  Math.max(
                    aggQ.data.leaderboard.filter((r) => r.avgGradiScore > 0)
                      .length,
                    1
                  )
                : 0
            }
          />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-fg-muted">
              Cohort Performance
            </p>
            <h1 className="mt-1 text-xl md:text-2xl font-semibold tracking-tight">
              Faculty Excellence Program
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Live aggregate across all faculty and subjects.
            </p>
          </div>
        </div>
        <StatTile
          label="Analyses"
          value={aggQ.data?.totalAnalyses ?? 0}
          sub="by Gradi AI"
        />
        <StatTile
          label="Manager Ratings"
          value={aggQ.data?.totalRatings ?? 0}
          sub="submitted"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        {/* Left: leaderboard */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search faculty..."
                className="w-full rounded-full border border-border bg-bg-elev/60 pl-9 pr-3 py-2 text-sm outline-none focus:border-fg/30"
              />
            </div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-full border border-border bg-bg-elev/60 px-3 py-2 text-xs outline-none focus:border-fg/30"
            >
              <option value="all">All subjects</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {aggQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl shimmer border border-border"
                />
              ))}
            </div>
          ) : (
            <Leaderboard
              rows={filteredLeaders}
              onSelect={(id) => {
                setSelectedFaculty(id);
                setActiveSubjectTab("all");
              }}
              selectedId={selectedFaculty}
            />
          )}
        </div>

        {/* Right: detail or aggregate radars */}
        <div>
          {selectedFaculty && selectedFacultyRow ? (
            <motion.div
              key={selectedFaculty}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div className="glass-strong rounded-2xl p-5 flex items-center gap-5">
                <ScoreRing
                  score={facultyQ.data?.avgGradiScore ?? 0}
                  size={88}
                  stroke={6}
                  label="GRADI AVG"
                />
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-fg-muted">
                    Faculty Detail
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {selectedFacultyRow.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-fg-muted">
                    <span>{selectedFacultyRow.email}</span>
                    <span className="text-fg-dim">·</span>
                    <span>
                      {selectedFacultyRow.subjects
                        .map((s) => subjectsByName[s] ?? s)
                        .join(", ")}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-mono text-2xl font-semibold">
                    {facultyQ.data?.totalVideos ?? 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-muted">
                    videos
                  </div>
                </div>
              </div>

              <div className="border-b border-border pb-2">
                <SubjectTabs
                  subjects={facultySubjectTabs}
                  active={activeSubjectTab}
                  onChange={setActiveSubjectTab}
                />
              </div>

              {facultyQ.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[4/3] rounded-xl shimmer border border-border"
                    />
                  ))}
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-bg-elev/30 py-12 text-center text-sm text-fg-muted">
                  No videos uploaded for this subject yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredVideos.map((v, i) => (
                    <VideoCard
                      key={v.videoId}
                      video={v}
                      index={i}
                      onClick={() => setOpenVideoId(v.videoId)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-dashed border-border bg-bg-elev/30 py-8 text-center">
                <p className="text-sm font-medium text-fg/85">
                  Select a faculty to drill in
                </p>
                <p className="mt-1 text-[11px] text-fg-muted">
                  Or browse aggregate parameter performance below.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(aggQ.data?.subjectAgg ?? {}).map(([sid, v]) => (
                  <SubjectRadar
                    key={sid}
                    title={subjectsByName[sid] ?? sid}
                    data={buildRadarData(v.sums, v.n)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>

      <VideoDrawer
        videoId={openVideoId}
        onClose={() => setOpenVideoId(null)}
        managerMode
        managerId={meQ.data?.user?.userId}
        onRated={() => {
          aggQ.refetch();
          if (selectedFaculty) facultyQ.refetch();
        }}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass rounded-2xl p-5"
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        {label}
      </p>
      <p className="mt-2 text-mono text-3xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-fg-dim">{sub}</p>
    </motion.div>
  );
}
