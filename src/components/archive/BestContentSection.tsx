"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Eye, Play, Plus, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import type { ArchiveBestContent } from "@/types/archive";
import { youtubeThumb, cn } from "@/lib/utils";

interface Props {
  content: Record<string, ArchiveBestContent[]>;
  editMode?: boolean;
  onUpdate?: (content: Record<string, ArchiveBestContent[]>) => void;
}

const ALL_WEEKS = [
  { id: "week1", label: "Week 1 · 6–12 Apr" },
  { id: "week2", label: "Week 2 · 13–19 Apr" },
  { id: "week3", label: "Week 3 · 20–26 Apr" },
  { id: "week4", label: "Week 4 · 27 Apr–3 May" },
];

const BLANK: ArchiveBestContent = { trainee: "", type: "Best video (long-form)", topic: "", platform: "YouTube", views: null, link: "" };

export function BestContentSection({ content, editMode, onUpdate }: Props) {
  const [active, setActive] = useState("week1");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ArchiveBestContent>(BLANK);

  const items = content[active] ?? [];

  const weeks = [...ALL_WEEKS];
  // Also include any dynamically added week keys
  Object.keys(content).forEach(k => {
    if (!weeks.find(w => w.id === k)) weeks.push({ id: k, label: k.replace("week","Week ") });
  });

  function addItem() {
    if (!draft.trainee.trim() && !draft.link.trim()) return;
    onUpdate?.({ ...content, [active]: [...items, draft] });
    setDraft(BLANK);
    setAdding(false);
  }

  function deleteItem(i: number) {
    onUpdate?.({ ...content, [active]: items.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {weeks.map(w => {
          const c = (content[w.id] ?? []).length;
          const isActive = active === w.id;
          return (
            <button key={w.id} onClick={() => setActive(w.id)}
              className={cn("relative flex-shrink-0 px-3 py-1.5 text-xs font-medium transition-colors",
                isActive ? "text-fg" : "text-fg-muted hover:text-fg/80")}>
              <span className="flex items-center gap-1.5">{w.label}
                <span className={cn("rounded-full px-1.5 py-px text-[10px] text-mono",
                  isActive ? "bg-fg/10 text-fg" : "bg-bg-elev text-fg-muted")}>{c}</span>
              </span>
              {isActive && <motion.div layoutId="content-tab" className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-fg" transition={{ duration: 0.3 }} />}
            </button>
          );
        })}
      </div>

      {editMode && (
        <div className="glass rounded-xl p-4">
          {!adding ? (
            <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
              <Plus className="h-4 w-4" />Add content
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-fg-muted font-medium">New entry</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={draft.trainee} onChange={e => setDraft(d => ({ ...d, trainee: e.target.value }))}
                  placeholder="Trainee name" className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
                <input value={draft.topic} onChange={e => setDraft(d => ({ ...d, topic: e.target.value }))}
                  placeholder="Topic / Title *" className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
                <input value={draft.link} onChange={e => setDraft(d => ({ ...d, link: e.target.value }))}
                  placeholder="YouTube URL" className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
                <input type="number" value={String(draft.views ?? "")}
                  onChange={e => setDraft(d => ({ ...d, views: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Views" className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
                <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none sm:col-span-2">
                  <option>Best video (long-form)</option>
                  <option>Best short</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addItem} disabled={!draft.topic.trim() && !draft.trainee.trim()}
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

      <AnimatePresence mode="wait">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-fg-muted">No content for this week.{editMode && " Click Add content above."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="group glass relative overflow-hidden rounded-xl">
                <a href={c.link || undefined} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="relative aspect-video overflow-hidden bg-bg-elev">
                    {c.link && youtubeThumb(c.link) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={youtubeThumb(c.link)!} alt={c.topic}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-fg-dim">
                        <Play className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
                    {c.views != null && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-bg-card/80 backdrop-blur border border-border px-2 py-0.5 text-[10px] text-mono text-fg/85">
                        <Eye className="h-2.5 w-2.5" />
                        {c.views >= 1000 ? `${(c.views / 1000).toFixed(1)}K` : c.views}
                      </div>
                    )}
                    {c.type && (
                      <div className="absolute bottom-3 left-3 rounded-full border border-border bg-bg-card/80 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted">
                        {c.type.replace("Best ", "").replace(" (long-form)", "")}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-medium leading-snug text-fg">{c.topic || "Untitled"}</h3>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-fg-muted truncate">{c.trainee}</span>
                      {c.link && <ExternalLink className="h-3 w-3 text-fg-muted group-hover:text-fg shrink-0" />}
                    </div>
                  </div>
                </a>
                {editMode && (
                  <button onClick={() => deleteItem(i)}
                    className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-full bg-bg-card/90 border border-border text-fg-dim hover:text-rose-500 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
