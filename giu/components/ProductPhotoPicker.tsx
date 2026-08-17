"use client";

import { useId, useState, type ReactNode } from "react";
import { prepareImageForUpload } from "@/giu/lib/compress-image-client";
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

/** iOS Safari requires a visible, label-linked file input — not sr-only + programmatic click. */
function IosFilePickLabel({
  id,
  accept,
  capture,
  multiple,
  disabled,
  className,
  onFiles,
  children,
}: {
  id: string;
  accept: string;
  capture?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  onFiles: (files: FileList) => void;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={disabled ? undefined : id}
      className={`relative block touch-manipulation ${disabled ? "pointer-events-none opacity-50" : ""} ${className ?? ""}`}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        multiple={multiple}
        disabled={disabled}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-[0.01]"
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) onFiles(files);
          e.target.value = "";
        }}
      />
      {children}
    </label>
  );
}

export function ProductPhotoPicker({
  locale,
  value,
  onChange,
  onError,
  max = MAX_BOX_IMAGES,
}: Props) {
  const cameraId = useId();
  const libraryId = useId();
  const quickPickId = useId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [localError, setLocalError] = useState("");
  const remaining = max - value.length;
  const canAdd = remaining > 0 && !uploading;
  const acceptTypes = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

  async function uploadFile(file: File): Promise<string | null> {
    if (!file.size) {
      setLocalError(t(locale, "mPhotoUploadFail"));
      onError?.(t(locale, "mPhotoUploadFail"));
      return null;
    }

    let prepared: File;
    try {
      prepared = await prepareImageForUpload(file);
    } catch {
      setLocalError(t(locale, "mPhotoHeicFail"));
      onError?.(t(locale, "mPhotoHeicFail"));
      return null;
    }

    if (prepared.type !== "image/jpeg") {
      setLocalError(t(locale, "mPhotoUploadFail"));
      onError?.(t(locale, "mPhotoUploadFail"));
      return null;
    }

    const form = new FormData();
    form.append("file", prepared, prepared.name || "photo.jpg");

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch("/api/giu/product-images", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        setLocalError("");
        return data.url;
      }
      if (attempt === 0 && res.status >= 500) continue;
      const msg = data.error ?? t(locale, "mPhotoUploadFail");
      setLocalError(msg);
      onError?.(msg);
      return null;
    }

    setLocalError(t(locale, "mPhotoUploadFail"));
    onError?.(t(locale, "mPhotoUploadFail"));
    return null;
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, remaining);
    if (!list.length) return;

    setSheetOpen(false);
    setLocalError("");

    const previews = list.map((file) => URL.createObjectURL(file));
    const nextValue = [...value, ...previews].slice(0, max);
    onChange(nextValue);
    setUploading(true);
    setPendingCount(list.length);

    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const url = await uploadFile(file);
        if (url) uploaded.push(url);
      }
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
        onChange(value.filter((url) => !previews.some((p) => p === url)));
      }
    } catch {
      setLocalError(t(locale, "mLoadError"));
      onError?.(t(locale, "mLoadError"));
      onChange(value.filter((url) => !previews.some((p) => p === url)));
      previews.forEach((url) => URL.revokeObjectURL(url));
    } finally {
      setUploading(false);
      setPendingCount(0);
    }
  }

  const busyLabel =
    uploading && pendingCount > 0
      ? t(locale, "mPhotoUploading")
      : uploading
        ? t(locale, "mPhotoUploading")
        : t(locale, "mPhotoPick");

  function removeAt(index: number) {
    const url = value[index];
    if (url && isBlobPreview(url)) URL.revokeObjectURL(url);
    onChange(value.filter((_, i) => i !== index));
  }

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
                  className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-giu-ink/80 text-[11px] font-bold text-white"
                  aria-label={t(locale, "mPhotoRemove")}
                >
                  ×
                </button>
              </div>
            ))}
            {canAdd ? (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex aspect-square flex-col items-center justify-center rounded-xl bg-giu-bg text-center ring-1 ring-giu-border active:scale-[0.97]"
              >
                <span className="text-xl">+</span>
                <span className="mt-0.5 text-[10px] font-bold text-giu-muted">{remaining}</span>
              </button>
            ) : null}
          </div>
        ) : (
          <IosFilePickLabel
            id={quickPickId}
            accept={acceptTypes}
            disabled={!canAdd}
            className="block"
            onFiles={(files) => void uploadFiles(files)}
          >
            <span className="giu-input flex w-full items-center gap-3 text-left !py-2.5 active:scale-[0.99]">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-giu-bg text-2xl ring-1 ring-giu-border">
                {uploading ? "…" : "📷"}
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-semibold text-giu-muted">{busyLabel}</span>
            </span>
          </IosFilePickLabel>
        )}

        <p className="text-[11px] font-semibold text-giu-muted">
          {uploading
            ? t(locale, "mPhotoUploading")
            : t(locale, "mPhotoCount").replace("{count}", String(value.length)).replace("{max}", String(max))}
        </p>
        {localError ? <p className="text-[12px] font-semibold text-giu-danger">{localError}</p> : null}
      </div>

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
          <IosFilePickLabel
            id={cameraId}
            accept={acceptTypes}
            capture
            disabled={!canAdd}
            className="giu-btn-secondary giu-btn-3d w-full !py-3.5 text-center text-[15px] font-bold"
            onFiles={(files) => void uploadFiles(files)}
          >
            {t(locale, "mPhotoTake")}
          </IosFilePickLabel>
          <IosFilePickLabel
            id={libraryId}
            accept={acceptTypes}
            multiple={remaining > 1}
            disabled={!canAdd}
            className="giu-btn-secondary giu-btn-3d w-full !py-3.5 text-center text-[15px] font-bold"
            onFiles={(files) => void uploadFiles(files)}
          >
            {t(locale, "mPhotoLibrary")}
          </IosFilePickLabel>
        </div>
      </GiuBottomSheet>
    </>
  );
}
