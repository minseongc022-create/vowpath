import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default async function SettingsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") q.set(key, value);
    else if (Array.isArray(value) && value[0]) q.set(key, value[0]);
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`${ROUTES.settings}${suffix}`);
}
