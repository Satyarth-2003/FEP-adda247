"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Upload, X, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import type { Subject } from "@/types";
import { extractYouTubeId } from "@/lib/utils";
import { Portal } from "./Portal";

interface VideoUploaderProps {
  subjects: Subject[];
  onSuccess: () => void;
  managerMode?: boolean;
  facultyList?: { userId: string; name: string }[];
}

export function VideoUploader({ subjects, onSuccess, managerMode, facultyList }: VideoUploaderProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.subjectId ?? "");
  const [facultyId, setFacultyId] = useState(facultyList?.[0]?.userId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!extractYouTubeId(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    setLoading(true);
    try {
      const subj = subjects.find((s) => s.subjectId === subjectId);
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: url,
          subjectId,
          subject: subj?.name ?? subjectId,
          title,
          ...(managerMode && facultyId ? { facultyId } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      setOpen(false);
      setUrl("");
      setTitle("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-fg/90"
      >
        <Upload className="h-3.5 w-3.5" />
        Upload Video
      </motion.button>

      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 9999 }}
              onClick={() => !loading && setOpen(false)}
            >
              <div style={{ position: "absolute", inset: 0, background: "var(--backdrop)", backdropFilter: "blur(4px)" }} />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(448px, calc(100vw - 48px))", background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
              >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Upload Video
                  </h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    Paste a YouTube link — Gradi will analyze it automatically.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="rounded-full p-1.5 text-fg-muted hover:bg-bg-elev hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2">
                    YouTube URL
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full rounded-lg border border-border bg-bg-elev/60 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-fg/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Photosynthesis — Class 10"
                    className="w-full rounded-lg border border-border bg-bg-elev/60 px-3 py-2.5 text-sm outline-none focus:border-fg/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2">
                    Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-elev/60 px-3 py-2.5 text-sm outline-none focus:border-fg/30"
                  >
                    {subjects.map((s) => (
                      <option key={s.subjectId} value={s.subjectId}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {managerMode && facultyList && facultyList.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2">
                      Assign to Faculty
                    </label>
                    <select
                      value={facultyId}
                      onChange={(e) => setFacultyId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-bg-elev/60 px-3 py-2.5 text-sm outline-none focus:border-fg/30"
                    >
                      {facultyList.map((f) => (
                        <option key={f.userId} value={f.userId}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-fg px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-fg/90 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload &amp; Analyze
                    </>
                  )}
                </button>
              </form>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
