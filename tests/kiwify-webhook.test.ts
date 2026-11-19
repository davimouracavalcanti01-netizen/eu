import { beforeEach, describe, expect, it } from "vitest";
import {
  handleKiwifyWebhook,
  type EventLog,
  type EventStatus,
  type SubscriptionRow,
  type SubscriptionUpsert,
  type WebhookDeps,
  type WebhookRepository,
} from "@/lib/kiwify/handle-webhook";
import { computeKiwifySignature, isValidKiwifySignature } from "@/lib/kiwify/signature";

const TOKEN = "token-secreto-de-teste-123";
const NOW = new Date("2026-11-19T12:00:00Z");

// ---------------------------------------------------------------------------
// Banco e e-mail em memória
// ---------------------------------------------------------------------------
class FakeRepo implements WebhookRepository {
  events: (EventLog & { id: number; received_at: string })[] = [];
  users = new Map<string, string>(); // email -> id
  subs = new Map<string, SubscriptionRow & { kiwify_order_id?: string | null; last_event_type?: string }>();
  stores = new Map<string, string>(); // userId -> slug
  failNextUpsert = false;

  async insertEvent(e: EventLog) {
    const found = this.events.find((x) => x.idempotency_key === e.idempotency_key);
    if (found) return { inserted: false as const, id: found.id, status: found.status, receivedAt: found.received_at };
    const id = this.events.length + 1;
    this.events.push({ ...e, id, received_at: NOW.toISOString() });
    return { inserted: true as const, id };
  }
  async updateEvent(id: number, patch: { status: EventStatus; error?: string | null }) {
    const e = this.events.find((x) => x.id === id)!;
    e.status = patch.status;
    e.error = patch.error ?? null;
  }
  async logUnprocessable(e: EventLog) {
    this.events.push({ ...e, id: this.events.length + 1, received_at: NOW.toISOString() });
  }
  async findSubscriptionBySubscriptionId(id: string) {
    return [...this.subs.values()].find((s) => s.kiwify_subscription_id === id) ?? null;
  }
  async findSubscriptionByEmail(email: string) {
    return [...this.subs.values()].find((s) => s.email === email) ?? null;
  }
  async findUserIdByEmail(email: string) {
    return this.users.get(email) ?? null;
  }
  async createUser(email: string) {
    const id = `user-${this.users.size + 1}`;
    this.users.set(email, id);
    return id;
  }
  async upsertSubscription(row: SubscriptionUpsert) {
    if (this.failNextUpsert) {
      this.failNextUpsert = false;
      throw new Error("banco fora do ar");
    }
    this.subs.set(row.user_id, { ...row });
  }
  async storeSlugOf(userId: string) {
    return this.stores.get(userId) ?? null;
  }
  async createLoginLink(email: string) {
    return `http://localhost:3000/auth/confirm?token_hash=hash-${email}&type=magiclink&next=/painel`;
  }
}

let repo: FakeRepo;
let sent: { to: string; kind: string; url: string }[];
let alerts: string[];
let revalidated: string[];
let deps: WebhookDeps;

beforeEach(() => {
  repo = new FakeRepo();
  sent = [];
  alerts = [];
  revalidated = [];
  deps = {
    repo,
    mailer: {
      async sendAccess(to, url, kind) {
        sent.push({ to, url, kind });
      },
      async sendAlert(subject) {
        alerts.push(subject);
      },
    },
    revalidateStore: (slug) => revalidated.push(slug),
    tokens: [TOKEN],
    now: () => NOW,
  };
});

// ---------------------------------------------------------------------------
// Payloads baseados nos exemplos da documentação oficial da Kiwify
// ---------------------------------------------------------------------------
const SUB_ID = "5f6e7d8c-0000-4000-8000-000000000001";
function payload(overrides: Record<string, unknown>) {
  return {
    order_id: "9b1c2d3e-0000-4000-8000-000000000001",
    order_status: "paid",
    webhook_event_type: "order_approved",
    payment_method: "credit_card",
    approved_date: "2026-11-19 09:00",
    subscription_id: SUB_ID,
    Customer: { full_name: "Ana Souza", email: "Ana@Example.com" },
    Subscription: {
      id: SUB_ID,
      status: "active",
      next_payment: "2026-12-19T03:00:00.000Z",
      customer_access: { has_access: true, active_period: true, access_until: "2026-12-19T03:00:00.000Z" },
    },
    ...overrides,
  };
}

async function send(body: unknown, opts: { token?: string; signature?: string | null } = {}) {
  const raw = JSON.stringify(body);
  const signature = opts.signature !== undefined ? opts.signature : computeKiwifySignature(raw, opts.token ?? TOKEN);
  return handleKiwifyWebhook(raw, signature, deps);
}

