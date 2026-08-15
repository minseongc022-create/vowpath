"use client";

import { googleMapsEmbedUrl, googleMapsSearchUrl } from "@/giu/lib/links";

type Props = {
  address: string;
  className?: string;
  compact?: boolean;
};

export function MapEmbed({ address, className = "", compact = false }: Props) {
  const embed = googleMapsEmbedUrl(address);
  const open = googleMapsSearchUrl(address);

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
      <a
        href={open}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white px-3 py-2 text-center text-[11px] font-bold text-giu-primary"
      >
        {address}
      </a>
    </div>
  );
}
