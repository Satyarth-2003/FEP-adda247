import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "FEP · Faculty Excellence Program",
  description: "Adda247 — Faculty Excellence Program Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read theme from cookie server-side → no flash, no inline script.
  const store = await cookies();
  const cookieTheme = store.get("fep_theme")?.value;
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
      </body>
    </html>
  );
}
