import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "EduSkill · EduSkill Program",
  description: "Adda247 — EduSkill Program Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read theme from cookie server-side → no flash, no inline script.
  const store = await cookies();
  const cookieTheme = store.get("eduskill_theme")?.value;
  const theme: "light" | "dark" =
    cookieTheme === "light" || cookieTheme === "dark" ? cookieTheme : "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg text-fg antialiased">
        <Providers initialTheme={theme}>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
