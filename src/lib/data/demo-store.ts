import type { PublicStore } from "@/lib/data/public-store";

/**
 * Loja de demonstração (/demo), usada na landing page.
 * Não depende do banco. As fotos são ilustrações locais em /public/demo.
 */
export const DEMO_STORE: PublicStore = {
  active: true,
  id: "demo",
  slug: "demo",
  name: "Doces da Ana (demonstração)",
  description: "Brigadeiros, bolos de pote e palha italiana feitos com carinho 💕",
  logo_path: null,
  primary_color: "#DB2777",
  whatsapp: "5511999999999",
  pix_key: "doces.da.ana@exemplo.com",
  pix_key_type: "email",
  delivery_fee_cents: 500,
  allows_delivery: true,
  allows_pickup: true,
  pickup_address: "Rua das Flores, 123 — Centro",
  hours: [],
  categories: [
    { id: "c1", name: "Brigadeiros" },
    { id: "c2", name: "Bolos de pote" },
    { id: "c3", name: "Palha italiana" },
  ],
  products: [
    { id: "p1", category_id: "c1", name: "Brigadeiro tradicional", description: "Chocolate 50% cacau com granulado belga. Unidade.", price_cents: 300, image_path: "demo:brigadeiro" },
    { id: "p2", category_id: "c1", name: "Caixa com 12 brigadeiros", description: "Sabores sortidos: tradicional, ninho e maracujá.", price_cents: 3200, image_path: "demo:caixa" },
    { id: "p3", category_id: "c2", name: "Bolo de pote de ninho com Nutella", description: "Pote de 250 ml, massa fofinha e muito recheio.", price_cents: 1400, image_path: "demo:pote" },
    { id: "p4", category_id: "c2", name: "Bolo de pote de cenoura", description: "Com cobertura de brigadeiro. Pote de 250 ml.", price_cents: 1200, image_path: "demo:cenoura" },
    { id: "p5", category_id: "c3", name: "Palha italiana", description: "Pedaço generoso, embalado individualmente.", price_cents: 800, image_path: "demo:palha" },
  ],
};
