import { ManoShell } from "@/mano/components/ManoShell";

export default function ManoLayout({ children }: { children: React.ReactNode }) {
  return <ManoShell>{children}</ManoShell>;
}
