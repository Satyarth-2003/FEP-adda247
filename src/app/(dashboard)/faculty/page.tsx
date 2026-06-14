"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Sparkles, Loader2 } from "lucide-react";
import { HeroStats } from "@/components/HeroStats";
import { SubjectTabs } from "@/components/SubjectTabs";
import { VideoCard } from "@/components/VideoCard";
import { VideoDrawer } from "@/components/VideoDrawer";
import { VideoUploader } from "@/components/VideoUploader";
import type { Subject, Video, GradiAnalysis, JWTPayload } from "@/types";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface FacultyStats {
  facultyId: string;
  facultyName?: string;
  totalVideos: number;
  avgGradiScore: number;
  pctRatedByManager: number;
  age?: number;
  dob?: string;
  subjects?: string[];
  avatarUrl?: string;
  bySubject: Record<string, { count: number; avgScore: number; videos: Video[] }>;
  videos: (Video & { analysis?: GradiAnalysis | null })[];
}

export default function FacultyDashboard() {
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const facultyId = searchParams ? searchParams.get("facultyId") : null;

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editAvatar, setEditAvatar] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

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
    queryKey: ["faculty-stats", facultyId],
    queryFn: async (): Promise<FacultyStats> =>
      (await fetch(`/api/stats${facultyId ? `?facultyId=${facultyId}` : ""}`)).json(),
    refetchInterval: 6000,
  });

  const subjects = subjectsQ.data?.subjects ?? [];
  const stats = statsQ.data;
  const user = meQ.data?.user;

  useEffect(() => {
    if (stats) {
      setEditName(stats.facultyName || "");
      setEditAge(stats.age ? String(stats.age) : "");
      setEditDob(stats.dob || "");
      setEditSubjects(stats.subjects || []);
      setEditAvatar(stats.avatarUrl || "");
    }
  }, [stats]);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: stats?.facultyId || user?.userId,
          name: editName,
          age: editAge ? Number(editAge) : undefined,
          dob: editDob || undefined,
          subjects: editSubjects,
          avatarUrl: editAvatar || undefined,
        }),
      });
      if (res.ok) {
        statsQ.refetch();
        setIsEditingProfile(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }


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

  const isOwnProfile = user?.role === "fep_faculty" && (!facultyId || facultyId === user?.userId);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elev/50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
          <Sparkles className="h-3 w-3" />
          {isOwnProfile ? "Faculty Workspace" : "Faculty Profile View"}
        </div>
        {isOwnProfile && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditingProfile(p => !p)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors cursor-pointer",
                isEditingProfile
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                  : "border-border bg-bg-elev/50 text-fg hover:border-border-strong"
              )}
            >
              ⚙️ {isEditingProfile ? "Done Editing" : "Edit Profile"}
            </button>
            <VideoUploader
              subjects={subjects}
              onSuccess={() => statsQ.refetch()}
            />
          </div>
        )}
      </motion.div>

      {user && (
        <HeroStats
          name={stats?.facultyName || user.name}
          avgScore={stats?.avgGradiScore ?? 0}
          totalVideos={stats?.totalVideos ?? 0}
          pctRated={stats?.pctRatedByManager ?? 0}
          trendDelta={0}
        />
      )}

      <AnimatePresence>
        {isEditingProfile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden mt-6"
          >
            <div className="glass-strong rounded-2xl p-5 md:p-6 space-y-6 border border-border">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-sm font-semibold tracking-tight">Manage Profile Details</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="rounded-full border border-border bg-bg-elev/50 px-3 py-1.5 text-xs font-medium text-fg hover:border-border-strong cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="rounded-full bg-fg px-4 py-1.5 text-xs font-medium text-bg hover:bg-fg/90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {savingProfile && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save Details
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-6 items-start">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-24 w-24 rounded-full border border-border overflow-hidden bg-bg-elev flex items-center justify-center">
                    {editAvatar ? (
                      <img src={editAvatar} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl text-fg-dim">📷</span>
                    )}
                  </div>
                  <label className="cursor-pointer rounded-full border border-border bg-bg-elev px-3 py-1 text-[11px] font-medium text-fg hover:border-border-strong text-center">
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-fg-muted uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-bg-elev/40 px-3 py-2 text-sm outline-none focus:border-fg/30"
                      placeholder="Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-fg-muted uppercase tracking-wider">Age</label>
                    <input
                      type="number"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      className="w-full rounded-lg border border-border bg-bg-elev/40 px-3 py-2 text-sm outline-none focus:border-fg/30"
                      placeholder="Age"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-fg-muted uppercase tracking-wider">Date of Birth (DOB)</label>
                    <input
                      type="date"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      className="w-full rounded-lg border border-border bg-bg-elev/40 px-3 py-2 text-sm outline-none focus:border-fg/30"
                    />
                  </div>

                  {/* Customizable Subjects */}
                  <div className="sm:col-span-3 space-y-2">
                    <label className="text-[11px] font-medium text-fg-muted uppercase tracking-wider block">Custom Subjects Selection</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 rounded-xl border border-border bg-bg-elev/20 p-3 max-h-[160px] overflow-y-auto">
                      {subjects.map((s) => {
                        const isChecked = editSubjects.includes(s.subjectId);
                        return (
                          <label key={s.subjectId} className="flex items-center gap-2 text-xs text-fg-muted hover:text-fg cursor-pointer p-1 rounded hover:bg-bg-elev/40">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setEditSubjects(editSubjects.filter((x) => x !== s.subjectId));
                                } else {
                                  setEditSubjects([...editSubjects, s.subjectId]);
                                }
                              }}
                              className="rounded border-border text-fg bg-bg-elev"
                            />
                            <span className="truncate">{s.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


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
