import { headers } from "next/headers";
import { GiuAuthProvider } from "@/giu/components/GiuAuthProvider";
import { GiuHapticsRoot } from "@/giu/components/GiuHapticsRoot";
import { GiuLocaleProvider } from "@/giu/components/GiuLocaleProvider";
import { GiuNavProvider } from "@/giu/components/GiuNavProvider";
import { GiuShell } from "@/giu/components/GiuShell";
import { isGiuHostName } from "@/giu/lib/routes";

export default async function GiuLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const publicPaths = isGiuHostName(host);

  return (
    <GiuLocaleProvider>
      <GiuAuthProvider>
        <GiuNavProvider publicPaths={publicPaths}>
          <GiuHapticsRoot>
            <GiuShell>{children}</GiuShell>
          </GiuHapticsRoot>
        </GiuNavProvider>
      </GiuAuthProvider>
    </GiuLocaleProvider>
  );
}
