import { redirect } from "next/navigation";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { LoginForm } from "@/toss-shop/components/LoginForm";

export default async function TossShopLoginPage() {
  const session = await getTossShopSession();
  if (session) redirect(SP_ROUTES.dashboard);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <LoginForm />
    </div>
  );
}
