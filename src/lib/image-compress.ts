/**
 * Comprime uma foto no navegador antes do envio:
 * redimensiona para no máximo `maxDimension` px e reduz a qualidade até ficar
 * abaixo de `maxBytes`. Usa WebP quando o navegador suporta; senão JPEG.
 * Assim uma foto de 8 MB do celular vira ~150–300 KB.
 */
export type CompressOptions = { maxDimension?: number; maxBytes?: number };

export class ImageCompressError extends Error {}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function compressImage(
  file: File,
  { maxDimension = 1200, maxBytes = 400 * 1024 }: CompressOptions = {},
): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  if (file.type && !ACCEPTED.includes(file.type)) {
    throw new ImageCompressError("Formato não suportado. Envie uma foto JPG, PNG ou WebP.");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new ImageCompressError("Essa foto é muito grande (mais de 25 MB). Escolha outra.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageCompressError("Não conseguimos abrir essa foto. Tente tirar um print dela ou usar outra.");
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageCompressError("Seu navegador não conseguiu processar a foto.");
  ctx.fillStyle = "#ffffff"; // fundo branco para PNG transparente virar JPEG sem ficar preto
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  // Safari antigo não gera WebP: detecta pelo tipo devolvido.
  const probe = await toBlob("image/webp", 0.8);
  const useWebp = probe?.type === "image/webp";
  const type = useWebp ? "image/webp" : "image/jpeg";

  let quality = 0.82;
  let blob = useWebp ? probe : await toBlob(type, quality);
  while (blob && blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await toBlob(type, quality);
  }
  if (!blob) throw new ImageCompressError("Não foi possível comprimir a foto.");
  if (blob.size > 2 * 1024 * 1024) throw new ImageCompressError("A foto continua grande demais. Tente outra.");

  return { blob, extension: useWebp ? "webp" : "jpg" };
}
