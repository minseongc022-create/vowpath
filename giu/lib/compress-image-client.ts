/** Client-side resize → JPEG so camera/HEIC uploads work on every device. */

export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

/** Normalize iPhone camera / HEIC picks to JPEG before upload. */
export async function prepareImageForUpload(file: File): Promise<File> {
  let source = file;

  if (isHeicFile(source)) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: source,
      toType: "image/jpeg",
      quality: 0.86,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const base = source.name.replace(/\.[^.]+$/, "") || "photo";
    source = new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  }

  const jpeg = await compressImageToJpeg(source);
  if (jpeg.type === "image/jpeg" && jpeg.size > 0) return jpeg;
  if (source.type === "image/jpeg" && source.size > 0) return source;
  throw new Error("jpeg-convert-failed");
}

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
