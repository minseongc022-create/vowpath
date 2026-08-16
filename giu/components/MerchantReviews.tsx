import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { listMerchantReviews } from "@/giu/lib/store";

type Props = {
  merchantId: string;
  locale: GiuLocale;
  limit?: number;
};

export async function MerchantReviews({ merchantId, locale, limit = 5 }: Props) {
  const reviews = await listMerchantReviews(merchantId, limit);
  if (reviews.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <h2 className="text-[15px] font-bold text-giu-ink">
        {t(locale, "reviews")} · {reviews.length}
      </h2>
      <ul className="space-y-2">
        {reviews.map((review) => (
          <li key={review.id} className="giu-card-flat p-3.5 ring-1 ring-giu-border">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-giu-gold" aria-label={`${review.rating}점`}>
                {"★".repeat(review.rating)}
                <span className="sr-only">{review.rating}/5</span>
              </p>
              <time className="text-[11px] text-giu-muted" dateTime={review.createdAt}>
                {new Date(review.createdAt).toLocaleDateString("ko-KR")}
              </time>
            </div>
            {review.comment ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-giu-ink">{review.comment}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
