import { redirect } from "next/navigation";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { LoginForm } from "@/toss-shop/components/LoginForm";

export default async function TossShopLoginPage() {
  const session = await getTossShopSession();
  if (session) redirect("/toss-shop/dashboard");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <LoginForm />
    </div>
  );
}
