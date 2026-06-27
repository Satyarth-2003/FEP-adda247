"use client";
import { motion } from "framer-motion";
import type { VideoStatus } from "@/types";
import { cn } from "@/lib/utils";

const meta: Record<
  VideoStatus,
  { label: string; color: string; pulse?: boolean }
> = {
  uploaded: {
    label: "Uploaded",
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
  analyzing: {
    label: "Pending",
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
  gradi_done: {
    label: "Uploaded",
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
  manager_rated: {
    label: "Manager Scored",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  no_transcript: {
    label: "Uploaded",
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
};

export function StatusChip({ status }: { status: VideoStatus }) {
  const m = meta[status] || meta.uploaded;
  return (
    <motion.span
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider",
        m.color
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {m.pulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {m.label}
    </motion.span>
  );
}
