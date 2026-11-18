/** Evita redirecionamento para sites externos (open redirect). */
export function safeNextPath(next: string | null | undefined, fallback = "/painel"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
