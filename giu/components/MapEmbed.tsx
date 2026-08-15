"use client";

import { googleMapsEmbedUrl, googleMapsSearchUrl } from "@/giu/lib/links";

type Props = {
  address: string;
  className?: string;
};

export function MapEmbed({ address, className = "" }: Props) {
  const embed = googleMapsEmbedUrl(address);
  const open = googleMapsSearchUrl(address);

  return (
    <div className={`overflow-hidden rounded-2xl ring-1 ring-giu-border ${className}`}>
      <iframe
        title={address}
        src={embed}
        className="h-48 w-full border-0 bg-giu-bg"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a
        href={open}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-giu-surface px-3 py-2 text-center text-xs font-semibold text-giu-primary"
      >
        {address} →
      </a>
    </div>
  );
}
