import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    const user = verifyToken(token);
    if (user) {
      if (user.role === "admin") redirect("/admin");
      else redirect("/dashboard");
    }
  }

  redirect("/login");
}
