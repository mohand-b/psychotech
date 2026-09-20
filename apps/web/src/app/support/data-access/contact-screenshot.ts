import {
  CONTACT_SCREENSHOT_MAX_BYTES,
  ContactScreenshotDto,
} from '@psychotech/shared';

const SCREENSHOT_MAX_DIMENSION_PX = 1600;
const SCREENSHOT_JPEG_QUALITY = 0.8;
const SCREENSHOT_MIME_TYPE = 'image/jpeg';
const BASE64_CHUNK_BYTES = 0x8000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES),
    );
  }
  return btoa(binary);
}

function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, SCREENSHOT_MIME_TYPE, SCREENSHOT_JPEG_QUALITY),
  );
}

export async function encodeScreenshot(
  file: File,
  document: Document,
): Promise<ContactScreenshotDto | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      SCREENSHOT_MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext('2d')
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await encodeCanvas(canvas);
    if (!blob || blob.size > CONTACT_SCREENSHOT_MAX_BYTES) {
      return null;
    }
    return {
      mimeType: SCREENSHOT_MIME_TYPE,
      dataBase64: toBase64(new Uint8Array(await blob.arrayBuffer())),
    };
  } catch {
    return null;
  }
}
