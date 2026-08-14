import type { Metadata } from "next";
import { SalesPlaybookClient } from "@/giu/components/SalesPlaybookClient";
import { resolveGiuPublicOrigin } from "@/giu/lib/giu-host-server";
import { buildZaloTemplates } from "@/giu/lib/sales-templates";

export const metadata: Metadata = {
  title: "Bộ công cụ bán hàng",
  robots: { index: false, follow: false },
};

export default async function GiuSalesPage() {
  const origin = await resolveGiuPublicOrigin();
  const templates = buildZaloTemplates(origin);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-giu-accent">
        Nội bộ · Sales kit
      </p>
      <h1 className="mt-2 text-3xl font-bold text-giu-ink">Bán hàng Giu — Tuần 1</h1>
      <p className="mt-2 text-giu-muted">
        Zalo, Maps, link — copy &amp; gửi. Mục tiêu: 10 quán Quận 1 / 3 / 7.
      </p>
      <div className="mt-10">
        <SalesPlaybookClient origin={origin} templates={templates} />
      </div>
    </div>
  );
}
