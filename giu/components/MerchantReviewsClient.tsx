"use client";

import { useCallback, useEffect, useState } from "react";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuReview } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  merchantId: string;
};

export function MerchantReviewsClient({ locale, merchantId }: Props) {
  const [reviews, setReviews] = useState<GiuReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reviews?merchantId=${encodeURIComponent(merchantId)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { reviews: GiuReview[] };
      setReviews(data.reviews ?? []);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="giu-card space-y-3">
      <h2 className="text-[17px] font-bold text-giu-ink">{t(locale, "mReviewsTitle")}</h2>
      {loading ? (
        <p className="text-[13px] text-giu-muted">{t(locale, "loading")}</p>
      ) : reviews.length === 0 ? (
        <p className="text-[13px] text-giu-muted">{t(locale, "mReviewsEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {reviews.slice(0, 10).map((review) => (
            <li key={review.id} className="rounded-[14px] bg-giu-bg p-3 ring-1 ring-giu-border">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-giu-gold">{"★".repeat(review.rating)}</p>
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
      )}
    </section>
  );
}
