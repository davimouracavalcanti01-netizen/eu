"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, QrCode, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/painel", label: "Início", icon: Home, exact: true },
  { href: "/painel/produtos", label: "Produtos", icon: Package },
  { href: "/painel/loja", label: "Minha loja", icon: Store },
  { href: "/painel/divulgar", label: "Divulgar", icon: QrCode },
];

/** Abas no topo (computador) e barra fixa embaixo (celular). */
export function PanelNav() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <>
      <nav aria-label="Menu do painel" className="hidden border-b bg-background sm:block">
        <ul className="mx-auto flex w-full max-w-5xl gap-1 px-4">
          {ITEMS.map(({ href, label, icon: Icon, exact }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href, exact) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive(href, exact) ? "border-primary text-foreground" : "border-transparent",
                )}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav
        aria-label="Menu do painel"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="grid grid-cols-4">
          {ITEMS.map(({ href, label, icon: Icon, exact }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href, exact) ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground",
                  isActive(href, exact) && "text-primary",
                )}
              >
                <Icon className="size-5" aria-hidden /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
