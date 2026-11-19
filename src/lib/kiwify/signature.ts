import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validação do webhook da Kiwify (documentação oficial):
 *   signature (query) = HMAC-SHA1(chave = token, mensagem = corpo CRU), hex minúsculo.
 * Sempre calcular sobre os bytes recebidos, nunca sobre o JSON re-serializado.
 * Aceita mais de um token para permitir a troca de token sem perder eventos.
 */
export function computeKiwifySignature(rawBody: string | Buffer, token: string): string {
  return createHmac("sha1", token).update(rawBody).digest("hex");
}

export function isValidKiwifySignature(
  rawBody: string | Buffer,
  signature: string | null | undefined,
  tokens: (string | undefined | null)[],
): boolean {
  if (!signature || !/^[0-9a-f]{40}$/.test(signature)) return false;
  const received = Buffer.from(signature, "utf8");
  return tokens
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .some((token) => {
      const expected = Buffer.from(computeKiwifySignature(rawBody, token), "utf8");
      return expected.length === received.length && timingSafeEqual(expected, received);
    });
}
