"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SubjectTabsProps {
  subjects: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}

export function SubjectTabs({ subjects, active, onChange }: SubjectTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {subjects.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              "relative flex-shrink-0 px-3 py-1.5 text-xs font-medium transition-colors",
              isActive ? "text-fg" : "text-fg-muted hover:text-fg/80"
            )}
          >
            <span className="flex items-center gap-1.5">
              {s.label}
              {s.count != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] text-mono",
                    isActive
                      ? "bg-fg/10 text-fg"
                      : "bg-bg-elev text-fg-muted"
                  )}
                >
                  {s.count}
                </span>
              )}
            </span>
            {isActive && (
              <motion.div
                layoutId="subject-tab-underline"
                className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-fg"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
