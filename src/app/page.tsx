import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "fep_admin") redirect("/admin");
  redirect(user.role === "fep_manager" ? "/manager" : "/faculty");
}
