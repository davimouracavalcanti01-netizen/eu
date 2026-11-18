import Link from "next/link";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 text-lg font-bold tracking-tight text-foreground", className)}
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-xl bg-primary text-base text-primary-foreground shadow-sm"
      >
        P
      </span>
      {site.name}
    </Link>
  );
}
