"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

/** Mostra um aviso uma única vez (vindo de um redirect) e limpa a URL. */
export function FlashToast({ message }: { message: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);
  useEffect(() => {
    if (!message || shown.current) return;
    shown.current = true;
    toast.success(message);
    router.replace(pathname, { scroll: false });
  }, [message, pathname, router]);
  return null;
}
