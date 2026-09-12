import { redirect } from "next/navigation";
import { AuthForm } from "@/vibesafe/components/AuthForm";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "로그인" };
export const dynamic = "force-dynamic";

export default async function VibesafeLoginPage() {
  if (await getSession()) redirect("/vibesafe/dashboard");
  return <AuthForm mode="login" />;
}
