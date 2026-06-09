"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Inbox, Sparkles } from "lucide-react";
import { HeroStats } from "@/components/HeroStats";
import { SubjectTabs } from "@/components/SubjectTabs";
import { VideoCard } from "@/components/VideoCard";
import { VideoDrawer } from "@/components/VideoDrawer";
import { VideoUploader } from "@/components/VideoUploader";
import type { Subject, Video, GradiAnalysis, JWTPayload } from "@/types";

interface FacultyStats {
  facultyId: string;
  totalVideos: number;
  avgGradiScore: number;
  pctRatedByManager: number;
  bySubject: Record<string, { count: number; avgScore: number; videos: Video[] }>;
  videos: (Video & { analysis?: GradiAnalysis | null })[];
}

export default function FacultyDashboard() {
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);

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

  const statsQ = useQuery({
    queryKey: ["faculty-stats"],
    queryFn: async (): Promise<FacultyStats> =>
      (await fetch("/api/stats")).json(),
    refetchInterval: 6000,
  });

  const subjects = subjectsQ.data?.subjects ?? [];
  const stats = statsQ.data;
  const user = meQ.data?.user;

  const filteredVideos = useMemo(() => {
    if (!stats?.videos) return [];
    if (activeSubject === "all") return stats.videos;
    return stats.videos.filter((v) => v.subjectId === activeSubject);
  }, [stats, activeSubject]);

  const subjectTabs = useMemo(() => {
    const tabs = [
      { id: "all", label: "All", count: stats?.totalVideos ?? 0 },
    ];
    for (const s of subjects) {
      const c = stats?.bySubject?.[s.subjectId]?.count;
      if (c)
        tabs.push({ id: s.subjectId, label: s.name, count: c });
    }
    return tabs;
  }, [subjects, stats]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elev/50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
          <Sparkles className="h-3 w-3" />
          Faculty Workspace
        </div>
        <VideoUploader
          subjects={subjects}
          onSuccess={() => statsQ.refetch()}
        />
      </motion.div>

      {user && (
        <HeroStats
          name={user.name}
          avgScore={stats?.avgGradiScore ?? 0}
          totalVideos={stats?.totalVideos ?? 0}
          pctRated={stats?.pctRatedByManager ?? 0}
          trendDelta={0}
        />
      )}

      <div className="mt-8">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-2">
          <SubjectTabs
            subjects={subjectTabs}
            active={activeSubject}
            onChange={setActiveSubject}
          />
        </div>

        {statsQ.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl shimmer border border-border"
              />
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>

      <VideoDrawer
        videoId={openVideoId}
        onClose={() => setOpenVideoId(null)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-elev/30 py-16 text-center"
    >
      <Inbox className="h-8 w-8 text-fg-dim mb-3" />
      <h3 className="text-base font-medium text-fg">No videos yet</h3>
      <p className="text-sm text-fg-muted mt-1 max-w-xs">
        Upload your first YouTube video to get an instant Gradi AI analysis.
      </p>
    </motion.div>
  );
}
