"use client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Plus, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import type { ArchiveWeekSummary, ArchiveDropOff } from "@/types/archive";

function formatVal(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    if (v > 0 && v < 1 && !Number.isInteger(v)) return `${(v * 100).toFixed(1)}%`;
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(2);
  }
  return v.toString();
}

const BLANK_DROP: ArchiveDropOff = { name: "", reason: "", week: "Week 1", date: null, status: "Exited", remarks: "" };

interface Props {
  summary: ArchiveWeekSummary;
  dropOffs: ArchiveDropOff[];
  editMode?: boolean;
  onUpdate?: (patch: Partial<ArchiveWeekSummary>) => void;
  onUpdateDropOffs?: (rows: ArchiveDropOff[]) => void;
}

export function WeekSummarySection({ summary, dropOffs, editMode, onUpdate, onUpdateDropOffs }: Props) {
  const [addingWeek, setAddingWeek] = useState(false);
  const [newWeekLabel, setNewWeekLabel] = useState("");
  const [addingDrop, setAddingDrop] = useState(false);
  const [draftDrop, setDraftDrop] = useState<ArchiveDropOff>(BLANK_DROP);

  function addWeek() {
    if (!newWeekLabel.trim()) return;
    const newHeaders = [...summary.weekHeaders, newWeekLabel.trim()];
    const newMetrics = summary.metrics.map(m => ({
      ...m, weeks: [...m.weeks, null],
    }));
    onUpdate?.({ weekHeaders: newHeaders, metrics: newMetrics });
    setNewWeekLabel("");
    setAddingWeek(false);
  }

  function addDropOff() {
    if (!draftDrop.name.trim()) return;
    onUpdateDropOffs?.([...dropOffs, draftDrop]);
    setDraftDrop(BLANK_DROP);
    setAddingDrop(false);
  }

  function deleteDropOff(i: number) {
    onUpdateDropOffs?.(dropOffs.filter((_, idx) => idx !== i));
  }

  function updateMetricValue(metricIdx: number, weekIdx: number, val: string) {
    const newMetrics = summary.metrics.map((m, mi) => {
      if (mi !== metricIdx) return m;
      const newWeeks = [...m.weeks];
      newWeeks[weekIdx] = val === "" ? null : isNaN(Number(val)) ? val : Number(val);
      return { ...m, weeks: newWeeks };
    });
    onUpdate?.({ metrics: newMetrics });
  }

  return (
    <div className="space-y-6">
      {/* Metrics table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Attendance &amp; Retention</h2>
            <p className="text-[11px] text-fg-muted mt-0.5">Weekly performance metrics across all weeks.</p>
          </div>
          {editMode && !addingWeek && (
            <button onClick={() => setAddingWeek(true)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-bg-elev/50 px-3 py-1.5 text-xs text-fg-muted hover:text-fg">
              <Plus className="h-3.5 w-3.5" />Add week
            </button>
          )}
          {editMode && addingWeek && (
            <div className="flex items-center gap-2">
              <input value={newWeekLabel} onChange={e => setNewWeekLabel(e.target.value)}
                placeholder="e.g. Wk 5 · 4–10 May"
                className="rounded-lg border border-border bg-bg-elev px-3 py-1.5 text-sm text-fg outline-none w-44" />
              <button onClick={addWeek} disabled={!newWeekLabel.trim()}
                className="rounded-full bg-fg px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-40">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { setAddingWeek(false); setNewWeekLabel(""); }}
                className="rounded-full border border-border px-2 py-1.5 text-xs text-fg-muted hover:text-fg">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-fg-muted border-b border-border">
                <th className="text-left font-medium px-5 md:px-6 py-3">Metric</th>
                <th className="text-right font-medium px-3 py-3">Target</th>
                {summary.weekHeaders.map((h, i) => (
                  <th key={i} className="text-right font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.metrics.map((m, mi) => (
                <motion.tr key={m.metric}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: mi * 0.04 }}
                  className="border-b border-border/60 last:border-0">
                  <td className="px-5 md:px-6 py-3 text-fg/90">{m.metric}</td>
                  <td className="px-3 py-3 text-right text-fg-muted text-mono">{formatVal(m.target)}</td>
                  {m.weeks.map((v, wi) => (
                    <td key={wi} className="px-3 py-3 text-right text-mono text-fg">
                      {editMode ? (
                        <input
                          value={v === null || v === undefined ? "" : String(v)}
                          onChange={e => updateMetricValue(mi, wi, e.target.value)}
                          className="w-16 rounded border border-border bg-bg-elev px-1.5 py-0.5 text-right text-xs text-fg outline-none"
                        />
                      ) : formatVal(v)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drop-offs */}
      {dropOffs.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Drop-offs &amp; Exits</h2>
              <p className="text-[11px] text-fg-muted mt-0.5">{dropOffs.length} trainees exited the program.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-rose-500">
                <TrendingDown className="h-3 w-3" />{dropOffs.length} exits
              </div>
              {editMode && !addingDrop && (
                <button onClick={() => setAddingDrop(true)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-bg-elev/50 px-2.5 py-1 text-[10px] text-fg-muted hover:text-fg">
                  <Plus className="h-3 w-3" />Add
                </button>
              )}
            </div>
          </div>
          {editMode && addingDrop && (
            <div className="px-5 md:px-6 py-4 border-b border-border">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {(["name","reason","week","status"] as const).map(k => (
                  <input key={k} value={String(draftDrop[k] ?? "")}
                    onChange={e => setDraftDrop(d => ({ ...d, [k]: e.target.value }))}
                    placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                    className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addDropOff} disabled={!draftDrop.name.trim()}
                  className="flex items-center gap-1.5 rounded-full bg-fg px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-40">
                  <Check className="h-3.5 w-3.5" />Add
                </button>
                <button onClick={() => { setAddingDrop(false); setDraftDrop(BLANK_DROP); }}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-fg-muted hover:text-fg">
                  <X className="h-3.5 w-3.5" />Cancel
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-fg-muted border-b border-border">
                  <th className="text-left font-medium px-5 md:px-6 py-3">Name</th>
                  <th className="text-left font-medium px-3 py-3">Reason</th>
                  <th className="text-left font-medium px-3 py-3">Week</th>
                  <th className="text-left font-medium px-3 py-3">Date</th>
                  {editMode && <th className="px-3 py-3" />}
                </tr>
              </thead>
              <tbody>
                {dropOffs.map((d, i) => (
                  <motion.tr key={i}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group border-b border-border/60 last:border-0 hover:bg-bg-elev/40">
                    <td className="px-5 md:px-6 py-3 font-medium text-fg/90">{d.name}</td>
                    <td className="px-3 py-3 text-fg-muted">{d.reason}</td>
                    <td className="px-3 py-3 text-fg-muted">{d.week}</td>
                    <td className="px-3 py-3 text-fg-muted text-mono text-xs">{d.date ?? "—"}</td>
                    {editMode && (
                      <td className="px-3 py-3">
                        <button onClick={() => deleteDropOff(i)}
                          className="opacity-0 group-hover:opacity-100 text-fg-dim hover:text-rose-500 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-2 text-emerald-500 mb-2">
          <TrendingUp className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-[0.18em]">Cohort insight</span>
        </div>
        <p className="text-sm text-fg/90 leading-relaxed">
          After a rough Week 1 (69.4% attendance), engagement recovered fully &mdash; attendance held at 100%
          across Weeks 2&ndash;4 and average video output stabilized at ~3 videos per trainee per week.
        </p>
      </div>
    </div>
  );
}
