export const STORE_MEDIA_BUCKET = "store-media";
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** URL pública de uma imagem do bucket (ou null). */
export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${STORE_MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** O caminho pertence à pasta do usuário e tem formato esperado? */
export function isOwnMediaPath(path: string, userId: string, folder: "products" | "logo"): boolean {
  return new RegExp(`^${userId}/${folder}/[a-zA-Z0-9-]{8,64}\\.(webp|jpg|jpeg|png)$`).test(path);
}

/** Foto de produto: imagens da loja demo ficam em /public/demo; as demais no Storage. */
export function productImageUrl(path: string | null | undefined): string | null {
  if (path?.startsWith("demo:")) return `/demo/${path.slice(5)}.svg`;
  return publicImageUrl(path);
}
