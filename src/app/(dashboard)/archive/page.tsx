"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Search,
  User as UserIcon,
  Mail,
  Layers,
  BookOpen,
  Calendar,
  Users,
  Eye,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { User, Subject } from "@/types";

export default function ArchivePage() {
  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");

  // Fetch all faculty users
  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: User[] }>({
    queryKey: ["archive-users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  // Fetch all verticals/subjects definitions
  const { data: subjectsData } = useQuery<{ subjects: Subject[] }>({
    queryKey: ["subjects"],
    queryFn: () => fetch("/api/subjects").then((r) => r.json()),
  });

  const facultyList = usersData?.users ?? [];
  const subjects = subjectsData?.subjects ?? [];

  // Create lookup for subject vertical name
  const subjectsMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.subjectId, s.name]));
  }, [subjects]);

  // Extract unique teaching subjects for the filter dropdown
  const uniqueTeachingSubjects = useMemo(() => {
    const set = new Set<string>();
    facultyList.forEach((u) => {
      if (u.teachingSubject) {
        const clean = u.teachingSubject.trim();
        if (clean) set.add(clean);
      }
    });
    return Array.from(set).sort();
  }, [facultyList]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setCohortFilter("all");
    setVerticalFilter("all");
    setSubjectFilter("all");
    setGenderFilter("all");
    setAgeFilter("all");
  };

  // Filtered faculty list
  const filteredFaculty = useMemo(() => {
    return facultyList.filter((u) => {
      // 1. Search term (Name or Email)
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);

      // 2. Cohort Filter
      const matchesCohort =
        cohortFilter === "all" ||
        (u.cohort && u.cohort.toLowerCase() === cohortFilter.toLowerCase());

      // 3. Vertical (subjects array) Filter
      const matchesVertical =
        verticalFilter === "all" ||
        (u.subjects && u.subjects.includes(verticalFilter));

      // 4. Teaching Subject Filter
      const matchesSubject =
        subjectFilter === "all" ||
        (u.teachingSubject &&
          u.teachingSubject.trim().toLowerCase() === subjectFilter.trim().toLowerCase());

      // 5. Gender Filter
      const matchesGender =
        genderFilter === "all" ||
        (u.gender && u.gender.toLowerCase() === genderFilter.toLowerCase());

      // 6. Age Filter
      let matchesAge = true;
      if (ageFilter !== "all" && u.age !== undefined) {
        const age = Number(u.age);
        if (ageFilter === "under25") {
          matchesAge = age < 25;
        } else if (ageFilter === "25to30") {
          matchesAge = age >= 25 && age <= 30;
        } else if (ageFilter === "31to35") {
          matchesAge = age >= 31 && age <= 35;
        } else if (ageFilter === "over35") {
          matchesAge = age > 35;
        }
      } else if (ageFilter !== "all" && u.age === undefined) {
        matchesAge = false; // Filter explicitly requested age but user has no age
      }

      return (
        matchesSearch &&
        matchesCohort &&
        matchesVertical &&
        matchesSubject &&
        matchesGender &&
        matchesAge
      );
    });
  }, [
    facultyList,
    search,
    cohortFilter,
    verticalFilter,
    subjectFilter,
    genderFilter,
    ageFilter,
  ]);

  // Statistics counters
  const totalCount = filteredFaculty.length;
  const juneCount = filteredFaculty.filter(
    (u) => u.cohort && u.cohort.toLowerCase().includes("june")
  ).length;
  const marchCount = filteredFaculty.filter(
    (u) => u.cohort && u.cohort.toLowerCase().includes("march")
  ).length;

  return (
    <div className="mx-auto max-w-[1400px] w-full px-6 py-6 flex flex-col min-h-[calc(100vh-56px)]">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Faculty Archive
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Directory and filter board of all March and June cohort faculty members.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-border bg-bg-elev/50 px-4 py-1.5 text-xs text-fg-muted">
          <Users className="h-4 w-4" />
          <span className="font-semibold text-fg">{totalCount}</span> faculty members
          <span className="text-border-strong">|</span>
          <span className="text-emerald-500 font-semibold">{juneCount}</span> June
          <span className="text-border-strong">|</span>
          <span className="text-amber-500 font-semibold">{marchCount}</span> March
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-strong rounded-2xl p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-border bg-bg pl-10 pr-3 py-2 text-sm outline-none focus:border-fg/30 transition-colors"
            />
          </div>

          {/* Cohort Select */}
          <div>
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-fg/30 transition-colors"
            >
              <option value="all">All Cohorts</option>
              <option value="june eduskill">June Cohort</option>
              <option value="march eduskill">March Cohort</option>
            </select>
          </div>

          {/* Vertical Select */}
          <div>
            <select
              value={verticalFilter}
              onChange={(e) => setVerticalFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-fg/30 transition-colors"
            >
              <option value="all">All Verticals (Exam Target)</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Subject Filter */}
          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-fg/30 transition-colors"
            >
              <option value="all">All Teaching Subjects</option>
              {uniqueTeachingSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-fg/30 transition-colors"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Age Filter */}
          <div>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-fg/30 transition-colors"
            >
              <option value="all">All Ages</option>
              <option value="under25">Under 25 years</option>
              <option value="25to30">25 - 30 years</option>
              <option value="31to35">31 - 35 years</option>
              <option value="over35">Over 35 years</option>
            </select>
          </div>

          {/* Reset button */}
          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center gap-2 w-full md:w-auto md:ml-auto px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-bg-elev/40 hover:bg-bg-elev hover:border-border-strong transition-all"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Roster Cards Grid */}
      {usersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-2xl shimmer border border-border"
            />
          ))}
        </div>
      ) : filteredFaculty.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-elev/20 p-12 text-center min-h-[300px]">
          <Users className="h-10 w-10 text-fg-muted mb-3" />
          <h3 className="text-base font-semibold text-fg">No Faculty Members Found</h3>
          <p className="text-sm text-fg-muted mt-1 max-w-md">
            No archive profiles match your current search and filter selections. Try resetting the filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-fg text-bg hover:opacity-90 transition-opacity"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredFaculty.map((u) => {
              const initials = u.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const isJune = u.cohort?.toLowerCase().includes("june");

              return (
                <motion.div
                  key={u.userId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="glass flex flex-col justify-between rounded-2xl p-5 hover:border-border-strong transition-all group relative overflow-hidden"
                >
                  <div>
                    {/* Header info */}
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fg/20 to-fg/5 text-sm font-semibold tracking-wider text-fg border border-border/40">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-fg truncate group-hover:text-fg/90 transition-colors">
                          {u.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-fg-muted">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="my-4 border-t border-border/40" />

                    {/* Details Lists */}
                    <div className="space-y-2 text-xs">
                      {/* Cohort Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-fg-muted">Cohort:</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase",
                            isJune
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {isJune ? "June" : "March"}
                        </span>
                      </div>

                      {/* Vertical */}
                      <div className="flex items-center justify-between">
                        <span className="text-fg-muted">Vertical:</span>
                        <span className="font-medium text-fg max-w-[150px] truncate text-right">
                          {u.subjects && u.subjects.length > 0
                            ? u.subjects
                                .map((sid) => subjectsMap.get(sid) ?? sid)
                                .join(", ")
                            : "—"}
                        </span>
                      </div>

                      {/* Subject */}
                      <div className="flex items-center justify-between">
                        <span className="text-fg-muted">Subject:</span>
                        <span className="font-medium text-fg max-w-[150px] truncate text-right">
                          {u.teachingSubject || "—"}
                        </span>
                      </div>

                      {/* Age & Gender */}
                      <div className="flex items-center justify-between">
                        <span className="text-fg-muted">Age / Gender:</span>
                        <span className="font-medium text-fg text-right">
                          {u.age ? `${u.age} yrs` : "—"} / {u.gender || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5">
                    <Link
                      href={`/faculty?facultyId=${u.userId}`}
                      className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-fg text-bg py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Portfolio
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
