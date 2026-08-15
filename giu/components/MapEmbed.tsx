"use client";

import { googleMapsEmbedUrl, googleMapsSearchUrl } from "@/giu/lib/links";
import { DirectionsFromHereButton } from "./DirectionsFromHereButton";
import { useGiuLocale } from "./GiuLocaleProvider";
import { t } from "@/giu/lib/i18n";

type Props = {
  address: string;
  /** Store coordinates — enables directions from current location */
  destLat?: number;
  destLng?: number;
  className?: string;
  compact?: boolean;
};

export function MapEmbed({
  address,
  destLat,
  destLng,
  className = "",
  compact = false,
}: Props) {
  const { locale } = useGiuLocale();
  const embed = googleMapsEmbedUrl(address);
  const open = googleMapsSearchUrl(address);
  const hasCoords =
    typeof destLat === "number" &&
    typeof destLng === "number" &&
    Number.isFinite(destLat) &&
    Number.isFinite(destLng);

  return (
    <div className={`overflow-hidden rounded-[16px] ring-1 ring-giu-border ${className}`}>
      <iframe
        title={address}
        src={embed}
        className={`w-full border-0 bg-giu-bg ${compact ? "h-36" : "h-48"}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="space-y-2 bg-white px-3 py-2.5">
        <a
          href={open}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[11px] font-bold text-giu-primary"
        >
          {address}
        </a>
        {hasCoords ? (
          <DirectionsFromHereButton
            destination={{ lat: destLat, lng: destLng }}
            destinationAddress={address}
            primary
          />
        ) : (
          <a
            href={open}
            target="_blank"
            rel="noopener noreferrer"
            className="giu-btn-secondary block w-full !py-2.5 text-center text-[12px]"
          >
            {t(locale, "maps")}
          </a>
        )}
      </div>
    </div>
  );
}
