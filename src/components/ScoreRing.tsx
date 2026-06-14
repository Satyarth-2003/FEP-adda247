"use client";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { scoreColor } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  max?: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
  label?: string;
}

export function ScoreRing({
  score,
  max = 5,
  size = 96,
  stroke = 6,
  showLabel = true,
  label,
}: ScoreRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, score / max));
  const color = scoreColor(score);

  const progress = useMotionValue(0);
  const dashOffset = useTransform(
    progress,
    (v) => circumference - v * circumference
  );
  const numText = useTransform(progress, (v) => (v * max).toFixed(1));

  useEffect(() => {
    const controls = animate(progress, pct, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [pct, progress]);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
          filter={`drop-shadow(0 0 8px ${color}80)`}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-mono text-2xl font-semibold tracking-tight"
            style={{ color }}
          >
            {numText}
          </motion.span>
          {label && (
            <span className="text-[10px] uppercase tracking-wider text-fg-muted mt-0.5">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
