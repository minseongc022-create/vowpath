import { type ReactNode } from "react";

export type AppPageWidth = "default" | "wide" | "narrow" | "fluid" | "full";

type AppPageProps = {
  children: ReactNode;
  className?: string;
  width?: AppPageWidth;
  as?: "div" | "section" | "main";
};

const WIDTH_CLASS: Record<AppPageWidth, string> = {
  default: "vow-app-page",
  wide: "vow-app-page vow-app-page--wide",
  narrow: "vow-app-page vow-app-page--narrow",
  fluid: "vow-app-page vow-app-page--fluid",
  full: "w-full max-w-none",
};

/** Max-width wrapper for app pages (dashboard, settings, intake). Horizontal padding lives on the shell. */
export function AppPage({
  children,
  className = "",
  width = "default",
  as: Tag = "div",
}: AppPageProps) {
  return <Tag className={`${WIDTH_CLASS[width]} ${className}`.trim()}>{children}</Tag>;
}
