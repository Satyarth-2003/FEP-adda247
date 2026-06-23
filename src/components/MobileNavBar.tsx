"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileNavBar() {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  return (
    <nav className="fixed inset-x-0 top-0 z-50 glass-strong md:hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={toggle}
          aria-label="Menu"
          className="p-2 text-fg-muted hover:text-fg"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="text-lg font-semibold">EduSkill</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-bg-elev/90 border-t border-border"
          >
            <ul className="flex flex-col p-4 space-y-2">
              <li>
                <Link href="/manager" className="block py-1 hover:underline">
                  Manager
                </Link>
              </li>
              <li>
                <Link href="/archive" className="block py-1 hover:underline">
                  Archive
                </Link>
              </li>
              <li>
                <Link href="/admin" className="block py-1 hover:underline">
                  Admin
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
