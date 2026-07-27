import { redirect } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { NewQuoteForm } from "@/components/NewQuoteForm";
import { getSession } from "@/lib/auth";

export default async function NewQuotePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell shopName={session.shopName}>
      <NewQuoteForm />
    </AppShell>
  );
}
