"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  Archive,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface TopNavProps {
  userName: string;
  role: "fep_faculty" | "fep_manager" | "fep_admin";
}

export function TopNav({ userName, role }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const dashHref = role === "fep_admin" ? "/admin" : role === "fep_manager" ? "/manager" : "/faculty";

  const navItems = [
    { href: dashHref, label: "Dashboard", icon: LayoutDashboard },
    { href: "/archive", label: "Program Archive", icon: Archive },
    ...(role === "fep_admin" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <Logo />
          <div className="hidden md:flex items-center gap-1.5 rounded-full border border-border bg-bg-elev/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-ring text-emerald-500" />
            {role === "fep_manager" ? "Manager" : "Faculty"}
          </div>

          <nav className="flex items-center gap-1 ml-2">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href === dashHref && pathname.startsWith(dashHref));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "text-fg"
                      : "text-fg-muted hover:text-fg/80"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 -z-10 rounded-full border border-border bg-bg-elev/70"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="group flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-elev/50 text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "dark" ? (
                <motion.span
                  key="moon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="h-3.5 w-3.5" />
                </motion.span>
              ) : (
                <motion.span
                  key="sun"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="h-3.5 w-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-bg-elev/50 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-fg/30 to-fg/5">
              <UserIcon className="h-3 w-3 text-fg" />
            </div>
            <span className="text-xs font-medium text-fg max-w-[120px] truncate">
              {userName}
            </span>
          </div>

          <button
            onClick={logout}
            className="group flex h-8 items-center gap-1.5 rounded-full border border-border bg-bg-elev/50 px-3 text-xs text-fg-muted transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500"
          >
            <LogOut className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}
