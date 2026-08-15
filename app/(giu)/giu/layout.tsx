import { GiuAuthProvider } from "@/giu/components/GiuAuthProvider";
import { GiuLocaleProvider } from "@/giu/components/GiuLocaleProvider";
import { GiuShell } from "@/giu/components/GiuShell";

export default function GiuLayout({ children }: { children: React.ReactNode }) {
  return (
    <GiuLocaleProvider>
      <GiuAuthProvider>
        <GiuShell>{children}</GiuShell>
      </GiuAuthProvider>
    </GiuLocaleProvider>
  );
}
