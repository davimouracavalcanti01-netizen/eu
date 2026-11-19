"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage, ImageCompressError } from "@/lib/image-compress";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl, STORE_MEDIA_BUCKET } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  folder: "products" | "logo";
  name: string;
  defaultPath: string | null;
  label: string;
  hint?: string;
  shape?: "square" | "circle";
};

/**
 * Escolhe uma foto, comprime no navegador e envia direto para o Supabase Storage
 * (na pasta do próprio vendedor — o RLS do Storage bloqueia outras pastas).
 * O caminho salvo vai num <input hidden> junto com o formulário.
 */
export function ImageUpload({ userId, folder, name, defaultPath, label, hint, shape = "square" }: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(defaultPath);
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setStatus("working");
    try {
      const { blob, extension } = await compressImage(file, folder === "logo" ? { maxDimension: 512, maxBytes: 200 * 1024 } : {});
      const newPath = `${userId}/${folder}/${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(STORE_MEDIA_BUCKET)
        .upload(newPath, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      setPath(newPath);
    } catch (e) {
      setError(
        e instanceof ImageCompressError ? e.message : "Não foi possível enviar a foto. Confira sua internet e tente de novo.",
      );
    } finally {
      setStatus("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const url = publicImageUrl(path);
  const round = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium" id={`${inputId}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={path ?? ""} />
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative grid size-24 shrink-0 place-items-center overflow-hidden border bg-muted text-muted-foreground",
            round,
          )}
        >
          {status === "working" ? (
            <Loader2 className="animate-spin" aria-label="Enviando foto" />
          ) : url ? (
            <Image src={url} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <ImagePlus aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            aria-labelledby={`${inputId}-label`}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={status === "working"}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus aria-hidden /> {url ? "Trocar foto" : "Escolher foto"}
          </Button>
          {url ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPath(null)} disabled={status === "working"}>
              <Trash2 aria-hidden /> Remover
            </Button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
