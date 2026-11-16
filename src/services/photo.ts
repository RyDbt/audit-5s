// Compression des photos côté téléphone (aucun envoi réseau).
import type { Photo, PhotoKind } from '../domain/types';
import { newId } from '../domain/id';

export const PHOTO_MAX_PX = 1280;
export const PHOTO_QUALITY = 0.7;
export const THUMB_MAX_PX = 256;
export const THUMB_QUALITY = 0.6;

/** Dimensions cibles en gardant les proportions, sans jamais agrandir. */
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const r = w >= h ? max / w : max / h;
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  // imageOrientation 'from-image' applique la rotation EXIF des photos de téléphone
  return createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
}

function drawToJpeg(bmp: ImageBitmap, max: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = fitWithin(bmp.width, bmp.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve({ blob: b, width, height }) : reject(new Error('JPEG encoding failed'))),
      'image/jpeg',
      quality,
    ),
  );
}

/** Transforme un fichier photo en Photo compressée + vignette, prête à stocker. */
export async function compressPhoto(file: Blob, kind: PhotoKind): Promise<Photo> {
  const bmp = await loadBitmap(file);
  try {
    const main = await drawToJpeg(bmp, PHOTO_MAX_PX, PHOTO_QUALITY);
    const thumb = await drawToJpeg(bmp, THUMB_MAX_PX, THUMB_QUALITY);
    return {
      id: newId(),
      kind,
      blob: main.blob,
      thumb: thumb.blob,
      width: main.width,
      height: main.height,
      takenAt: new Date().toISOString(),
    };
  } finally {
    bmp.close();
  }
}
