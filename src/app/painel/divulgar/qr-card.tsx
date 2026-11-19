"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { url: string; storeName: string; color: string; slug: string };

export function QrCard({ url, storeName, color, slug }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setError(true));
  }, [url]);

  async function download() {
    const dataUrl = await QRCode.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: "M" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qrcode-${slug}.png`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* Somente este bloco aparece na impressão (ver classe print-area em globals.css) */}
      <div className="print-area mx-auto w-full max-w-xs rounded-2xl border bg-white p-6 text-center text-black shadow-sm">
        <p className="text-sm font-semibold tracking-wide uppercase" style={{ color }}>
          Faça seu pedido
        </p>
        <p className="mt-1 text-xl font-bold">{storeName}</p>
        <div className="mx-auto my-4 aspect-square w-full max-w-[220px]" aria-label={`QR Code para ${url}`} role="img">
          {svg ? (
            <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : error ? (
            <p className="text-sm text-destructive">Não foi possível gerar o QR Code.</p>
          ) : (
            <div className="size-full animate-pulse rounded-lg bg-muted" />
          )}
        </div>
        <p className="text-sm">Aponte a câmera do celular 📱</p>
        <p className="mt-1 text-xs break-all text-neutral-600">{url.replace(/^https?:\/\//, "")}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center print:hidden">
        <Button onClick={download} disabled={!svg}>
          <Download aria-hidden /> Baixar QR Code (imagem)
        </Button>
        <Button variant="outline" onClick={() => window.print()} disabled={!svg}>
          <Printer aria-hidden /> Imprimir plaquinha
        </Button>
      </div>
    </div>
  );
}
