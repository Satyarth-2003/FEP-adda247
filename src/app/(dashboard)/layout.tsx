import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { GlobalUploadFab } from "@/components/GlobalUploadFab";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav userName={user.name} role={user.role} />
      <main className="flex-1">{children}</main>
      <GlobalUploadFab />
    </div>
  );
}
