"use client";

import { useRef, useState } from "react";
import { GiuBottomSheet } from "@/giu/components/GiuBottomSheet";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  value: string;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
};

export function ProductPhotoPicker({ locale, value, onChange, onError }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/giu/product-images", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        onError?.(data.error ?? t(locale, "mPhotoUploadFail"));
        return;
      }
      hapticConfirm();
      onChange(data.url);
    } catch {
      onError?.(t(locale, "mLoadError"));
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function openCamera() {
    hapticSelect();
    setSheetOpen(false);
    cameraRef.current?.click();
  }

  function openLibrary() {
    hapticSelect();
    setSheetOpen(false);
    libraryRef.current?.click();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (uploading) return;
          hapticSelect();
          setSheetOpen(true);
        }}
        disabled={uploading}
        className="giu-input flex w-full items-center gap-3 text-left !py-2.5"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-giu-bg text-2xl ring-1 ring-giu-border">
            📷
          </span>
        )}
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-giu-muted">
          {uploading ? t(locale, "mPhotoUploading") : value ? t(locale, "mPhotoChange") : t(locale, "mPhotoPick")}
        </span>
      </button>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <GiuBottomSheet
        open={sheetOpen}
        onClose={() => {
          hapticSelect();
          setSheetOpen(false);
        }}
        dismissLabel={t(locale, "mCloseSheet")}
        ariaLabelledBy="giu-photo-sheet-title"
      >
        <div className="giu-panel-enter space-y-2">
          <h3 id="giu-photo-sheet-title" className="text-[17px] font-bold text-giu-ink">
            {t(locale, "mPhotoSheetTitle")}
          </h3>
          <button
            type="button"
            onClick={openCamera}
            className="giu-btn-secondary giu-btn-3d w-full !py-3.5 text-[15px]"
          >
            {t(locale, "mPhotoTake")}
          </button>
          <button
            type="button"
            onClick={openLibrary}
            className="giu-btn-secondary giu-btn-3d w-full !py-3.5 text-[15px]"
          >
            {t(locale, "mPhotoLibrary")}
          </button>
        </div>
      </GiuBottomSheet>
    </>
  );
}
