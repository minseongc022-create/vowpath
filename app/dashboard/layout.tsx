import { DashboardShellClient } from "@/components/dashboard/DashboardShellClient";

/** Sync layout so the shell renders immediately — shop name loads client-side. */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShellClient>{children}</DashboardShellClient>;
}
