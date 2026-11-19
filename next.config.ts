import type { NextConfig } from "next";

// Fotos ficam no Supabase Storage: liberamos esse domínio para o <Image> do Next.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return undefined;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// Em desenvolvimento com Supabase local (127.0.0.1), o otimizador de imagens do
// Next bloqueia IPs locais; nesse caso servimos a imagem direto.
const isLocalSupabase = supabaseHost === "127.0.0.1" || supabaseHost === "localhost";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: isLocalSupabase,
    minimumCacheTTL: 2678400, // 31 dias (nomes de arquivo são únicos)
    remotePatterns: supabaseHost
      ? [{ protocol: isLocalSupabase ? "http" : "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
