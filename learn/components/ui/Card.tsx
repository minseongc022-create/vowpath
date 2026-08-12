import { cn } from "@/learn/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
};

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-learn-surface border border-learn-border/60 shadow-learn-sm",
        hover && "transition-shadow hover:shadow-learn-md cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
