"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import type { ArchiveDropOff } from "@/types/archive";

interface Props {
  rows: ArchiveDropOff[];
  editMode?: boolean;
  onUpdate?: (rows: ArchiveDropOff[]) => void;
}

const BLANK: ArchiveDropOff = { name: "", reason: "", week: "Week 1", date: null, status: "Exited", remarks: "" };

export function DropOffsSection({ rows, editMode, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ArchiveDropOff>(BLANK);

  function addRow() {
    if (!draft.name.trim()) return;
    onUpdate?.([...rows, draft]);
    setDraft(BLANK);
    setAdding(false);
  }

  function deleteRow(i: number) {
    onUpdate?.(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {editMode && (
        <div className="glass rounded-xl p-4">
          {!adding ? (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
              <Plus className="h-4 w-4" />Record a drop-off
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-fg-muted font-medium">New drop-off</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["name","reason","week","status","remarks"] as const).map(k => (
                  <input key={k} value={String(draft[k] ?? "")}
                    onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))}
                    placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                    className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addRow} disabled={!draft.name.trim()}
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

      {rows.map((d, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="group glass rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-fg">{d.name}</h3>
                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-500">
                  {d.status || "Exited"}
                </span>
                <span className="rounded-full border border-border bg-bg-elev/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted">
                  {d.week}
                </span>
              </div>
              <p className="mt-2 text-sm text-fg/80">
                <span className="text-fg-muted">Reason: </span>{d.reason}
              </p>
              {d.remarks && <p className="mt-1 text-xs text-fg-muted leading-snug">{d.remarks}</p>}
            </div>
            <div className="flex items-start gap-2 shrink-0">
              {d.date && (
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-fg-muted">Exit date</div>
                  <div className="text-mono text-xs text-fg/85 mt-0.5">{d.date}</div>
                </div>
              )}
              {editMode && (
                <button onClick={() => deleteRow(i)}
                  className="opacity-0 group-hover:opacity-100 text-fg-dim hover:text-rose-500 transition-all mt-0.5">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-fg-muted">No drop-offs recorded.</p>
        </div>
      )}
    </div>
  );
}
