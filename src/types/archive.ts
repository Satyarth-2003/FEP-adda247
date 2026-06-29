export interface ArchiveMetric {
  metric: string;
  target: string | number | null;
  weeks: (string | number | null)[];
}

export interface ArchiveWeekSummary {
  batch: string;
  phase: number;
  program: string;
  totalTrainees: number;
  weekHeaders: string[];
  metrics: ArchiveMetric[];
}

export interface ArchiveDropOff {
  name: string;
  reason: string;
  week: string;
  date: string | null;
  status: string;
  remarks: string;
}

export interface ArchiveLeaderRow {
  rank: number | null;
  name: string;
  score: number | null;
}

export interface ArchiveScoreRow {
  name: string;
  wk1: number | null;
  wk2: number | null;
  wk3: number | null;
  wk4: number | null;
  growth_w1_w2: string;
  growth_w2_w3: string;
  growth_w3_w4: string;
  total: number | null;
  attendPct?: string | null;
}

export interface ArchiveBestContent {
  trainee: string;
  type: string;
  topic: string;
  platform: string;
  views: number | null;
  link: string;
}

export interface ArchiveVideoLog {
  trainee: string;
  date: string | null;
  link: string;
  boardWork: number | null;
  visualTLM: number | null;
  energy: number | null;
  delivery: number | null;
  hook: number | null;
  total: number | null;
  notes: string;
  [key: string]: unknown;
}

export interface ArchiveTrainingSession {
  session: string;
  date: string;
  trainer: string;
  week: string;
  remarks: string;
}

export interface ProgramArchive {
  weekSummary: ArchiveWeekSummary;
  dropOffs: ArchiveDropOff[];
  topPerformers: Record<string, ArchiveLeaderRow[]>;
  bottomPerformers: Record<string, ArchiveLeaderRow[]>;
  scoreboard: ArchiveScoreRow[];
  bestContent: Record<string, ArchiveBestContent[]>;
  videoLog: ArchiveVideoLog[];
  trainingSessions: ArchiveTrainingSession[];
}
