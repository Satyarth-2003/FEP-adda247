import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= 4) return "#10b981";
  if (score >= 3) return "#f59e0b";
  return "#f43f5e";
}

export function scoreTone(score: number): "emerald" | "amber" | "rose" {
  if (score >= 4) return "emerald";
  if (score >= 3) return "amber";
  return "rose";
}

export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function youtubeThumb(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}
