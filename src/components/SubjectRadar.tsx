"use client";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { RATING_PARAMS } from "@/types";

interface SubjectRadarProps {
  data: { axis: string; value: number }[];
  title: string;
}

export function SubjectRadar({ data, title }: SubjectRadarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-fg-muted">
        {title}
      </h3>
      <div style={{ width: "100%", height: 220, minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="rgba(128,128,128,0.15)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "var(--fg-muted)", fontSize: 9 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={false}
              axisLine={false}
            />
            <Radar
              dataKey="value"
              stroke="var(--emerald)"
              fill="var(--emerald)"
              fillOpacity={0.2}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export function buildRadarData(
  sums: number[],
  n: number
): { axis: string; value: number }[] {
  return RATING_PARAMS.map((p, i) => ({
    axis: p.label.split(" ")[0],
    value: n > 0 ? Number((sums[i] / n).toFixed(2)) : 0,
  }));
}
