"use client";
import { motion } from "framer-motion";
import { scoreColor } from "@/lib/utils";

interface ParameterBarProps {
  label: string;
  value: number;
  managerValue?: number;
  max?: number;
  delay?: number;
}

export function ParameterBar({
  label,
  value,
  managerValue,
  max = 5,
  delay = 0,
}: ParameterBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const mgrPct =
    managerValue != null
      ? Math.max(0, Math.min(100, (managerValue / max) * 100))
      : null;
  const color = scoreColor(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-fg-muted">{label}</span>
        <div className="flex items-center gap-2 text-mono">
          <span style={{ color }}>{value.toFixed(1)}</span>
          {managerValue != null && (
            <>
              <span className="text-fg-dim">·</span>
              <span style={{ color: scoreColor(managerValue) }}>
                {managerValue.toFixed(1)}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg-elev">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}40, ${color})`,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
        {mgrPct != null && (
          <motion.div
            initial={{ left: 0, opacity: 0 }}
            animate={{ left: `${mgrPct}%`, opacity: 1 }}
            transition={{ duration: 0.9, delay: delay + 0.2 }}
            className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
            style={{ boxShadow: "0 0 8px rgba(255,255,255,0.6)" }}
          />
        )}
      </div>
    </div>
  );
}
