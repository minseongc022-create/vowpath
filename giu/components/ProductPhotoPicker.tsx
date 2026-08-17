"use client";

import { useRef, useState } from "react";
import { GiuBottomSheet } from "@/giu/components/GiuBottomSheet";
import { MAX_BOX_IMAGES } from "@/giu/lib/box-images";
import { hapticConfirm } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  value: string[];
  onChange: (urls: string[]) => void;
  onError?: (message: string) => void;
  max?: number;
};

function isBlobPreview(url: string): boolean {
  return url.startsWith("blob:");
}

export function ProductPhotoPicker({
  locale,
  value,
  onChange,
  onError,
  max = MAX_BOX_IMAGES,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const remaining = max - value.length;
  const canAdd = remaining > 0 && !uploading;

  async function uploadFile(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file, file.name || "photo.jpg");
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

    const previews = list.map((file) => URL.createObjectURL(file));
    const nextValue = [...value, ...previews].slice(0, max);
    onChange(nextValue);
    setUploading(true);
    setPendingCount(list.length);

    try {
      const results = await Promise.all(list.map((file) => uploadFile(file)));
      const uploaded = results.filter((url): url is string => Boolean(url));
      if (uploaded.length) {
        hapticConfirm();
      }
      let uploadIdx = 0;
      const merged = nextValue
        .map((url) => {
          if (previews.includes(url)) {
            const server = uploaded[uploadIdx];
            uploadIdx += 1;
            return server ?? null;
          }
          return url;
        })
        .filter((url): url is string => Boolean(url));
      onChange(merged.slice(0, max));
      previews.forEach((url) => URL.revokeObjectURL(url));
      if (!uploaded.length) {
        onError?.(t(locale, "mPhotoUploadFail"));
      }
    } catch {
      onError?.(t(locale, "mLoadError"));
      onChange(value.filter((url) => !previews.some((p) => p === url)));
      previews.forEach((url) => URL.revokeObjectURL(url));
    } finally {
      setUploading(false);
      setPendingCount(0);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) {
      setUploading(false);
      return;
    }
    void uploadFiles(files);
  }

  function openPicker() {
    if (!canAdd) return;
    setSheetOpen(true);
  }

  function openCamera() {
    setSheetOpen(false);
    window.requestAnimationFrame(() => cameraRef.current?.click());
  }

  function openLibrary() {
    setSheetOpen(false);
    window.requestAnimationFrame(() => libraryRef.current?.click());
  }

  function removeAt(index: number) {
    const url = value[index];
    if (url && isBlobPreview(url)) URL.revokeObjectURL(url);
    onChange(value.filter((_, i) => i !== index));
  }

  const busyLabel =
    uploading && pendingCount > 0
      ? t(locale, "mPhotoUploading")
      : uploading
        ? t(locale, "mPhotoUploading")
        : t(locale, "mPhotoPick");

  return (
    <>
      <div className="space-y-2">
        {value.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {value.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-giu-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className={`h-full w-full object-cover ${isBlobPreview(url) ? "opacity-80" : ""}`}
                />
                {isBlobPreview(url) ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-giu-ink/20 text-[10px] font-bold text-white">
                    …
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  disabled={uploading && isBlobPreview(url)}
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
                className="flex aspect-square flex-col items-center justify-center rounded-xl bg-giu-bg text-center ring-1 ring-giu-border active:scale-[0.97]"
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
            className="giu-input flex w-full items-center gap-3 text-left !py-2.5 active:scale-[0.99]"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-giu-bg text-2xl ring-1 ring-giu-border">
              {uploading ? "…" : "📷"}
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-giu-muted">{busyLabel}</span>
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
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple={remaining > 1}
        className="hidden"
        onChange={handleFileChange}
      />

      <GiuBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
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
