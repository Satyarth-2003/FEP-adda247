"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { VideoUploader } from "./VideoUploader";
import type { Subject, JWTPayload } from "@/types";

export function GlobalUploadFab() {
  const [showUploader, setShowUploader] = useState(false);

  const meQ = useQuery<{ user: JWTPayload | null }>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then(r => r.json()),
  });

  const subjectsQ = useQuery<{ subjects: Subject[] }>({
    queryKey: ["subjects"],
    queryFn: () => fetch("/api/subjects").then(r => r.json()),
  });

  const usersQ = useQuery<{ users: { userId: string; name: string }[] }>({
    queryKey: ["admin-users-fab"],
    queryFn: () => fetch("/api/users").then(r => {
      if (!r.ok) return { users: [] };
      return r.json();
    }),
    enabled: meQ.data?.user?.role === "fep_manager" || meQ.data?.user?.role === "fep_admin",
  });

  const role = meQ.data?.user?.role;
  const isManagerOrAdmin = role === "fep_manager" || role === "fep_admin";

  if (!isManagerOrAdmin) return null;

  const subjects = subjectsQ.data?.subjects ?? [];
  const facultyList = (usersQ.data?.users ?? []).map(u => ({ userId: u.userId, name: u.name }));

  return (
    <>
      {/* FAB button */}
      <motion.button
        onClick={() => setShowUploader(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-fg text-bg shadow-lg shadow-black/20 transition-colors hover:bg-fg/90"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
      >
        <AnimatePresence mode="wait">
          {showUploader ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Plus className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Reuse VideoUploader in headless mode (auto-open) */}
      {showUploader && subjects.length > 0 && (
        <InlineUploader
          subjects={subjects}
          facultyList={facultyList}
          onClose={() => setShowUploader(false)}
        />
      )}
    </>
  );
}

function InlineUploader({
  subjects,
  facultyList,
  onClose,
}: {
  subjects: Subject[];
  facultyList: { userId: string; name: string }[];
  onClose: () => void;
}) {
  return (
    <VideoUploader
      subjects={subjects}
      onSuccess={onClose}
      managerMode
      facultyList={facultyList}
      autoOpen
      onClose={onClose}
    />
  );
}
