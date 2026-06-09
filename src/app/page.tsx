import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "fep_admin" || user.role === "fep_manager") redirect("/manager");
  redirect("/faculty");
}
