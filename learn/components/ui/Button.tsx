import { cn } from "@/learn/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "social";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "bg-learn-primary text-white shadow-learn-sm hover:bg-learn-primary-hover active:scale-[0.98]",
  secondary:
    "bg-learn-surface text-learn-ink border border-learn-border hover:bg-learn-muted active:scale-[0.98]",
  ghost: "text-learn-ink-muted hover:bg-learn-muted hover:text-learn-ink",
  social:
    "bg-white text-learn-ink border border-learn-border shadow-learn-sm hover:bg-learn-muted active:scale-[0.98]",
};

const sizes = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
  md: "h-11 px-4 text-sm rounded-xl gap-2",
  lg: "h-13 px-6 text-base rounded-2xl gap-2.5 min-h-[52px]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
