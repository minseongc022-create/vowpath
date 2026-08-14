import { GiuAuthProvider } from "@/giu/components/GiuAuthProvider";
import { GiuShell } from "@/giu/components/GiuShell";

export default function GiuLayout({ children }: { children: React.ReactNode }) {
  return (
    <GiuAuthProvider>
      <GiuShell>{children}</GiuShell>
    </GiuAuthProvider>
  );
}
