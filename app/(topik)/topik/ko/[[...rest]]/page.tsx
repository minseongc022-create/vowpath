import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TOPIK_LOCALE_COOKIE } from "@/topik/lib/i18n/request-locale";

type Props = {
  params: Promise<{ rest?: string[] }>;
};

/** Sets Korean UI cookie and redirects to the matching /topik path */
export default async function TopikKoEntryPage({ params }: Props) {
  const { rest } = await params;
  const store = await cookies();
  store.set(TOPIK_LOCALE_COOKIE, "ko", {
    path: "/topik",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const suffix = rest?.length ? `/${rest.join("/")}` : "";
  redirect(`/topik${suffix}`);
}
