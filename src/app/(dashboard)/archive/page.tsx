"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Users, TrendingDown, Trophy, AlertCircle,
  Video, GraduationCap, Sparkles, Save, Loader2, Plus,
  CheckCircle, Edit3, BarChart3,
} from "lucide-react";
import type { ProgramArchive } from "@/types/archive";
import type { JWTPayload, Subject } from "@/types";
import { WeekSummarySection } from "@/components/archive/WeekSummarySection";
import { DropOffsSection } from "@/components/archive/DropOffsSection";
import { LeaderboardSection } from "@/components/archive/LeaderboardSection";
import { ScoreboardSection } from "@/components/archive/ScoreboardSection";
import { BestContentSection } from "@/components/archive/BestContentSection";
import { VideoLogSection } from "@/components/archive/VideoLogSection";
import { TrainingSessionsSection } from "@/components/archive/TrainingSessionsSection";
import { ProgramAnalytics } from "@/components/ProgramAnalytics";
import { cn } from "@/lib/utils";

type TabId = "summary" | "leaderboard" | "scoreboard" | "content" | "videolog" | "training" | "dropoffs" | "analytics";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "summary",     label: "Week Summary",    icon: Calendar },
  { id: "analytics",   label: "Analytics",        icon: BarChart3 },
  { id: "leaderboard", label: "Leaderboard",      icon: Trophy },
  { id: "scoreboard",  label: "Scoreboard",       icon: TrendingDown },
  { id: "content",     label: "Best Content",     icon: Sparkles },
  { id: "videolog",    label: "Video Log",        icon: Video },
  { id: "training",    label: "Training",         icon: GraduationCap },
  { id: "dropoffs",    label: "Drop-offs",        icon: AlertCircle },
];

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [editMode, setEditMode] = useState(false);
  const [saveMsg, setSaveMsg] = useState<"saved" | null>(null);
  const qc = useQueryClient();

  const meQ = useQuery<{ user: JWTPayload | null }>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then(r => r.json()),
  });
  const isManager = meQ.data?.user?.role === "fep_manager";

  const archiveQ = useQuery<{ archive: ProgramArchive; source: string }>({
    queryKey: ["archive"],
    queryFn: () => fetch("/api/archive").then(r => r.json()),
  });

  const subjectsQ = useQuery<{ subjects: Subject[] }>({
    queryKey: ["subjects"],
    queryFn: () => fetch("/api/subjects").then(r => r.json()),
  });
  const subjects = subjectsQ.data?.subjects ?? [];

  const saveMut = useMutation({
    mutationFn: (archive: ProgramArchive) =>
      fetch("/api/archive", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archive"] });
      setSaveMsg("saved");
      setTimeout(() => setSaveMsg(null), 3000);
    },
  });

  const archive = archiveQ.data?.archive;

  const updateArchive = useCallback(
    (patch: Partial<ProgramArchive>) => {
      if (!archive) return;
      const updated = { ...archive, ...patch };
      saveMut.mutate(updated);
    },
    [archive, saveMut]
  );

  if (archiveQ.isLoading || !archive) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  const totalContent = Object.values(archive.bestContent).reduce((a, b) => a + b.length, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 md:py-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-5 md:p-7 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-fg-muted">Program Archive</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">
              Faculty Excellence Program &middot; Phase {archive.weekSummary.phase}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {archive.weekSummary.program} &middot; Batch {archive.weekSummary.batch}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <HeroStat icon={Users} label="Trainees" value={archive.weekSummary.totalTrainees} />
            <HeroStat icon={Video} label="Videos" value={archive.videoLog.length} />
            <HeroStat icon={GraduationCap} label="Sessions" value={archive.trainingSessions.length} />
            {isManager && (
              <button
                onClick={() => setEditMode(e => !e)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                  editMode
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    : "border-border bg-bg-elev/50 text-fg-muted hover:border-border-strong hover:text-fg"
                )}
              >
                <Edit3 className="h-3.5 w-3.5" />
                {editMode ? "Editing" : "Edit"}
              </button>
            )}
            {isManager && editMode && (
              <button
                onClick={() => archive && saveMut.mutate(archive)}
                disabled={saveMut.isPending}
                className="flex items-center gap-2 rounded-full bg-fg px-3 py-2 text-xs font-medium text-bg transition-colors hover:bg-fg/90 disabled:opacity-50"
              >
                {saveMut.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : saveMsg === "saved"
                    ? <CheckCircle className="h-3.5 w-3.5" />
                    : <Save className="h-3.5 w-3.5" />}
                {saveMsg === "saved" ? "Saved" : "Save"}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          const count = t.id === "scoreboard" ? archive.scoreboard.length
            : t.id === "content" ? totalContent
              : t.id === "videolog" ? archive.videoLog.length
                : t.id === "training" ? archive.trainingSessions.length
                  : t.id === "dropoffs" ? archive.dropOffs.length
                    : undefined;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn(
                "relative flex flex-shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                isActive ? "text-fg" : "text-fg-muted hover:text-fg/80"
              )}>
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {count != null && (
                <span className={cn("rounded-full px-1.5 py-px text-[10px] text-mono",
                  isActive ? "bg-fg/10 text-fg" : "bg-bg-elev text-fg-muted")}>
                  {count}
                </span>
              )}
              {isActive && (
                <motion.div layoutId="archive-tab"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-fg"
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          {activeTab === "summary" && (
            <WeekSummarySection
              summary={archive.weekSummary}
              dropOffs={archive.dropOffs}
              editMode={editMode && isManager}
              onUpdate={patch => updateArchive({ weekSummary: { ...archive.weekSummary, ...patch } })}
              onUpdateDropOffs={dropOffs => updateArchive({ dropOffs })}
            />
          )}
          {activeTab === "analytics" && (
            <ProgramAnalytics subjects={subjects} />
          )}
          {activeTab === "leaderboard" && (
            <LeaderboardSection
              top={archive.topPerformers}
              bottom={archive.bottomPerformers}
              weekHeaders={archive.weekSummary.weekHeaders}
              editMode={editMode && isManager}
              onUpdate={(top, bottom) => updateArchive({ topPerformers: top, bottomPerformers: bottom })}
            />
          )}
          {activeTab === "scoreboard" && (
            <ScoreboardSection
              rows={archive.scoreboard}
              weekHeaders={archive.weekSummary.weekHeaders}
              editMode={editMode && isManager}
              onUpdate={rows => updateArchive({ scoreboard: rows })}
            />
          )}
          {activeTab === "content" && (
            <BestContentSection
              content={archive.bestContent}
              editMode={editMode && isManager}
              onUpdate={content => updateArchive({ bestContent: content })}
            />
          )}
          {activeTab === "videolog" && (
            <VideoLogSection
              rows={archive.videoLog}
              editMode={editMode && isManager}
              onUpdate={rows => updateArchive({ videoLog: rows })}
            />
          )}
          {activeTab === "training" && (
            <TrainingSessionsSection
              rows={archive.trainingSessions}
              editMode={editMode && isManager}
              onUpdate={rows => updateArchive({ trainingSessions: rows })}
            />
          )}
          {activeTab === "dropoffs" && (
            <DropOffsSection
              rows={archive.dropOffs}
              editMode={editMode && isManager}
              onUpdate={rows => updateArchive({ dropOffs: rows })}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev/50 px-4 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-fg-muted flex items-center gap-1">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="text-mono text-xl font-semibold tracking-tight mt-0.5">{value}</div>
    </div>
  );
}

export { Plus };
