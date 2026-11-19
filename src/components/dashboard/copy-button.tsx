"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copiar link",
  className,
  variant = "default",
}: {
  text: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    toast.success("Link copiado! Agora é só colar no WhatsApp ou Instagram.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" onClick={copy} className={className} variant={variant}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copiado!" : label}
    </Button>
  );
}