async function approve() {
  return send(payload({}));
}

// ---------------------------------------------------------------------------
describe("assinatura do webhook", () => {
  it("bate com o vetor de teste da documentação oficial", () => {
    const body =
      '{"order_id":"9b1c2d3e-0000-4000-8000-000000000001","order_status":"paid","webhook_event_type":"order_approved"}';
    expect(computeKiwifySignature(body, "kiwify-token-de-teste")).toBe("bf18f352a4f981b91dfa3f6d8742a81080ab8c86");
    expect(isValidKiwifySignature(body, "bf18f352a4f981b91dfa3f6d8742a81080ab8c86", ["kiwify-token-de-teste"])).toBe(true);
  });

  it("recusa token errado com 401 e registra a tentativa", async () => {
    const res = await send(payload({}), { token: "token-errado-xxxxxxxx" });
    expect(res.status).toBe(401);
    expect(repo.subs.size).toBe(0);
    expect(repo.users.size).toBe(0);
    expect(repo.events[0]).toMatchObject({ status: "rejected", signature_valid: false });
  });

  it("recusa requisição sem assinatura", async () => {
    const res = await send(payload({}), { signature: null });
    expect(res.status).toBe(401);
    expect(repo.subs.size).toBe(0);
  });

  it("recusa corpo alterado (assinatura de outro corpo)", async () => {
    const original = JSON.stringify(payload({}));
    const sig = computeKiwifySignature(original, TOKEN);
    const tampered = original.replace("Ana@Example.com", "hacker@example.com");
    const res = await handleKiwifyWebhook(tampered, sig, deps);
    expect(res.status).toBe(401);
  });

  it("aceita o token antigo durante a troca de token", async () => {
    deps.tokens = [TOKEN, "token-antigo-1234567"];
    const res = await send(payload({}), { token: "token-antigo-1234567" });
    expect(res.status).toBe(200);
  });

  it("assinatura com formato inválido é recusada sem erro", () => {
    expect(isValidKiwifySignature("{}", "abc", [TOKEN])).toBe(false);
    expect(isValidKiwifySignature("{}", "z".repeat(40), [TOKEN])).toBe(false);
    expect(isValidKiwifySignature("{}", computeKiwifySignature("{}", TOKEN), [])).toBe(false);
  });
});

describe("compra aprovada (order_approved)", () => {
  it("cria o usuário, ativa a assinatura e envia e-mail de boas-vindas", async () => {
    const res = await approve();
    expect(res.status).toBe(200);
    expect(repo.users.get("ana@example.com")).toBe("user-1");
    expect(repo.subs.get("user-1")).toMatchObject({
      email: "ana@example.com",
      status: "active",
      kiwify_subscription_id: SUB_ID,
      current_period_end: "2026-12-19T03:00:00.000Z",
      access_ends_at: null,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "ana@example.com", kind: "welcome" });
    expect(sent[0].url).toContain("/auth/confirm?token_hash=");
    expect(repo.events[0].status).toBe("processed");
  });

  it("usuário que já existia (sem assinatura) não é duplicado", async () => {
    repo.users.set("ana@example.com", "existente");
    await approve();
    expect(repo.users.size).toBe(1);
    expect(repo.subs.get("existente")?.status).toBe("active");
  });

  it("sem e-mail no payload: registra erro, alerta o dono e responde 200", async () => {
    const res = await send(payload({ Customer: undefined }));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(repo.subs.size).toBe(0);
    expect(repo.events[0].status).toBe("error");
    expect(alerts).toHaveLength(1);
  });

  it("erro temporário (banco) responde 500 para a Kiwify reenviar, e o reenvio funciona", async () => {
    repo.failNextUpsert = true;
    const first = await approve();
    expect(first.status).toBe(500);
    expect(repo.events[0].status).toBe("error");
    const retry = await approve();
    expect(retry.status).toBe(200);
    expect(repo.subs.get("user-1")?.status).toBe("active");
    expect(repo.events).toHaveLength(1);
  });

  it("falha no envio do e-mail não desfaz a ativação", async () => {
    deps.mailer.sendAccess = async () => {
      throw new Error("Resend fora do ar");
    };
    const res = await approve();
    expect(res.status).toBe(200);
    expect(repo.subs.get("user-1")?.status).toBe("active");
    expect(repo.events[0].error).toContain("e-mail de acesso falhou");
  });

  it("limpa o cache da loja do vendedor", async () => {
    repo.users.set("ana@example.com", "user-ana");
    repo.stores.set("user-ana", "doces-da-ana");
    await approve();
    expect(revalidated).toEqual(["doces-da-ana"]);
  });
});

