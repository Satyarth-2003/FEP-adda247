"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Sparkles, LayoutGrid, BarChart3, Loader2, Play, Link as LinkIcon } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";
import { VideoDrawer } from "@/components/VideoDrawer";
import { SubjectTabs } from "@/components/SubjectTabs";
import { SubjectRadar, buildRadarData } from "@/components/SubjectRadar";
import { ScoreRing } from "@/components/ScoreRing";
import { ProgramAnalytics } from "@/components/ProgramAnalytics";
import { VideoUploader } from "@/components/VideoUploader";
import { cn, extractYouTubeId } from "@/lib/utils";
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
  const [view, setView] = useState<"roster" | "analytics" | "cohorts">("roster");
  const [selectedCohort, setSelectedCohort] = useState<string>("June FEP");

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
      aggQ.data?.leaderboard?.find((r) => r.userId === selectedFaculty) ?? null,
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
                { id: "cohorts" as const, label: "Cohorts", icon: Users },
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
        <div className="flex items-center gap-3">
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
          <VideoUploader
            subjects={subjects}
            onSuccess={() => { aggQ.refetch(); }}
            managerMode
            facultyList={(aggQ.data?.leaderboard ?? []).map(f => ({ userId: f.userId, name: f.name }))}
          />
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
        ) : view === "cohorts" ? (
          <motion.div
            key="cohorts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <CohortView selectedCohort={selectedCohort} onCohortChange={setSelectedCohort} />
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
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-fg-muted">
              Cohort Performance
            </p>
            <h1 className="mt-1 text-xl md:text-2xl font-semibold tracking-tight">
              Adda247 EduSkill Program
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
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl shimmer border border-border" />
                  ))}
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-bg-elev/30 py-12 text-center text-sm text-fg-muted">
                  No videos uploaded for this subject yet.
                </div>
              ) : (
                <VideoTable videos={filteredVideos} onSelect={(id) => setOpenVideoId(id)} />
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

interface YTStats {
  views: number;
  likes: number;
  comments: number;
  duration: string;
  publishedAt: string;
}

function VideoTable({ videos, onSelect }: { videos: (Video & { analysis?: GradiAnalysis | null })[]; onSelect: (id: string) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, YTStats | null>>({});
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});

  async function fetchStats(videoId: string) {
    if (stats[videoId] !== undefined) return;
    setLoadingStats(prev => ({ ...prev, [videoId]: true }));
    try {
      const res = await fetch(`/api/videos/${videoId}/youtube-stats`);
      const data = await res.json();
      setStats(prev => ({ ...prev, [videoId]: data }));
    } catch {
      setStats(prev => ({ ...prev, [videoId]: null }));
    } finally {
      setLoadingStats(prev => ({ ...prev, [videoId]: false }));
    }
  }

  function toggleExpand(videoId: string) {
    if (expandedId === videoId) {
      setExpandedId(null);
    } else {
      setExpandedId(videoId);
      fetchStats(videoId);
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[44px_1fr_70px_70px_70px_70px_60px] gap-2 px-4 py-2.5 bg-bg-elev/50 border-b border-border text-[10px] uppercase tracking-[0.15em] text-fg-muted font-medium">
        <span></span>
        <span>Title</span>
        <span className="text-center">Gradi /25</span>
        <span className="text-center">Manager</span>
        <span className="text-center">Status</span>
        <span className="text-center">Stats</span>
        <span className="text-center">Rate</span>
      </div>

      {/* Rows */}
      {videos.map((v) => {
        const gradiScore = v.analysis?.gradiScore ?? 0;
        const isExpanded = expandedId === v.videoId;
        const vStats = stats[v.videoId];
        const isLoadingRow = loadingStats[v.videoId];
        const thumbUrl = v.thumbnailUrl || (v.youtubeUrl ? `https://img.youtube.com/vi/${extractYouTubeId(v.youtubeUrl)}/default.jpg` : null);

        return (
          <div key={v.videoId}>
            <div
              className="grid grid-cols-[44px_1fr_70px_70px_70px_70px_60px] gap-2 px-4 py-2.5 border-b border-border hover:bg-bg-elev/30 transition-colors items-center"
            >
              {/* Thumbnail */}
              <div className="w-10 h-7 rounded overflow-hidden bg-bg-elev flex-shrink-0">
                {thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-fg-dim">
                    <Play className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="min-w-0 cursor-pointer" onClick={() => toggleExpand(v.videoId)}>
                <p className="text-sm font-medium text-fg truncate">{v.title}</p>
                <p className="text-[10px] text-fg-muted mt-0.5">{v.subject} · {new Date(v.uploadedAt).toLocaleDateString()}</p>
              </div>

              {/* Gradi score /25 */}
              <div className="text-center">
                {gradiScore > 0 ? (
                  <span className="text-mono text-sm font-semibold" style={{ color: gradiScore >= 4 ? "var(--emerald)" : gradiScore >= 3 ? "var(--amber)" : "var(--fg-muted)" }}>
                    {(gradiScore * 5).toFixed(1)}<span className="text-[9px] text-fg-dim font-normal">/25</span>
                  </span>
                ) : <span className="text-[10px] text-fg-dim">—</span>}
              </div>

              {/* Manager */}
              <div className="text-center">
                {v.status === "manager_rated" ? (
                  <span className="text-mono text-sm font-semibold" style={{ color: "var(--emerald)" }}>✓</span>
                ) : <span className="text-[10px] text-fg-dim">pending</span>}
              </div>

              {/* Status */}
              <div className="text-center">
                <span className={cn(
                  "inline-block px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-medium",
                  v.status === "manager_rated" ? "bg-emerald-500/10 text-emerald-400" :
                  v.status === "gradi_done" ? "bg-blue-500/10 text-blue-400" :
                  v.status === "analyzing" ? "bg-amber-500/10 text-amber-400" :
                  "bg-fg/5 text-fg-muted"
                )}>
                  {v.status === "manager_rated" ? "done" : v.status === "gradi_done" ? "gradi" : v.status}
                </span>
              </div>

              {/* Stats toggle */}
              <div className="text-center">
                <button
                  onClick={() => toggleExpand(v.videoId)}
                  className={cn(
                    "text-[10px] font-medium px-2 py-1 rounded-full border transition-colors",
                    isExpanded ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-border text-fg-muted hover:text-fg hover:border-border-strong"
                  )}
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
              </div>

              {/* Rate button */}
              <div className="text-center">
                <button
                  onClick={() => onSelect(v.videoId)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-fg text-bg hover:opacity-80 transition-opacity"
                >
                  Rate
                </button>
              </div>
            </div>

            {/* Expandable analytics row */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden border-b border-border bg-bg-elev/20"
                >
                  <div className="px-4 py-4">
                    {isLoadingRow ? (
                      <div className="flex items-center gap-2 text-xs text-fg-muted">
                        <Loader2 className="h-3 w-3 animate-spin" /> Fetching YouTube analytics...
                      </div>
                    ) : vStats ? (
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-fg-muted font-medium">YouTube Analytics</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="rounded-lg border border-border bg-bg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-fg-muted">Views</p>
                            <p className="text-mono text-xl font-bold text-fg mt-1">{vStats.views.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-bg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-fg-muted">Likes</p>
                            <p className="text-mono text-xl font-bold text-fg mt-1">{vStats.likes.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-bg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-fg-muted">Comments</p>
                            <p className="text-mono text-xl font-bold text-fg mt-1">{vStats.comments.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-bg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-fg-muted">Duration</p>
                            <p className="text-mono text-xl font-bold text-fg mt-1">{vStats.duration || "—"}</p>
                          </div>
                        </div>
                        {vStats.publishedAt && (
                          <p className="text-[10px] text-fg-dim">Published: {new Date(vStats.publishedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-fg-muted">Failed to load analytics</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function CohortView({ selectedCohort, onCohortChange }: { selectedCohort: string; onCohortChange: (c: string) => void }) {
  const cohortQ = useQuery({
    queryKey: ["cohorts", selectedCohort],
    queryFn: async () => {
      const res = await fetch(`/api/cohorts?cohort=${encodeURIComponent(selectedCohort)}`);
      return res.json() as Promise<{ cohorts: string[]; faculty: { userId: string; name: string; email: string; cohort: string; adjustToken: string | null; trackingLink: string | null }[]; total: number }>;
    },
  });

  const cohorts = cohortQ.data?.cohorts ?? ["March FEP", "June FEP"];
  const faculty = cohortQ.data?.faculty ?? [];

  return (
    <div className="space-y-5">
      {/* Cohort selector */}
      <div className="flex items-center gap-2">
        {cohorts.map(c => (
          <button key={c} onClick={() => onCohortChange(c)}
            className={cn(
              "relative px-4 py-2 rounded-full text-xs font-medium transition-colors",
              selectedCohort === c ? "text-white" : "text-fg-muted hover:text-fg border border-border"
            )}>
            {selectedCohort === c && <motion.span layoutId="cohort-pill" className="absolute inset-0 rounded-full bg-emerald-600 -z-10" transition={{ duration: 0.2 }} />}
            {c}
          </button>
        ))}
      </div>

      {/* Faculty list with tracking links */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_200px_120px_100px] gap-2 px-5 py-3 border-b border-border text-[10px] uppercase tracking-[0.15em] text-fg-muted font-medium">
          <span>#</span>
          <span>Faculty</span>
          <span>Email</span>
          <span className="text-center">Adjust Token</span>
          <span className="text-center">Tracking Link</span>
        </div>

        {cohortQ.isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-fg-muted" /></div>
        ) : faculty.length === 0 ? (
          <div className="py-8 text-center text-sm text-fg-muted">No faculty in this cohort</div>
        ) : (
          faculty.map((f, i) => (
            <div key={f.userId} className="grid grid-cols-[40px_1fr_200px_120px_100px] gap-2 px-5 py-3 border-b border-border/50 hover:bg-bg-elev/30 transition-colors items-center">
              <span className="text-xs text-fg-muted text-mono">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg truncate">{f.name}</p>
              </div>
              <span className="text-xs text-fg-muted truncate">{f.email}</span>
              <div className="text-center">
                {f.adjustToken ? (
                  <span className="text-mono text-[11px] px-2 py-0.5 rounded bg-bg-elev border border-border text-fg-muted">{f.adjustToken}</span>
                ) : <span className="text-[10px] text-fg-dim">—</span>}
              </div>
              <div className="text-center">
                {f.trackingLink ? (
                  <a href={f.trackingLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors">
                    <LinkIcon className="h-3 w-3" /> Link
                  </a>
                ) : <span className="text-[10px] text-fg-dim">—</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[10px] text-fg-dim">
        {faculty.length} faculty in {selectedCohort} · Tracking via Adjust
      </p>
    </div>
  );
}
