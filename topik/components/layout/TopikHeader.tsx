import Link from "next/link";
import { TOPIK_BRAND } from "@/topik/lib/brand";

export function TopikHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--topik-border)] bg-[var(--topik-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
        <Link href="/topik" prefetch className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl topik-gradient-header text-xs font-black text-white shadow-[var(--topik-shadow-sm)]">
            H
          </span>
          <span className="text-sm font-extrabold tracking-tight text-[var(--topik-ink)]">
            {TOPIK_BRAND.name}
          </span>
        </Link>
        {title && (
          <span className="max-w-[45%] truncate text-xs font-semibold text-[var(--topik-ink-muted)]">
            {title}
          </span>
        )}
      </div>
    </header>
  );
}