describe("evento duplicado", () => {
  it("o mesmo evento recebido 2x não duplica nada nem reenvia e-mail", async () => {
    const a = await approve();
    const b = await approve();
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.body.duplicate).toBe(true);
    expect(repo.users.size).toBe(1);
    expect(sent).toHaveLength(1);
    expect(repo.events).toHaveLength(1);
  });

  it("evento ainda em processamento (entrega simultânea) responde 409", async () => {
    const raw = JSON.stringify(payload({}));
    repo.events.push({
      id: 1,
      idempotency_key: `order_approved:${payload({}).order_id}`,
      status: "received",
      received_at: NOW.toISOString(),
      event_type: "order_approved",
      order_id: null,
      subscription_id: null,
      customer_email: null,
      signature_valid: true,
      payload: null,
    });
    const res = await handleKiwifyWebhook(raw, computeKiwifySignature(raw, TOKEN), deps);
    expect(res.status).toBe(409);
  });

  it("compra aprovada + subscription_renewed da mesma renovação são eventos diferentes", async () => {
    await approve();
    const res = await send(payload({ webhook_event_type: "subscription_renewed" }));
    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBeUndefined();
    expect(repo.events).toHaveLength(2);
  });
});

describe("renovação paga (subscription_renewed)", () => {
  it("mantém ativo e atualiza o vencimento, sem e-mail", async () => {
    await approve();
    const res = await send(
      payload({
        order_id: "renovacao-2",
        webhook_event_type: "subscription_renewed",
        Subscription: {
          id: SUB_ID,
          status: "active",
          customer_access: { has_access: true, access_until: "2027-01-19T03:00:00.000Z" },
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(repo.subs.get("user-1")).toMatchObject({ status: "active", current_period_end: "2027-01-19T03:00:00.000Z" });
    expect(sent).toHaveLength(1); // só o de boas-vindas
  });

  it("renovação depois de atraso reativa e avisa o cliente", async () => {
    await approve();
    await send(payload({ order_id: "o-late", webhook_event_type: "subscription_late", order_status: "refused" }));
    expect(repo.subs.get("user-1")?.status).toBe("inactive");
    await send(
      payload({
        order_id: "o-pago",
        webhook_event_type: "subscription_renewed",
        Subscription: { id: SUB_ID, customer_access: { access_until: "2027-01-19T03:00:00.000Z" } },
      }),
    );
    expect(repo.subs.get("user-1")?.status).toBe("active");
    expect(sent.map((s) => s.kind)).toEqual(["welcome", "reactivated"]);
  });
});

describe("atraso (subscription_late)", () => {
  it("marca como inativo na hora", async () => {
    await approve();
    const res = await send(
      payload({
        order_id: "o-2",
        order_status: "refused",
        webhook_event_type: "subscription_late",
        Subscription: { id: SUB_ID, status: "waiting_payment", customer_access: { has_access: false, access_until: "2026-12-19T03:00:00.000Z" } },
      }),
    );
    expect(res.status).toBe(200);
    expect(repo.subs.get("user-1")?.status).toBe("inactive");
  });

  it("pequena diferença de horário no fim do período não impede a desativação", async () => {
    await approve(); // período até 2026-12-19T03:00Z
    await send(
      payload({
        order_id: "o-late-2",
        webhook_event_type: "subscription_late",
        Subscription: { id: SUB_ID, customer_access: { has_access: false, access_until: "2026-12-18T12:00:00.000Z" } },
      }),
    );
    expect(repo.subs.get("user-1")?.status).toBe("inactive");
  });

  it("atraso antigo que chega depois da renovação é ignorado", async () => {
    await approve();
    await send(
      payload({
        order_id: "o-renov",
        webhook_event_type: "subscription_renewed",
        Subscription: { id: SUB_ID, customer_access: { access_until: "2027-01-19T03:00:00.000Z" } },
      }),
    );
    const res = await send(
      payload({
        order_id: "o-atrasado",
        webhook_event_type: "subscription_late",
        Subscription: { id: SUB_ID, customer_access: { access_until: "2026-12-19T03:00:00.000Z" } },
      }),
    );
    expect(res.body.ignored).toBe(true);
    expect(repo.subs.get("user-1")?.status).toBe("active");
  });
});

describe("reembolso e chargeback", () => {
  it("reembolso (order_refunded) desativa na hora", async () => {
    await approve();
    await send(payload({ webhook_event_type: "order_refunded", order_status: "refunded" }));
    expect(repo.subs.get("user-1")?.status).toBe("inactive");
  });

  it("chargeback desativa na hora", async () => {
    await approve();
    await send(payload({ webhook_event_type: "chargeback", order_status: "chargedback" }));
    expect(repo.subs.get("user-1")?.status).toBe("inactive");
  });

  it("cancelamento causado por reembolso desativa na hora", async () => {
    await approve();
    await send(
      payload({
        webhook_event_type: "subscription_canceled",
        order_status: "refunded",
        Subscription: { id: SUB_ID, status: "canceled", customer_access: { has_access: false, access_until: NOW.toISOString() } },
      }),
    );
    expect(repo.subs.get("user-1")?.status).toBe("inactive");
  });

  it("os dados (usuário) não são apagados ao desativar", async () => {
    await approve();
    await send(payload({ webhook_event_type: "chargeback", order_status: "chargedback" }));
    expect(repo.users.get("ana@example.com")).toBe("user-1");
    expect(repo.subs.has("user-1")).toBe(true);
  });
});

describe("cancelamento (subscription_canceled)", () => {
  it("continua ativa até o fim do período pago", async () => {
    await approve();
    const res = await send(
      payload({
        webhook_event_type: "subscription_canceled",
        order_status: "paid",
        Subscription: { id: SUB_ID, status: "canceled", customer_access: { has_access: true, access_until: "2026-12-19T03:00:00.000Z" } },
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.action).toBe("cancel_at_period_end");
    expect(repo.subs.get("user-1")).toMatchObject({ status: "active", access_ends_at: "2026-12-19T03:00:00.000Z" });
  });

  it("cancelamento recebido 2x (pedido e fim do período) é idempotente", async () => {
    await approve();
    const body = payload({
      webhook_event_type: "subscription_canceled",
      Subscription: { id: SUB_ID, status: "canceled", customer_access: { has_access: true, access_until: "2026-12-19T03:00:00.000Z" } },
    });
    await send(body);
    const again = await send(body);
    expect(again.body.duplicate).toBe(true);
  });

  it("cancelamento sem período restante desativa na hora", async () => {
    await approve();
    await send(
      payload({
        webhook_event_type: "subscription_canceled",
        Subscription: { id: SUB_ID, status: "canceled", customer_access: { has_access: false, access_until: "2026-11-01T00:00:00Z" } },
      }),
    );
    expect(repo.subs.get("user-1")?.status).toBe("inactive");
  });

  it("nova compra depois de cancelada reativa e limpa a data de término", async () => {
    await approve();
    await send(
      payload({
        webhook_event_type: "subscription_canceled",
        Subscription: { id: SUB_ID, customer_access: { has_access: true, access_until: "2026-12-19T03:00:00.000Z" } },
      }),
    );
    await send(payload({ order_id: "nova-compra", subscription_id: "nova-assinatura", Subscription: { id: "nova-assinatura", customer_access: { access_until: "2027-01-19T03:00:00.000Z" } } }));
    expect(repo.subs.get("user-1")).toMatchObject({
      status: "active",
      access_ends_at: null,
      kiwify_subscription_id: "nova-assinatura",
    });
  });
});

describe("eventos sem ação", () => {
  it.each(["pix_created", "billet_created", "order_rejected", "subscription_trial_started", "evento_novo_qualquer"])(
    "%s é registrado como ignorado",
    async (type) => {
      const res = await send(payload({ webhook_event_type: type }));
      expect(res.status).toBe(200);
      expect(repo.subs.size).toBe(0);
      expect(repo.events[0].status).toBe("ignored");
    },
  );

  it("desativação de assinatura desconhecida é ignorada", async () => {
    const res = await send(payload({ webhook_event_type: "chargeback" }));
    expect(res.body.ignored).toBe(true);
    expect(repo.subs.size).toBe(0);
  });

  it("JSON inválido com assinatura válida responde 400", async () => {
    const raw = "{isso não é json";
    const res = await handleKiwifyWebhook(raw, computeKiwifySignature(raw, TOKEN), deps);
    expect(res.status).toBe(400);
  });

  it("payload sem webhook_event_type responde 400", async () => {
    const res = await send({ order_id: "x" });
    expect(res.status).toBe(400);
  });

  it("todo evento fica registrado no log", async () => {
    await approve();
    await send(payload({ webhook_event_type: "pix_created", order_id: "p" }));
    await send(payload({}), { token: "errado-errado-errado" });
    expect(repo.events.map((e) => e.status)).toEqual(["processed", "ignored", "rejected"]);
  });
});
