"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleCallback = useCallback(
    async (response: { credential: string }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google sign-in failed");
        const dest =
          data.user.role === "eduskill_admin" ||
          data.user.role === "eduskill_manager"
            ? "/manager"
            : "/faculty";
        router.replace(dest);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed");
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!googleClientId) return;

    function initGoogle() {
      window.google?.accounts.id.initialize({
        client_id: googleClientId!,
        callback: handleGoogleCallback,
        auto_select: false,
        use_fedcm_for_prompt: false,
      });
      const container = document.getElementById("google-signin-btn");
      if (container) {
        window.google?.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: container.offsetWidth || 340,
          text: "signin_with",
          shape: "pill",
          logo_alignment: "center",
        });
      }
      setScriptReady(true);
    }

    // If script already loaded (e.g. hot-reload)
    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", initGoogle);
      return () => existing.removeEventListener("load", initGoogle);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    script.onerror = () =>
      setError("Failed to load Google Sign-In. Please refresh the page.");
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [googleClientId, handleGoogleCallback]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 bg-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Logo className="scale-125" />
        </div>

        <div className="glass-strong rounded-2xl p-8">
          {/* Heading */}
          <div className="mb-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-semibold tracking-tight"
            >
              Welcome back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-1.5 text-sm text-fg-muted"
            >
              Sign in with your Google account to continue.
            </motion.p>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400 leading-relaxed"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Sign-In area */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
                <span className="text-sm text-fg-muted">Signing you in…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                {/* Rendered Google button */}
                <div
                  id="google-signin-btn"
                  className="flex justify-center w-full min-h-[44px]"
                />
                {!scriptReady && !error && (
                  <div className="flex items-center gap-2 text-xs text-fg-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading Google Sign-In…
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Help text */}
          <p className="mt-8 text-center text-[11px] text-fg-dim leading-relaxed">
            Access is restricted to registered EduSkill faculty, managers, and
            admins.
            <br />
            Contact your program manager if you can&apos;t sign in.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
