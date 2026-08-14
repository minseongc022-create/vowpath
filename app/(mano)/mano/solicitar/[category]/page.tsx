import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestForm } from "@/mano/components/RequestForm";
import { getCategory, isManoServiceCategory } from "@/mano/lib/categories";

type Props = { params: Promise<{ category: string }> };

export default async function SolicitarCategoryPage({ params }: Props) {
  const { category: slug } = await params;
  if (!isManoServiceCategory(slug)) notFound();
  const cat = getCategory(slug);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/mano/solicitar" className="text-sm font-medium text-mano-primary">
        ← Todas las categorías
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-mano-ink">
        {cat.icon} {cat.name}
      </h1>
      <p className="mt-2 text-sm text-mano-muted">{cat.description}</p>
      <div className="mt-8">
        <RequestForm defaultCategory={slug} />
      </div>
    </div>
  );
}
