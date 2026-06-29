"use client";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Minus, Search, Plus, Trash2, Check, X } from "lucide-react";
import type { ArchiveScoreRow } from "@/types/archive";

interface Props {
  rows: ArchiveScoreRow[];
  weekHeaders: string[];
  editMode?: boolean;
  onUpdate?: (rows: ArchiveScoreRow[]) => void;
}

type SortKey = "name" | "wk1" | "wk2" | "wk3" | "wk4" | "total";

const BLANK: ArchiveScoreRow = {
  name: "", wk1: null, wk2: null, wk3: null, wk4: null,
  growth_w1_w2: "", growth_w2_w3: "", growth_w3_w4: "", total: null,
  attendPct: "",
};

export function ScoreboardSection({ rows, weekHeaders, editMode, onUpdate }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortAsc, setSortAsc] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ArchiveScoreRow>(BLANK);

  const filtered = useMemo(() => {
    let list = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    list = [...list].sort((a, b) => {
      if (sortKey === "name") return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      const av = typeof a[sortKey] === "number" ? (a[sortKey] as number) : -Infinity;
      const bv = typeof b[sortKey] === "number" ? (b[sortKey] as number) : -Infinity;
      return sortAsc ? av - bv : bv - av;
    });
    return list;
  }, [rows, search, sortKey, sortAsc]);

  function setSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(key === "name"); }
  }

  function addRow() {
    if (!draft.name.trim()) return;
    const scores = [draft.wk1, draft.wk2, draft.wk3, draft.wk4].filter((v): v is number => typeof v === "number");
    const total = scores.length ? scores.reduce((a, b) => a + b, 0) : null;
    // compute simple growth indicators
    function growth(a: number | null, b: number | null) {
      if (a == null || b == null) return "—";
      const d = b - a;
      if (d > 0) return `▲ ${d.toFixed(1)}`;
      if (d < 0) return `▼ ${Math.abs(d).toFixed(1)}`;
      return "→ 0";
    }
    const filled = {
      ...draft, total,
      growth_w1_w2: growth(draft.wk1, draft.wk2),
      growth_w2_w3: growth(draft.wk2, draft.wk3),
      growth_w3_w4: growth(draft.wk3, draft.wk4),
    };
    onUpdate?.([...rows, filled]);
    setDraft(BLANK);
    setAdding(false);
  }

  function deleteRow(name: string) {
    onUpdate?.(rows.filter(r => r.name !== name));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trainee..."
            className="w-full rounded-full border border-border bg-bg-elev/60 pl-9 pr-3 py-2 text-sm outline-none focus:border-fg/30" />
        </div>
        <p className="text-[11px] text-fg-muted">
          <span className="text-mono text-fg/85">{filtered.length}</span> / <span className="text-mono text-fg/85">{rows.length}</span>
        </p>
      </div>

      {editMode && (
        <div className="glass rounded-xl p-4">
          {!adding ? (
            <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
              <Plus className="h-4 w-4" />Add trainee row
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-fg-muted font-medium">New trainee</p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="Name *" className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none sm:col-span-1" />
                {(["wk1","wk2","wk3","wk4"] as const).map((k, i) => (
                  <input key={k} type="number" step={0.5}
                    value={String(draft[k] ?? "")}
                    onChange={e => setDraft(d => ({ ...d, [k]: e.target.value ? Number(e.target.value) : null }))}
                    placeholder={`Wk ${i+1}`}
                    className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
                ))}
                <input value={draft.attendPct ?? ""} onChange={e => setDraft(d => ({ ...d, attendPct: e.target.value }))}
                  placeholder="Attend %" className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
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

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-fg-muted border-b border-border">
                <SortTh label="Trainee" k="name" sortKey={sortKey} asc={sortAsc} onClick={() => setSort("name")} align="left" className="px-5 md:px-6" />
                {(["wk1","wk2","wk3","wk4"] as const).map((k, i) => (
                  <SortTh key={k} label={weekHeaders[i]?.split("·")[0]?.trim() ?? `Wk ${i+1}`} k={k} sortKey={sortKey} asc={sortAsc} onClick={() => setSort(k)} align="right" />
                ))}
                <th className="text-center px-3 py-3 font-medium">Wk1→2</th>
                <th className="text-center px-3 py-3 font-medium">Wk2→3</th>
                <th className="text-center px-3 py-3 font-medium">Wk3→4</th>
                <th className="text-center px-3 py-3 font-medium">Attend %</th>
                <SortTh label="Total" k="total" sortKey={sortKey} asc={sortAsc} onClick={() => setSort("total")} align="right" />
                {editMode && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <motion.tr key={r.name}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.4) }}
                  className="group border-b border-border/60 last:border-0 hover:bg-bg-elev/40">
                  <td className="px-5 md:px-6 py-2.5 text-fg/90 font-medium whitespace-nowrap">{r.name}</td>
                  {([r.wk1, r.wk2, r.wk3, r.wk4] as (number|null)[]).map((v, j) => (
                    <td key={j} className="px-3 py-2.5 text-right text-mono text-fg/85">{v ?? "—"}</td>
                  ))}
                  <GrowthCell value={r.growth_w1_w2} />
                  <GrowthCell value={r.growth_w2_w3} />
                  <GrowthCell value={r.growth_w3_w4} />
                  <td className="px-3 py-2.5 text-center text-mono text-fg-muted">{r.attendPct ?? "—"}</td>
                  <td className="px-5 md:px-6 py-2.5 text-right text-mono font-semibold">{r.total ?? "—"}</td>
                  {editMode && (
                    <td className="px-3 py-2.5">
                      <button onClick={() => deleteRow(r.name)}
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
    </div>
  );
}

function SortTh({ label, k, sortKey, asc, onClick, align, className = "" }: {
  label: string; k: string; sortKey: string; asc: boolean; onClick: () => void; align: "left"|"right"; className?: string;
}) {
  return (
    <th onClick={onClick}
      className={`cursor-pointer select-none px-3 py-3 font-medium hover:text-fg ${align === "right" ? "text-right" : "text-left"} ${sortKey === k ? "text-fg" : ""} ${className}`}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (asc ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />)}
      </span>
    </th>
  );
}

function GrowthCell({ value }: { value: string }) {
  if (!value || value === "—") return <td className="px-3 py-2.5 text-center text-fg-dim/60">—</td>;
  
  let colorClass = "text-fg-dim";
  if (value.startsWith("▲")) colorClass = "text-emerald-500 font-medium";
  else if (value.startsWith("▼")) colorClass = "text-rose-500 font-medium";
  
  return (
    <td className={`px-3 py-2.5 text-center text-mono text-xs ${colorClass}`}>
      {value}
    </td>
  );
}
