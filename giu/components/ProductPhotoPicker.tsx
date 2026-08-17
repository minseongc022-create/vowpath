"use client";

import { useRef, useState } from "react";
import { GiuBottomSheet } from "@/giu/components/GiuBottomSheet";
import { MAX_BOX_IMAGES } from "@/giu/lib/box-images";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  value: string[];
  onChange: (urls: string[]) => void;
  onError?: (message: string) => void;
  max?: number;
};

export function ProductPhotoPicker({
  locale,
  value,
  onChange,
  onError,
  max = MAX_BOX_IMAGES,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const remaining = max - value.length;
  const canAdd = remaining > 0 && !uploading;

  async function uploadFile(file: File): Promise<string | null> {
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
      return null;
    }
    return data.url;
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, remaining);
    if (!list.length) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const url = await uploadFile(file);
        if (url) uploaded.push(url);
      }
      if (uploaded.length) {
        hapticConfirm();
        onChange([...value, ...uploaded].slice(0, max));
      }
    } catch {
      onError?.(t(locale, "mLoadError"));
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (files?.length) void uploadFiles(files);
  }

  function openPicker() {
    if (!canAdd) return;
    hapticSelect();
    setSheetOpen(true);
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

  function removeAt(index: number) {
    hapticSelect();
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <>
      <div className="space-y-2">
        {value.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {value.map((url, index) => (
              <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-giu-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-giu-ink/80 text-[11px] font-bold text-white"
                  aria-label={t(locale, "mPhotoRemove")}
                >
                  ×
                </button>
              </div>
            ))}
            {canAdd ? (
              <button
                type="button"
                onClick={openPicker}
                className="flex aspect-square flex-col items-center justify-center rounded-xl bg-giu-bg text-center ring-1 ring-giu-border"
              >
                <span className="text-xl">+</span>
                <span className="mt-0.5 text-[10px] font-bold text-giu-muted">{remaining}</span>
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            disabled={!canAdd}
            className="giu-input flex w-full items-center gap-3 text-left !py-2.5"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-giu-bg text-2xl ring-1 ring-giu-border">
              📷
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-giu-muted">
              {uploading ? t(locale, "mPhotoUploading") : t(locale, "mPhotoPick")}
            </span>
          </button>
        )}

        <p className="text-[11px] font-semibold text-giu-muted">
          {uploading
            ? t(locale, "mPhotoUploading")
            : t(locale, "mPhotoCount").replace("{count}", String(value.length)).replace("{max}", String(max))}
        </p>
      </div>

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
        multiple={remaining > 1}
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
          <p className="text-[12px] font-semibold text-giu-muted">
            {t(locale, "mPhotoCount").replace("{count}", String(value.length)).replace("{max}", String(max))}
          </p>
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
