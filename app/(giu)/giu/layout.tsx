import { GiuAuthProvider } from "@/giu/components/GiuAuthProvider";
import { GiuHapticsRoot } from "@/giu/components/GiuHapticsRoot";
import { GiuLocaleProvider } from "@/giu/components/GiuLocaleProvider";
import { GiuShell } from "@/giu/components/GiuShell";

export default function GiuLayout({ children }: { children: React.ReactNode }) {
  return (
    <GiuLocaleProvider>
      <GiuAuthProvider>
        <GiuHapticsRoot>
          <GiuShell>{children}</GiuShell>
        </GiuHapticsRoot>
      </GiuAuthProvider>
    </GiuLocaleProvider>
  );
}
