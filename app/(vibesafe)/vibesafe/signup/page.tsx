import { redirect } from "next/navigation";
import { AuthForm } from "@/vibesafe/components/AuthForm";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "가입하기" };
export const dynamic = "force-dynamic";

export default async function VibesafeSignupPage() {
  if (await getSession()) redirect("/vibesafe/dashboard");
  return <AuthForm mode="signup" />;
}
