"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, Save, Play, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  boardWork: 1, visualTLM: 1, energy: 1, delivery: 1, hook: 1,
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!videoId) { setData(null); setShowPreview(false); setShowFullSummary(false); return; }
    setLoading(true); setData(null); setShowPreview(false); setShowFullSummary(false);
    setRatings({ ...EMPTY }); setNotes(""); setSavedAt(null);
    fetch(`/api/videos/${videoId}`)
      .then(r => r.json())
      .then((d: DrawerData) => {
        setData(d);
        if (managerMode && managerId) {
          const own = d.managerRatings?.find((r: ManagerRating) => r.managerId === managerId);
          if (own) {
            setRatings({ boardWork: Number(own.boardWork)||1, visualTLM: Number(own.visualTLM)||1, energy: Number(own.energy)||1, delivery: Number(own.delivery)||1, hook: Number(own.hook)||1 });
            setNotes(own.notes ?? "");
          }
        }
      })
      .finally(() => setLoading(false));
  }, [videoId, managerMode, managerId]);

  function autoSave(r: Record<ManagerParamKey, number>, n: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!videoId) return;
      setSaving(true);
      try {
        await fetch("/api/ratings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId, ...r, notes: n }) });
        setSavedAt(Date.now()); onRated?.();
      } finally { setSaving(false); }
    }, 600);
  }

  function handleRating(key: ManagerParamKey, val: number) {
    const next = { ...ratings, [key]: val }; setRatings(next);
    if (managerMode) autoSave(next, notes);
  }

  function handleNotes(val: string) {
    setNotes(val);
    if (managerMode) autoSave(ratings, val);
  }

  const managerTotal = (ratings.boardWork??0)+(ratings.visualTLM??0)+(ratings.energy??0)+(ratings.delivery??0)+(ratings.hook??0);
  const gradiContrib = data?.analysis ? Math.round(data.analysis.gradiScore * 5 * 10) / 10 : 0;
  const combinedTotal = Number((managerTotal + gradiContrib).toFixed(1));
  const ytId = data?.video ? extractYouTubeId(data.video.youtubeUrl) : null;
  const displayedRating = managerMode
    ? { boardWork: ratings.boardWork, visualTLM: ratings.visualTLM, energy: ratings.energy, delivery: ratings.delivery, hook: ratings.hook, total: managerTotal }
    : data?.managerRatings?.[0] ?? null;

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
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "100vw", background: "transparent", display: "flex", flexDirection: "row", overflow: "hidden" }}
            >
              {loading || !data ? (
                <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", background: "var(--bg-elev)", marginLeft: "auto", width: "min(680px, 100vw)", borderLeft: "1px solid var(--border)", boxShadow: "-20px 0 60px rgba(0,0,0,0.25)" }}>
                  <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
                </div>
              ) : (
                <>
                  {/* LEFT: Video preview with drop-line animation */}
                  <AnimatePresence>
                    {showPreview && ytId && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 40px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(30px)" }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Animated connecting line */}
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "100%", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          style={{ position: "absolute", right: 0, top: 0, width: 2, background: "linear-gradient(180deg, transparent, var(--emerald), transparent)", boxShadow: "0 0 20px var(--emerald)" }}
                        />
                        {/* Video drop animation */}
                        <motion.div
                          initial={{ y: -100, opacity: 0, scale: 0.9 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ y: -100, opacity: 0, scale: 0.9 }}
                          transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.2 }}
                          style={{ width: "100%", maxWidth: "1200px", aspectRatio: "16/9", position: "relative" }}
                        >
                          {/* Glow pulse */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ position: "absolute", inset: -20, background: "radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)", borderRadius: 24, filter: "blur(20px)", zIndex: 0 }}
                          />
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                            title={data.video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", border: "none", borderRadius: "20px", boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 2px var(--border)" }}
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* RIGHT: Content panel */}
                  <div style={{ width: "min(680px, 100vw)", flexShrink: 0, marginLeft: "auto", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-elev)", borderLeft: "1px solid var(--border)", boxShadow: "-20px 0 60px rgba(0,0,0,0.25)" }}>
                    {/* Header */}
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0 }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted">{data.video.subject}</span>
                            {data.video.facultyName && <span className="text-[11px] text-fg-muted">by {data.video.facultyName}</span>}
                          </div>
                          <h2 className="text-base md:text-lg font-semibold tracking-tight leading-snug">{data.video.title}</h2>
                          <a href={data.video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg">
                            <ExternalLink className="h-3 w-3" /> Watch on YouTube
                          </a>
                        </div>
                        <button onClick={onClose} className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-border text-fg-muted hover:bg-bg hover:text-fg">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable body */}
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      <div className="p-5 md:p-6 space-y-5">
                        {/* Preview toggle */}
                        {ytId && (
                          <button onClick={() => setShowPreview(p => !p)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg py-3 text-sm font-medium text-fg-muted hover:border-border-strong hover:text-fg transition-colors">
                            <Play className="h-4 w-4" style={{ color: showPreview ? "var(--emerald)" : undefined }} />
                            {showPreview ? "Hide preview" : "Preview video"}
                          </button>
                        )}

                        {/* Combined score */}
                        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
                          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--fg-muted)", marginBottom: 16 }}>Combined Score</p>
                          <div className="flex items-center gap-6">
                            <ScoreRing key={`ring-${videoId}`} score={combinedTotal} max={50} size={108} stroke={8} label="/ 50" />
                            <div className="flex-1 space-y-3">
                              <ScoreHalf key={"mgr-" + videoId} label="Manager Score" value={managerTotal} max={25} isEmpty={!managerMode && !displayedRating} emptyLabel="Not yet rated" />
                              <ScoreHalf key={"gradi-" + videoId} label="Gradi AI Score" value={gradiContrib} max={25} isEmpty={!data.analysis} emptyLabel="Analysis pending" />
                            </div>
                          </div>
                        </div>

                        {/* MANAGER RATING - FIRST (above Gradi) */}
                        {managerMode && (
                          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
                            <div className="flex items-center justify-between mb-5">
                              <div>
                                <h3 className="text-sm font-semibold">Video Score Card</h3>
                                <p className="text-[11px] text-fg-muted mt-0.5">Score each parameter</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-mono text-2xl font-bold" style={{ color: scoreColor(managerTotal / 5) }}>{managerTotal}</div>
                                  <div className="text-[10px] text-fg-muted">/ 25 pts</div>
                                </div>
                                <AnimatePresence mode="wait">
                                  {saving && <motion.span key="sv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-fg-muted"><Loader2 className="h-4 w-4 animate-spin" /></motion.span>}
                                  {!saving && savedAt && <motion.span key="sd" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ color: "var(--emerald)" }}><Save className="h-4 w-4" /></motion.span>}
                                </AnimatePresence>
                              </div>
                            </div>
                            <div className="space-y-5">
                              {MANAGER_PARAMS.map(p => <ScoringSlider key={p.key} label={p.label} desc={p.desc} value={ratings[p.key]??1} onChange={v => handleRating(p.key, v)} />)}
                            </div>
                            <div className="mt-5 pt-4 border-t border-border">
                              <label style={{ display: "block", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--fg-muted)", marginBottom: 8 }}>Feedback notes</label>
                              <textarea value={notes} onChange={e => handleNotes(e.target.value)} rows={3} placeholder="Share specific feedback for the faculty..."
                                style={{ width: "100%", background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--fg)", outline: "none", resize: "vertical" }} />
                            </div>
                          </div>
                        )}

                        {/* GRADI ANALYSIS - after manager rating */}
                        {data.analysis && (
                          <div className="space-y-4">
                            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
                              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--fg-muted)", marginBottom: 8 }}>Gradi AI &middot; {(data.analysis.gradiScore * 5).toFixed(1)}/25</p>
                              <p className="text-sm font-medium text-fg leading-snug">{data.analysis.oneLiner || data.analysis.scoreReason}</p>
                              {data.analysis.summary && (
                                <>
                                  <AnimatePresence>
                                    {showFullSummary && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 text-xs text-fg-muted leading-relaxed overflow-hidden">{data.analysis.summary}</motion.p>}
                                  </AnimatePresence>
                                  <button onClick={() => setShowFullSummary(p => !p)} className="mt-2 flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg transition-colors">
                                    {showFullSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    {showFullSummary ? "Hide summary" : "Read full summary"}
                                  </button>
                                </>
                              )}
                            </div>
                            <div>
                              <p style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--fg-muted)", marginBottom: 12 }}>Gradi Parameters</p>
                              <div className="space-y-3">
                                {GRADI_PARAMS.map((p, i) => { const v = (data.analysis as unknown as Record<string, unknown>)[p.key] as number; return <ParamBar key={p.key} label={p.label} value={v ?? 0} delay={i * 0.04} />; })}
                              </div>
                            </div>
                            {(data.analysis.positives?.length ?? 0) > 0 && (
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--emerald)", marginBottom: 8 }}>Strengths</p>
                                <ul className="space-y-2">
                                  {data.analysis.positives.map((pt, i) => <li key={i} className="flex gap-2 text-sm leading-snug" style={{ color: "var(--fg)" }}><span className="shrink-0 font-bold mt-0.5" style={{ color: "var(--emerald)" }}>+</span><span>{pt}</span></li>)}
                                </ul>
                              </div>
                            )}
                            {(data.analysis.improvements?.length ?? 0) > 0 && (
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--amber)", marginBottom: 8 }}>Areas for Improvement</p>
                                <ul className="space-y-2">
                                  {data.analysis.improvements.map((im, i) => <li key={i} className="flex gap-2 text-sm leading-snug" style={{ color: "var(--fg)" }}><span className="shrink-0 mt-0.5" style={{ color: "var(--amber)" }}>&rarr;</span><span>{im}</span></li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Faculty: received manager score */}
                        {!managerMode && displayedRating && (
                          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-sm font-semibold">Manager Score Card</h3>
                                <p className="text-[11px] text-fg-muted mt-0.5">{data.managerRatings[0]?.managerName}</p>
                              </div>
                              <div className="text-mono text-2xl font-bold" style={{ color: scoreColor(displayedRating.total / 5) }}>{displayedRating.total}<span className="text-sm font-normal text-fg-muted">/25</span></div>
                            </div>
                            <div className="space-y-3">
                              {MANAGER_PARAMS.map(p => <ParamBar key={p.key} label={p.label} value={(displayedRating as Record<string, unknown>)[p.key] as number ?? 0} delay={0} />)}
                            </div>
                            {data.managerRatings[0]?.notes && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <p style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--fg-muted)", marginBottom: 6 }}>Feedback</p>
                                <p className="text-sm leading-relaxed" style={{ color: "var(--fg)" }}>{data.managerRatings[0].notes}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* No Gradi yet */}
                        {!data.analysis && (
                          <div style={{ background: "var(--bg)", border: "1px dashed var(--border)", borderRadius: 12, padding: "24px", textAlign: "center" }}>
                            <Loader2 className="h-5 w-5 animate-spin text-fg-muted mx-auto mb-3" />
                            <p className="text-sm text-fg-muted">Gradi AI is analyzing this video</p>
                            <p className="text-[11px] text-fg-dim mt-1">Usually takes 20-40 seconds.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/* Helper components */
function ScoreHalf({ label, value, max, isEmpty, emptyLabel }: { label: string; value: number; max: number; isEmpty: boolean; emptyLabel: string }) {
  const pct = isEmpty ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const color = isEmpty ? "var(--fg-dim)" : scoreColor(value / (max / 5));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color }}>{isEmpty ? emptyLabel : `${value} / ${max}`}</span>
      </div>
      <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", borderRadius: 999, background: isEmpty ? "var(--border-strong)" : `linear-gradient(90deg, ${color}60, ${color})`, boxShadow: isEmpty ? "none" : `0 0 12px ${color}40` }} />
      </div>
    </div>
  );
}

function ParamBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const safeVal = typeof value === "number" && !isNaN(value) ? value : 0;
  const pct = Math.max(0, Math.min(100, (safeVal / 5) * 100));
  const color = scoreColor(safeVal);
  return (
    <div className="flex items-center gap-3">
      <span style={{ width: 140, flexShrink: 0, fontSize: 12, color: "var(--fg-muted)" }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", borderRadius: 999, background: color }} />
      </div>
      <span style={{ width: 28, textAlign: "right", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", flexShrink: 0, color }}>{safeVal > 0 ? `${Math.round(pct)}%` : "u2014"}</span>
    </div>
  );
}

function ScoringSlider({ label, desc, value, onChange }: { label: string; desc: string; value: number; onChange: (v: number) => void }) {
  const safeVal = typeof value === "number" && !isNaN(value) ? value : 1;
  const color = scoreColor(safeVal);
  const fillPct = Math.max(0, ((safeVal - 1) / 4) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{label}</span>
          <span style={{ fontSize: 11, color: "var(--fg-dim)", marginLeft: 8 }}>{desc}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color, minWidth: 40, textAlign: "right" }}>{(safeVal).toFixed(1)}</div>
      </div>
      <input type="range" min={1} max={5} step={0.5} value={safeVal} onChange={e => onChange(Number(e.target.value))}
        className="param-slider w-full"
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${fillPct}%, var(--slider-track) ${fillPct}%, var(--slider-track) 100%)` }} />
      <div className="flex justify-between mt-1 px-0.5">
        {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 10, color: safeVal >= n ? color : "var(--fg-dim)", fontFamily: "var(--font-mono)", transition: "color 0.2s" }}>{n}</span>)}
      </div>
    </div>
  );
}
