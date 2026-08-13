import Link from "next/link";
import { TOPIK_BRAND } from "@/topik/lib/brand";

export function TopikHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-learn-border bg-learn-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
        <Link href="/topik" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-learn-primary text-xs font-black text-white">
            T
          </span>
          <span className="text-sm font-bold text-learn-ink">{TOPIK_BRAND.name}</span>
        </Link>
        {title && <span className="text-xs font-medium text-learn-ink-muted truncate max-w-[40%]">{title}</span>}
      </div>
    </header>
  );
}
