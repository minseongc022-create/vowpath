/** Client-side resize → JPEG so camera/HEIC uploads work on every device. */
export async function compressImageToJpeg(
  file: File,
  maxDim = 1200,
  quality = 0.85,
): Promise<File> {
  if (typeof window === "undefined") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (bitmap) {
    const out = await jpegFromBitmap(bitmap, maxDim, quality);
    bitmap.close();
    if (out) return out;
  }

  const viaImg = await jpegFromImageElement(file, maxDim, quality);
  if (viaImg) return viaImg;

  return file;
}

async function jpegFromBitmap(
  bitmap: ImageBitmap,
  maxDim: number,
  quality: number,
): Promise<File | null> {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height, 1));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvasToJpegFile(canvas, "photo", quality);
}

async function jpegFromImageElement(
  file: File,
  maxDim: number,
  quality: number,
): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });

    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return canvasToJpegFile(canvas, base, quality);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  baseName: string,
  quality: number,
): Promise<File | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) return null;
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
