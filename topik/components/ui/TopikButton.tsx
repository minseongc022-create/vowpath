import Link from "next/link";
import { cn } from "@/learn/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "topik-btn-primary",
  secondary: "topik-btn-secondary",
  outline: "topik-btn-outline",
  ghost: "topik-btn-ghost",
  accent: "topik-btn-accent",
};

const sizeClass: Record<Size, string> = {
  sm: "topik-btn-sm",
  md: "topik-btn-md",
  lg: "topik-btn-lg",
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function TopikButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("topik-btn", variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function TopikButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: BaseProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn("topik-btn", variantClass[variant], sizeClass[size], className)}
    >
      {children}
    </Link>
  );
}
