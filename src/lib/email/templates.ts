import { site } from "@/lib/site";

type Email = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, paragraphs: string[], cta: { label: string; url: string }, footer: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f4f2;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#2b211d">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px" cellspacing="0" cellpadding="0"><tr><td>
<p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#c2381e">${esc(site.name)}</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55">${p}</p>`).join("\n")}
<p style="margin:28px 0"><a href="${esc(cta.url)}" style="background:#c2381e;color:#ffffff;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">${esc(cta.label)}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#6b5d57">${footer}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function accessEmail(kind: "welcome" | "reactivated", loginUrl: string, siteUrl: string, supportEmail: string): Email {
  const footer = `O botão vale por 1 hora. Depois disso, entre em <a href="${esc(siteUrl)}/entrar" style="color:#c2381e">${esc(siteUrl.replace(/^https?:\/\//, ""))}/entrar</a> com este e-mail para receber um novo link. Dúvidas? Responda este e-mail ou escreva para ${esc(supportEmail)}.`;

  if (kind === "welcome") {
    return {
      subject: `Boas-vindas ao ${site.name}! Seu acesso está pronto 🎉`,
      html: layout(
        "Sua assinatura foi confirmada!",
        [
          "Que bom ter você aqui! Agora é só entrar no painel, criar sua loja e cadastrar seus produtos.",
          "Em poucos minutos você terá um link para mandar aos seus clientes. Eles montam o pedido pelo celular e ele chega prontinho no seu WhatsApp.",
          "Você não precisa de senha: sempre que quiser entrar, enviamos um link para este e-mail.",
        ],
        { label: "Entrar no meu painel", url: loginUrl },
        footer,
      ),
      text: `Sua assinatura do ${site.name} foi confirmada!\n\nEntre no seu painel pelo link (vale por 1 hora):\n${loginUrl}\n\nDepois, é só acessar ${siteUrl}/entrar com este e-mail.\nDúvidas: ${supportEmail}`,
    };
  }
  return {
    subject: `Sua loja no ${site.name} está de volta ao ar ✅`,
    html: layout(
      "Pagamento confirmado!",
      ["Sua assinatura está ativa de novo e sua loja já voltou a aparecer para os clientes, com todos os produtos e configurações de antes."],
      { label: "Abrir meu painel", url: loginUrl },
      footer,
    ),
    text: `Sua assinatura do ${site.name} está ativa de novo e sua loja voltou ao ar.\n\nEntre no painel (link vale 1 hora):\n${loginUrl}\n\nDúvidas: ${supportEmail}`,
  };
}
