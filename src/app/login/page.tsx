"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { Loader2, ArrowRight } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google sign-in failed");
      const dest = data.user.role === "eduskill_admin" || data.user.role === "eduskill_manager" ? "/manager" : "/faculty";
      router.replace(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!googleClientId) return;
    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCallback,
        auto_select: false,
      });
      const container = document.getElementById("google-signin-btn");
      if (container) {
        window.google?.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: "100%",
          text: "signin_with",
          shape: "pill",
          logo_alignment: "center",
        });
      }
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [googleClientId, handleGoogleCallback]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      const dest = data.user.role === "eduskill_admin" || data.user.role === "eduskill_manager" ? "/manager" : "/faculty";
      router.replace(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px]"
      >
        <div className="mb-10 flex justify-center">
          <Logo className="scale-125" />
        </div>

        <div className="glass-strong rounded-2xl p-8">
          <div className="mb-7">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-semibold tracking-tight"
            >
              Welcome back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-1 text-sm text-fg-muted"
            >
              Sign in to your EduSkill Program account.
            </motion.p>
          </div>

          {/* Google Sign-In */}
          {googleClientId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-5"
            >
              {googleLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-full border border-border bg-bg-elev/60 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
                  <span className="text-sm text-fg-muted">Signing in with Google...</span>
                </div>
              ) : (
                <div id="google-signin-btn" className="flex justify-center" />
              )}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] uppercase tracking-wider text-fg-muted">or use email</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </motion.div>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="w-full rounded-lg border border-border bg-bg-elev/60 px-3.5 py-2.5 text-sm text-fg outline-none transition-all focus:border-fg/30 focus:bg-bg-elev focus:ring-2 focus:ring-fg/5"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="fep123"
                className="w-full rounded-lg border border-border bg-bg-elev/60 px-3.5 py-2.5 text-sm text-fg outline-none transition-all focus:border-fg/30 focus:bg-bg-elev focus:ring-2 focus:ring-fg/5"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-fg px-4 py-2.5 text-sm font-medium text-bg transition-all hover:bg-fg/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
