"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, Save, Play, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { GradiAnalysis, ManagerRating, ManagerParamKey, Video } from "@/types";
import { MANAGER_PARAMS, GRADI_PARAMS } from "@/types";
import { ScoreRing } from "./ScoreRing";
import { Portal } from "./Portal";
import { scoreColor, extractYouTubeId } from "@/lib/utils";

interface VideoDrawerProps {
  videoId: string | null;
  onClose: () => void;
  managerMode?: boolean;
  managerId?: string;
  onRated?: () => void;
}

interface DrawerData {
  video: Video;
  analysis: GradiAnalysis | null;
  managerRatings: ManagerRating[];
}

const EMPTY: Record<ManagerParamKey, number> = {
  boardWork: 0, visualTLM: 0, energy: 0, delivery: 0, hook: 0,
};

export function VideoDrawer({ videoId, onClose, managerMode, managerId, onRated }: VideoDrawerProps) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState<Record<ManagerParamKey, number>>(EMPTY);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);

  useEffect(() => {
    if (!videoId) { setData(null); setShowPreview(false); return; }
    setLoading(true);
    setData(null);
    setShowPreview(false);
    setRatings(EMPTY);
    setSavedAt(null);
    fetch(`/api/videos/${videoId}`)
      .then(r => r.json())
      .then((d: DrawerData) => {
        setData(d);
        if (managerMode && managerId) {
          const own = d.managerRatings?.find((r: ManagerRating) => r.managerId === managerId);
          if (own) {
            setRatings({ boardWork: own.boardWork, visualTLM: own.visualTLM, energy: own.energy, delivery: own.delivery, hook: own.hook });
            setNotes(own.notes ?? "");
          }
        }
      })
      .finally(() => setLoading(false));
  }, [videoId, managerMode, managerId]);


  function handleRating(key: ManagerParamKey, val: number) {
    const next = { ...ratings, [key]: val };
    setRatings(next);
  }

  function handleNotes(val: string) {
    setNotes(val);
  }

  async function saveRating() {
    if (!videoId) return;
    setSaving(true);
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, ...ratings, notes }),
      });
      setSavedAt(Date.now());
      onRated?.();
    } finally {
      setSaving(false);
    }
  }

  const managerTotal = ratings.boardWork + ratings.visualTLM + ratings.energy + ratings.delivery + ratings.hook;
  const gradiContrib = data?.analysis ? Math.round(data.analysis.gradiScore * 5 * 10) / 10 : 0;
  const combinedTotal = Number((managerTotal + gradiContrib).toFixed(1));
  const ytId = data?.video ? extractYouTubeId(data.video.youtubeUrl) : null;
  const displayedRating = managerMode
    ? { boardWork: ratings.boardWork, visualTLM: ratings.visualTLM, energy: ratings.energy, delivery: ratings.delivery, hook: ratings.hook, total: managerTotal }
    : (data?.managerRatings?.[0] ?? null);

  return (
    <Portal>
      <AnimatePresence>
        {videoId && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ position: "fixed", inset: 0, zIndex: 9999 }}
            onClick={onClose}
          >
            <div style={{ position: "absolute", inset: 0, background: "var(--backdrop)", backdropFilter: "blur(4px)" }} />
            <motion.div
              key="panel"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: "absolute", top: 0, right: 0, bottom: 0,
                width: "min(640px, 100vw)",
                background: "var(--bg-elev)",
                borderLeft: "1px solid var(--border)",
                boxShadow: "-20px 0 60px rgba(0,0,0,0.25)",
                overflowY: "auto",
              }}
            >
              {loading || !data || !data.video ? (
                <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
                  ) : (
                    <div>
                      <p className="text-sm text-fg/85 mb-2">Video not found</p>
                      <p className="text-[11px] text-fg-muted">It may have been removed.</p>
                      <button
                        onClick={onClose}
                        className="mt-4 rounded-full border border-border bg-bg-elev px-4 py-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 md:p-7 space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted">
                          {data.video.subject}
                        </span>
                        {data.video.facultyName && (
                          <span className="text-[11px] text-fg-muted">by {data.video.facultyName}</span>
                        )}
                      </div>
                      <h2 className="text-lg md:text-xl font-semibold tracking-tight leading-snug">
                        {data.video.title}
                      </h2>
                      <a href={data.video.youtubeUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg">
                        <ExternalLink className="h-3 w-3" />Watch on YouTube
                      </a>
                    </div>
                    <button onClick={onClose}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-border text-fg-muted hover:bg-bg hover:text-fg">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Video preview toggle */}
                  {ytId && (
                    <div>
                      <button onClick={() => setShowPreview(p => !p)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg py-2.5 text-xs font-medium text-fg-muted hover:border-border-strong hover:text-fg transition-colors">
                        <Play className="h-3.5 w-3.5" />
                        {showPreview ? "Hide preview" : "Preview video"}
                      </button>
                      <AnimatePresence>
                        {showPreview && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                            className="overflow-hidden mt-2">
                            <iframe
                              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                              title={data.video.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full aspect-video rounded-xl border border-border"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Thumbnail fallback */}
                  {!showPreview && data.video.thumbnailUrl && !ytId && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.video.thumbnailUrl} alt={data.video.title}
                      className="w-full aspect-video rounded-xl border border-border object-cover" />
                  )}

                  {/* Combined score hero */}
                  {(data.analysis !== null || managerTotal > 0) && (
                    <div className="rounded-xl border border-border bg-bg p-4">
                      <div className="flex items-center gap-5">
                        <ScoreRing score={combinedTotal} max={50} size={96} stroke={7} label="/ 50" />
                        <div className="flex-1 space-y-2.5">
                          <ScoreBar label="Manager" value={managerTotal} max={25} color={scoreColor(managerTotal / 5)} />
                          <ScoreBar label="Gradi AI" value={gradiContrib} max={25} color={scoreColor(data.analysis?.gradiScore ?? 0)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gradi analysis */}
                  {data.analysis && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-bg p-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-muted mb-1.5">Gradi one-liner</p>
                        <p className="text-sm text-fg leading-relaxed">
                          {data.analysis.oneLiner || data.analysis.scoreReason}
                        </p>
                        {data.analysis.summary && (
                          <>
                            <AnimatePresence>
                              {showFullSummary && (
                                <motion.p
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-2 text-xs text-fg-muted leading-relaxed overflow-hidden"
                                >
                                  {data.analysis.summary}
                                </motion.p>
                              )}
                            </AnimatePresence>
                            <button
                              onClick={() => setShowFullSummary(p => !p)}
                              className="mt-2 flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg transition-colors"
                            >
                              {showFullSummary
                                ? <ChevronUp className="h-3 w-3" />
                                : <ChevronDown className="h-3 w-3" />}
                              {showFullSummary ? "Hide summary" : "Read full summary"}
                            </button>
                          </>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-muted mb-3">Gradi parameters</p>
                        <div className="space-y-2.5">
                          {GRADI_PARAMS.map((p, i) => {
                            const v = (data.analysis as unknown as Record<string, unknown>)[p.key] as number;
                            return <MiniParamBar key={p.key} label={p.label} value={v} delay={i * 0.04} />;
                          })}
                        </div>
                      </div>
                      {(data.analysis.positives?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-500 mb-2">Strengths</p>
                          <ul className="space-y-1.5">
                            {data.analysis.positives.map((p, i) => (
                              <li key={i} className="flex gap-2 text-sm text-fg/85 leading-snug">
                                <span className="shrink-0 text-emerald-500 mt-0.5">+</span><span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(data.analysis.improvements?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-500 mb-2">Improvements</p>
                          <ul className="space-y-1.5">
                            {data.analysis.improvements.map((p, i) => (
                              <li key={i} className="flex gap-2 text-sm text-fg/85 leading-snug">
                                <span className="shrink-0 text-amber-500 mt-0.5">&#x2192;</span><span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manager scoring panel */}
                  {managerMode && (
                    <div className="rounded-xl border border-border bg-bg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold">Your Score</h3>
                          <p className="text-[11px] text-fg-muted mt-0.5">
                            Each param 1&#x2013;5 &#xB7; Total = {managerTotal}/25
                          </p>
                        </div>
                        <AnimatePresence mode="wait">
                          {saving && (
                            <motion.span key="sv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                              <Loader2 className="h-3 w-3 animate-spin" />Saving
                            </motion.span>
                          )}
                          {!saving && savedAt && (
                            <motion.span key="sd" initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                              <Save className="h-3 w-3" />Saved
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="space-y-4">
                        {MANAGER_PARAMS.map(p => (
                          <ScoringSlider key={p.key} label={p.label} desc={p.desc} value={ratings[p.key]} onChange={v => handleRating(p.key, v)} />
                        ))}
                      </div>
                      <div className="mt-4">
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2">Notes</label>
                        <textarea value={notes} onChange={e => handleNotes(e.target.value)} rows={2} placeholder="Optional feedback..."
                          className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none focus:border-fg/30 resize-none" />
                      </div>
                      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                        <button
                          onClick={saveRating}
                          disabled={saving}
                          className="flex items-center gap-2 rounded-full bg-fg px-6 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-fg/90 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {saving ? "Saving..." : "Save Rating"}
                        </button>
                        {savedAt && (
                          <span className="text-xs text-emerald-500 font-medium">Rating saved successfully</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Faculty view: received manager rating */}
                  {!managerMode && displayedRating && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-muted mb-3">Manager Score</p>
                      <div className="rounded-xl border border-border bg-bg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">{data.managerRatings[0]?.managerName}</span>
                          <span className="text-mono text-lg font-semibold" style={{ color: scoreColor(displayedRating.total / 5) }}>
                            {displayedRating.total}/25
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {MANAGER_PARAMS.map(p => (
                            <MiniParamBar key={p.key} label={p.label} value={displayedRating[p.key]} delay={0} />
                          ))}
                        </div>
                        {data.managerRatings[0]?.notes && (
                          <p className="mt-3 text-xs text-fg-muted border-t border-border pt-3">
                            {data.managerRatings[0].notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No gradi yet */}
                  {!data.analysis && (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-fg-muted mx-auto mb-2" />
                      <p className="text-sm text-fg-muted">Gradi analysis in progress&#x2026;</p>
                      <p className="text-[11px] text-fg-dim mt-1">Usually ~30 seconds.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-fg-muted">{label}</span>
        <span className="text-mono font-semibold" style={{ color }}>{(value ?? 0).toFixed(1)}/{max}</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}60, ${color})`, boxShadow: `0 0 8px ${color}50` }}
        />
      </div>
    </div>
  );
}

function MiniParamBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[11px] text-fg-muted truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full" style={{ background: color }}
        />
      </div>
      <span className="w-7 text-right text-[11px] text-mono font-medium shrink-0" style={{ color }}>
        {typeof value === "number" ? value.toFixed(1) : "\u2014"}
      </span>
    </div>
  );
}

function ScoringSlider({ label, desc, value, onChange }: { label: string; desc: string; value: number; onChange: (v: number) => void }) {
  const color = scoreColor(value);
  const fillPct = ((value - 1) / 4) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{label}</span>
          <span style={{ fontSize: 11, color: "var(--fg-dim)", marginLeft: 8 }}>{desc}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color, minWidth: 44, textAlign: "right" }}>
          {(value ?? 1).toFixed(1)}
        </div>
      </div>
      <input
        type="range" min={1} max={5} step={0.5} value={value || 1}
        onChange={e => onChange(Number(e.target.value))}
        className="param-slider w-full"
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${fillPct}%, var(--slider-track) ${fillPct}%, var(--slider-track) 100%)` }}
      />
      <div className="flex justify-between mt-1 px-0.5">
        {[1,2,3,4,5].map(n => (
          <span key={n} style={{ fontSize: 10, color: (value ?? 1) >= n ? color : "var(--fg-dim)", fontFamily: "var(--font-mono)", transition: "color 0.2s" }}>{n}</span>
        ))}
      </div>
    </div>
  );
}
