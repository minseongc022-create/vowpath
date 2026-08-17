"use client";

import { useEffect, useId, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { prepareImageForUpload } from "@/giu/lib/compress-image-client";
import { GiuBottomSheet } from "@/giu/components/GiuBottomSheet";
import { MAX_BOX_IMAGES } from "@/giu/lib/box-images";
import { hapticConfirm } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  value: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
  onError?: (message: string) => void;
  max?: number;
};

function isBlobPreview(url: string): boolean {
  return url.startsWith("blob:");
}

function newSlotId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
  const [slotIds, setSlotIds] = useState<string[]>([]);
  const uploadSeqRef = useRef(0);
  const remaining = max - value.length;
  const canAdd = remaining > 0 && !uploading;
  const acceptTypes = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

  useEffect(() => {
    if (value.length === 0) {
      setSlotIds([]);
      return;
    }
    setSlotIds((ids) => {
      if (ids.length === value.length) return ids;
      if (ids.length > value.length) return ids.slice(0, value.length);
      return [...ids, ...Array.from({ length: value.length - ids.length }, () => newSlotId())];
    });
  }, [value.length]);

  function revokeBlobIfUnused(url: string, urls: string[]) {
    if (!isBlobPreview(url)) return;
    if (urls.some((u) => u === url)) return;
    URL.revokeObjectURL(url);
  }

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

  function mergeUploaded(
    prev: string[],
    previews: string[],
    uploaded: string[],
  ): string[] {
    let uploadIdx = 0;
    return prev
      .map((url) => {
        if (!previews.includes(url)) return url;
        const server = uploaded[uploadIdx];
        uploadIdx += 1;
        return server ?? null;
      })
      .filter((url): url is string => Boolean(url))
      .slice(0, max);
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, remaining);
    if (!list.length) return;

    const seq = ++uploadSeqRef.current;
    setSheetOpen(false);
    setLocalError("");

    const previews = list.map((file) => URL.createObjectURL(file));
    const addedCount = Math.min(previews.length, max - value.length);

    onChange((prev) => [...prev, ...previews.slice(0, addedCount)]);
    setSlotIds((ids) => [
      ...ids,
      ...Array.from({ length: addedCount }, () => newSlotId()),
    ]);
    setUploading(true);
    setPendingCount(list.length);

    try {
      const uploaded: string[] = [];
      for (const file of list) {
        if (seq !== uploadSeqRef.current) break;
        const url = await uploadFile(file);
        if (url) uploaded.push(url);
      }

      if (seq !== uploadSeqRef.current) return;

      if (uploaded.length) hapticConfirm();

      onChange((prev) => {
        const next = mergeUploaded(prev, previews, uploaded);
        for (const preview of previews) revokeBlobIfUnused(preview, next);
        return next;
      });

      if (!uploaded.length) {
        onChange((prev) => {
          const next = prev.filter((url) => !previews.includes(url)).slice(0, max);
          for (const preview of previews) revokeBlobIfUnused(preview, next);
          return next;
        });
      }
    } catch {
      if (seq !== uploadSeqRef.current) return;
      setLocalError(t(locale, "mLoadError"));
      onError?.(t(locale, "mLoadError"));
      onChange((prev) => {
        const next = prev.filter((url) => !previews.includes(url)).slice(0, max);
        for (const preview of previews) revokeBlobIfUnused(preview, next);
        return next;
      });
    } finally {
      if (seq === uploadSeqRef.current) {
        setUploading(false);
        setPendingCount(0);
      }
    }
  }

  const busyLabel =
    uploading && pendingCount > 0
      ? t(locale, "mPhotoUploading")
      : uploading
        ? t(locale, "mPhotoUploading")
        : t(locale, "mPhotoPick");

  function removeAt(index: number) {
    uploadSeqRef.current += 1;
    setSlotIds((ids) => ids.filter((_, i) => i !== index));
    onChange((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (removed) revokeBlobIfUnused(removed, next);
      return next;
    });
  }

  return (
    <>
      <div className="space-y-2">
        {value.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {value.map((url, index) => (
              <div
                key={slotIds[index] ?? `photo-${index}`}
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeAt(index);
                  }}
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
