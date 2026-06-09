"use client";
import { motion } from "framer-motion";
import { Trophy, AlertTriangle, Plus, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import type { ArchiveLeaderRow } from "@/types/archive";

interface Props {
  top: Record<string, ArchiveLeaderRow[]>;
  bottom: Record<string, ArchiveLeaderRow[]>;
  weekHeaders: string[];
  editMode?: boolean;
  onUpdate?: (top: Record<string, ArchiveLeaderRow[]>, bottom: Record<string, ArchiveLeaderRow[]>) => void;
}

const BLANK: ArchiveLeaderRow = { rank: null, name: "", score: null };

export function LeaderboardSection({ top, bottom, weekHeaders, editMode, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">Top 5 Performers per Week</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {weekHeaders.map((header, idx) => {
            const key = `week${idx + 1}`;
            const rows = top[key] ?? [];
            return (
              <WeekBlock key={header} title={header} rows={rows} tone="top" editMode={editMode}
                onUpdate={updated => onUpdate?.({ ...top, [key]: updated }, bottom)} />
            );
          })}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">Bottom 5 — Needs Attention</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {weekHeaders.map((header, idx) => {
            const key = `week${idx + 1}`;
            const rows = bottom[key] ?? [];
            return (
              <WeekBlock key={header} title={header} rows={rows} tone="bottom" editMode={editMode}
                onUpdate={updated => onUpdate?.(top, { ...bottom, [key]: updated })} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekBlock({ title, rows, tone, editMode, onUpdate }: {
  title: string; rows: ArchiveLeaderRow[]; tone: "top" | "bottom";
  editMode?: boolean; onUpdate?: (rows: ArchiveLeaderRow[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ArchiveLeaderRow>(BLANK);

  function addRow() {
    if (!draft.name.trim()) return;
    onUpdate?.([...rows, { ...draft, rank: rows.length + 1 }]);
    setDraft(BLANK);
    setAdding(false);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
      className="glass rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-fg-muted mb-3">{title}</p>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="group flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg-elev/30 px-2.5 py-1.5">
            <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] text-mono font-semibold ${
              tone === "top" && i === 0 ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
              : tone === "bottom" && i === 0 ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
              : "bg-bg-elev text-fg-muted border border-border"
            }`}>{r.rank ?? i + 1}</span>
            <span className="flex-1 text-xs text-fg/90 truncate">{r.name}</span>
            <span className={`text-mono text-[11px] font-semibold ${tone === "top" ? "text-emerald-500" : "text-rose-500"}`}>
              {r.score ?? "—"}
            </span>
            {editMode && (
              <button onClick={() => onUpdate?.(rows.filter((_, j) => j !== i))}
                className="opacity-0 group-hover:opacity-100 text-fg-dim hover:text-rose-500 transition-all ml-1">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {editMode && !adding && (
          <button onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-1.5 text-[10px] text-fg-muted hover:text-fg">
            <Plus className="h-3 w-3" />Add
          </button>
        )}
        {editMode && adding && (
          <div className="space-y-2 pt-1">
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Name *" className="w-full rounded-lg border border-border bg-bg-elev px-2.5 py-1.5 text-xs text-fg outline-none" />
            <input type="number" value={String(draft.score ?? "")}
              onChange={e => setDraft(d => ({ ...d, score: e.target.value ? Number(e.target.value) : null }))}
              placeholder="Score" className="w-full rounded-lg border border-border bg-bg-elev px-2.5 py-1.5 text-xs text-fg outline-none" />
            <div className="flex gap-2">
              <button onClick={addRow} disabled={!draft.name.trim()}
                className="flex items-center gap-1 rounded-full bg-fg px-2.5 py-1 text-[10px] font-medium text-bg disabled:opacity-40">
                <Check className="h-2.5 w-2.5" />Add
              </button>
              <button onClick={() => { setAdding(false); setDraft(BLANK); }}
                className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] text-fg-muted hover:text-fg">
                <X className="h-2.5 w-2.5" />Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
