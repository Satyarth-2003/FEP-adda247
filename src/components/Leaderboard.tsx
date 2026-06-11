"use client";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Video as VideoIcon } from "lucide-react";
import { scoreColor, cn } from "@/lib/utils";

interface LeaderRow {
  userId: string;
  name: string;
  email: string;
  subjects: string[];
  videoCount: number;
  avgGradiScore: number;
}

interface LeaderboardProps {
  rows: LeaderRow[];
  onSelect: (userId: string) => void;
  selectedId?: string | null;
}

export function Leaderboard({
  rows,
  onSelect,
  selectedId,
}: LeaderboardProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {rows.map((row, i) => {
          const color = scoreColor(row.avgGradiScore);
          const isSelected = selectedId === row.userId;
          return (
            <motion.button
              key={row.userId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.4,
                delay: Math.min(i * 0.03, 0.2),
                layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
              }}
              whileHover={{ x: 2 }}
              onClick={() => onSelect(row.userId)}
              className={cn(
                "group flex w-full items-center gap-4 rounded-xl border p-3.5 text-left transition-colors",
                isSelected
                  ? "border-fg/30 bg-bg-elev/80"
                  : "border-border bg-bg-elev/40 hover:border-border-strong hover:bg-bg-elev/70"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-mono text-sm font-semibold",
                  i === 0
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : i < 3
                      ? "bg-fg/10 text-fg border border-fg/15"
                      : "bg-bg-elev text-fg-muted border border-border"
                )}
              >
                {i + 1}
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fg/30 to-fg/5 text-xs font-medium">
                {row.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">
                  {row.name}
                </p>
                <p className="text-[11px] text-fg-muted truncate">
                  {row.email}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-1 text-[11px] text-fg-muted">
                  <VideoIcon className="h-3 w-3" />
                  <span className="text-mono">{row.videoCount}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className="text-mono text-base font-semibold tracking-tight"
                    style={{ color }}
                  >
                    {(row.avgGradiScore * 5).toFixed(1)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-fg-dim">
                    /25
                  </span>
                </div>
                <TrendingUp
                  className="h-3.5 w-3.5 text-fg-dim transition-colors group-hover:text-fg"
                  style={{ color: row.avgGradiScore > 0 ? color : undefined }}
                />
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
