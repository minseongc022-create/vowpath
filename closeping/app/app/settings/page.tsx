import { redirect } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { getSession, clearSessionCookie } from "@/lib/auth";
import { SITE } from "@/lib/types";

async function signOut() {
  "use server";
  await clearSessionCookie();
  redirect("/");
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell shopName={session.shopName}>
      <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
      <div className="glass chrome-border mt-6 space-y-4 rounded-2xl p-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-500">Shop name</p>
          <p className="mt-1 text-white">{session.shopName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-500">Email</p>
          <p className="mt-1 text-white">{session.email}</p>
        </div>
        <p className="text-ink-500">
          {SITE.name} is a standalone product with its own accounts — completely separate from
          Effiroad.
        </p>
        <form action={signOut}>
          <button type="submit" className="btn-ghost">
            Sign out
          </button>
        </form>
      </div>
    </AppShell>
  );
}
