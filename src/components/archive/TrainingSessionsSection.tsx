"use client";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Calendar, User, Plus, Trash2, Check, X } from "lucide-react";
import type { ArchiveTrainingSession } from "@/types/archive";

interface Props {
  rows: ArchiveTrainingSession[];
  editMode?: boolean;
  onUpdate?: (rows: ArchiveTrainingSession[]) => void;
}

const BLANK: ArchiveTrainingSession = { session: "", date: "", trainer: "", week: "Week 1", remarks: "" };

export function TrainingSessionsSection({ rows, editMode, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ArchiveTrainingSession>(BLANK);

  const grouped = useMemo(() => {
    const g: Record<string, ArchiveTrainingSession[]> = {};
    for (const r of rows) {
      const k = r.week || "Unspecified";
      if (!g[k]) g[k] = [];
      g[k].push(r);
    }
    return g;
  }, [rows]);

  const allWeeks = Array.from(new Set(["Week 1", "Week 2", "Week 3", "Week 4", ...Object.keys(grouped)]));
  const ordered = allWeeks.filter(k => grouped[k]);

  function addRow() {
    if (!draft.session.trim()) return;
    onUpdate?.([...rows, draft]);
    setDraft(BLANK);
    setAdding(false);
  }

  function deleteRow(idx: number) {
    onUpdate?.(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-6">
      {editMode && (
        <div className="glass rounded-xl p-4">
          {!adding ? (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors">
              <Plus className="h-4 w-4" />Add training session
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-fg-muted font-medium">New session</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={draft.session} onChange={e => setDraft(d => ({ ...d, session: e.target.value }))}
                  placeholder="Session name *" className="input-field" />
                <input value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                  placeholder="Date (e.g. 5th May)" className="input-field" />
                <input value={draft.trainer} onChange={e => setDraft(d => ({ ...d, trainer: e.target.value }))}
                  placeholder="Trainer / Facilitator" className="input-field" />
                <select value={draft.week} onChange={e => setDraft(d => ({ ...d, week: e.target.value }))}
                  className="input-field">
                  {["Week 1","Week 2","Week 3","Week 4","Week 5","Week 6"].map(w =>
                    <option key={w} value={w}>{w}</option>
                  )}
                </select>
                <input value={draft.remarks} onChange={e => setDraft(d => ({ ...d, remarks: e.target.value }))}
                  placeholder="Remarks (optional)" className="input-field sm:col-span-2" />
              </div>
              <div className="flex gap-2">
                <button onClick={addRow} disabled={!draft.session.trim()}
                  className="flex items-center gap-1.5 rounded-full bg-fg px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-40">
                  <Check className="h-3.5 w-3.5" />Add
                </button>
                <button onClick={() => { setAdding(false); setDraft(BLANK); }}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-fg-muted hover:text-fg">
                  <X className="h-3.5 w-3.5" />Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {ordered.map(week => (
        <div key={week}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">{week}</h2>
            <span className="text-[10px] text-mono text-fg-muted">{grouped[week].length} sessions</span>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <ol className="divide-y divide-border">
              {grouped[week].map((s, i) => {
                const globalIdx = rows.indexOf(s);
                return (
                  <motion.li key={i}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="group flex items-center gap-4 px-5 md:px-6 py-3 hover:bg-bg-elev/40 transition-colors">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elev border border-border text-mono text-[10px] font-semibold text-fg-muted shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg/90 truncate">{s.session}</p>
                      {s.remarks && <p className="text-[11px] text-fg-muted mt-0.5 truncate">{s.remarks}</p>}
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-fg-muted whitespace-nowrap">
                      <Calendar className="h-3 w-3" />{s.date || "—"}
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-fg-muted whitespace-nowrap min-w-[140px]">
                      <User className="h-3 w-3" />{s.trainer || "—"}
                    </div>
                    {editMode && (
                      <button onClick={() => deleteRow(globalIdx)}
                        className="opacity-0 group-hover:opacity-100 text-fg-dim hover:text-rose-500 transition-all shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </div>
      ))}

      <style jsx>{`
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--bg-elev);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--fg);
          outline: none;
        }
        .input-field:focus { border-color: rgba(var(--fg), 0.3); }
      `}</style>
    </div>
  );
}
