import Link from "next/link";
import { MANO_CATEGORIES } from "@/mano/lib/categories";

export function CategoryGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
      {MANO_CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/mano/solicitar/${cat.id}`}
          className="group rounded-2xl border border-mano-border bg-white p-4 shadow-sm transition hover:border-mano-primary/40 hover:shadow-md"
        >
          <span className="text-2xl">{cat.icon}</span>
          <h3 className="mt-2 font-semibold text-mano-ink group-hover:text-mano-primary">
            {cat.nameShort}
          </h3>
          {!compact && (
            <>
              <p className="mt-1 text-sm text-mano-muted line-clamp-2">{cat.description}</p>
              <p className="mt-2 text-xs font-medium text-mano-primary">{cat.avgPriceMxn}</p>
            </>
          )}
        </Link>
      ))}
    </div>
  );
}
