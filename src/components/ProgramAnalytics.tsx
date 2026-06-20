"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Filter, RefreshCw, Loader2, TrendingUp, Activity, Users, Video } from "lucide-react";
import type { Subject } from "@/types";
import { cn } from "@/lib/utils";

interface AnalyticsRow {
  trainee: string;
  facultyId: string;
  date: string | null;
  uploadedAt: string;
  subject: string;
  subjectId: string;
  boardWork: number | null;
  visualTLM: number | null;
  energy: number | null;
  delivery: number | null;
  hook: number | null;
  managerTotal: number | null;
  gradiScore: number | null;
  gradiContrib: number | null;
  combinedTotal: number | null;
  status: string;
  videoId: string;
}

const COLORS = {
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#38bdf8",
  violet: "#a78bfa",
  pink: "#ec4899",
  teal: "#14b8a6",
  indigo: "#6366f1",
};

const SUBJECT_COLORS = [
  COLORS.sky, COLORS.violet, COLORS.pink, COLORS.teal, COLORS.indigo, COLORS.amber,
];

interface Props {
  subjects: Subject[];
}

export function ProgramAnalytics({ subjects }: Props) {
  const [facultyId, setFacultyId] = useState<string>("all");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const dataQ = useQuery<{ rows: AnalyticsRow[] }>({
    queryKey: ["analytics-videolog"],
    queryFn: () => fetch("/api/archive/videolog").then(r => r.json()),
    staleTime: 30_000,
    refetchInterval: 15_000, // auto-refresh every 15s to pick up new data
  });

  const allRows = dataQ.data?.rows ?? [];

  // Distinct faculties for the filter dropdown
  const faculties = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of allRows) m.set(r.facultyId, r.trainee);
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows]);

  // Filtered rows
  const rows = useMemo(() => {
    return allRows.filter(r =>
      (facultyId === "all" || r.facultyId === facultyId) &&
      (subjectId === "all" || r.subjectId === subjectId) &&
      (statusFilter === "all" || 
        (statusFilter === "manager_rated" && r.status === "manager_rated") ||
        (statusFilter === "pending" && r.status !== "manager_rated")
      )
    );
  }, [allRows, facultyId, subjectId, statusFilter]);

  // ── Pie 1: Score band distribution
  const scoreBands = useMemo(() => {
    let high = 0, mid = 0, low = 0, none = 0;
    for (const r of rows) {
      const s = r.gradiScore;
      if (s == null) { none++; continue; }
      if (s >= 4) high++;
      else if (s >= 3) mid++;
      else low++;
    }
    const out = [
      { name: "High (≥ 4.0)", value: high, fill: COLORS.emerald },
      { name: "Mid (3.0–3.9)", value: mid, fill: COLORS.amber },
      { name: "Low (< 3.0)", value: low, fill: COLORS.rose },
      { name: "Unanalyzed", value: none, fill: "var(--border-strong)" },
    ];
    return out.filter(x => x.value > 0);
  }, [rows]);

  // ── Pie 2: Videos by subject
  const subjectMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.subject, (m.get(r.subject) ?? 0) + 1);
    return Array.from(m, ([name, value], i) => ({
      name, value, fill: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    }));
  }, [rows]);

  // ── Histogram 1: Score distribution (bins of 1.0 from 0 to 5)
  const scoreHistogram = useMemo(() => {
    const bins = [
      { range: "0–1", count: 0, fill: COLORS.rose },
      { range: "1–2", count: 0, fill: COLORS.rose },
      { range: "2–3", count: 0, fill: COLORS.rose },
      { range: "3–4", count: 0, fill: COLORS.amber },
      { range: "4–5", count: 0, fill: COLORS.emerald },
    ];
    for (const r of rows) {
      const s = r.gradiScore;
      if (s == null) continue;
      const idx = Math.min(4, Math.floor(s));
      bins[idx].count++;
    }
    return bins;
  }, [rows]);

  // ── Histogram 2: Uploads over time (per day)
  const uploadsOverTime = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const d = r.date ?? "—";
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return Array.from(m, ([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  // ── Histogram 3: Average per parameter (manager)
  const paramAverages = useMemo(() => {
    const params = ["boardWork", "visualTLM", "energy", "delivery", "hook"] as const;
    const labels = ["Board", "TLM", "Energy", "Delivery", "Hook"];
    return params.map((p, i) => {
      const vals = rows.map(r => r[p]).filter((v): v is number => typeof v === "number");
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const fill = avg >= 4 ? COLORS.emerald : avg >= 3 ? COLORS.amber : COLORS.rose;
      return { param: labels[i], avg: Number(avg.toFixed(2)), fill };
    });
  }, [rows]);

  // ── Hero stats
  const stats = useMemo(() => {
    const ratedCount = rows.filter(r => r.status === "manager_rated").length;
    const mgrScores = rows.filter(r => r.managerTotal != null).map(r => r.managerTotal!);
    const avg = mgrScores.length ? mgrScores.reduce((a, b) => a + b, 0) / mgrScores.length : 0;
    return {
      total: rows.length,
      rated: ratedCount,
      avgManager: Number(avg.toFixed(2)),
      faculties: new Set(rows.map(r => r.facultyId)).size,
    };
  }, [rows]);

  if (dataQ.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-4"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
              <Filter className="h-3 w-3" />Filters
            </div>
            <FilterSelect
              value={facultyId}
              onChange={setFacultyId}
              options={[{ value: "all", label: "All Faculty" }, ...faculties.map(f => ({ value: f.id, label: f.name }))]}
            />
            <FilterSelect
              value={subjectId}
              onChange={setSubjectId}
              options={[{ value: "all", label: "All Subjects" }, ...subjects.map(s => ({ value: s.subjectId, label: s.name }))]}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Status" },
                { value: "manager_rated", label: "Manager Scored" },
                { value: "pending", label: "Uploaded / Pending" },
              ]}
            />
          </div>
          <button
            onClick={() => dataQ.refetch()}
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-elev/60 px-3 py-1.5 text-[11px] text-fg-muted hover:text-fg transition-colors"
          >
            <RefreshCw className="h-3 w-3" />Refresh
          </button>
        </div>
      </motion.div>
 
      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={Video} label="Videos" value={stats.total} />
        <StatTile icon={TrendingUp} label="Avg Manager" value={stats.avgManager.toFixed(2)} />
        <StatTile icon={Activity} label="Manager Scored" value={`${stats.rated}/${stats.total}`} />
        <StatTile icon={Users} label="Faculty" value={stats.faculties} />
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <p className="text-sm text-fg-muted">No videos match the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie 1: Score Distribution (commented out as per user request) */}
          {/*
          <ChartCard title="Score Distribution" subtitle="Gradi AI score bands">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={scoreBands}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {scoreBands.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: "var(--fg-muted)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          */}

          {/* Pie 2 */}
          <ChartCard title="Videos by Subject" subtitle="Subject mix">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={subjectMix}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {subjectMix.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Histogram 1: Score buckets (commented out as per user request) */}
          {/*
          <ChartCard title="Score Histogram" subtitle="Videos in each Gradi band">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={scoreHistogram} margin={{ top: 16, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                <XAxis dataKey="range" tick={{ fill: "var(--fg-muted)", fontSize: 11 }} stroke="rgba(128,128,128,0.2)" />
                <YAxis tick={{ fill: "var(--fg-muted)", fontSize: 11 }} stroke="rgba(128,128,128,0.2)" allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(128,128,128,0.08)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {scoreHistogram.map((b, i) => <Cell key={i} fill={b.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          */}

          {/* Histogram 2: Manager parameter averages */}
          <ChartCard title="Manager Parameter Averages" subtitle="Mean score across selected videos">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={paramAverages} margin={{ top: 16, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                <XAxis dataKey="param" tick={{ fill: "var(--fg-muted)", fontSize: 11 }} stroke="rgba(128,128,128,0.2)" />
                <YAxis domain={[0, 5]} tick={{ fill: "var(--fg-muted)", fontSize: 11 }} stroke="rgba(128,128,128,0.2)" />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(128,128,128,0.08)" }} />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {paramAverages.map((b, i) => <Cell key={i} fill={b.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Full-width: Uploads over time */}
          <div className="lg:col-span-2">
            <ChartCard title="Uploads Over Time" subtitle="Daily video submissions">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={uploadsOverTime} margin={{ top: 16, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--fg-muted)", fontSize: 10 }} stroke="rgba(128,128,128,0.2)" />
                  <YAxis tick={{ fill: "var(--fg-muted)", fontSize: 11 }} stroke="rgba(128,128,128,0.2)" allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(128,128,128,0.08)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" name="Uploads" fill="var(--emerald)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function FilterSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-full border border-border bg-bg-elev/60 px-3 py-1.5 text-xs text-fg outline-none focus:border-fg/30 cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function StatTile({
  icon: Icon, label, value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="mt-1.5 text-mono text-2xl font-bold tracking-tight">{value}</div>
    </motion.div>
  );
}

function ChartCard({
  title, subtitle, children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-fg-muted mt-0.5">{subtitle}</p>}
      </div>
      <div style={{ width: "100%", minHeight: 240 }}>
        {children}
      </div>
    </motion.div>
  );
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  payload?: Record<string, unknown>;
  fill?: string;
  color?: string;
}

function DarkTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--bg-elev)" }}
    >
      {label != null && <div className="text-fg-muted text-[10px] uppercase tracking-wider mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-fg">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.fill ?? p.color ?? "var(--emerald)" }}
          />
          <span className="text-fg-muted">{p.name ?? ""}</span>
          <span className="text-mono font-semibold ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Hook reuse marker (for cn import to not be unused if the user lints strictly)
const _useCn = cn;
void _useCn;
