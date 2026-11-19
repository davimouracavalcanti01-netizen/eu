import type { Metadata } from "next";
import { Fill, LegalPage } from "@/components/marketing/legal-page";
import { legal } from "@/lib/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Política de Privacidade" };

// Modelo básico de acordo com a LGPD (Lei 13.709/2018). Recomendamos revisão jurídica.
export default function PrivacidadePage() {
  const n = site.name;
  return (
    <LegalPage title="Política de Privacidade" updatedAt={legal.updatedAt}>
      <p>
        Esta Política explica como o {n} trata dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD — Lei
        13.709/2018).
      </p>

      <h2>1. Quem é o controlador</h2>
      <p>
        <Fill value={legal.companyName} label="razão social ou nome" />, CNPJ/CPF <Fill value={legal.document} label="CNPJ ou CPF" />,
        endereço <Fill value={legal.address} label="endereço completo" />. Encarregado de dados (DPO):{" "}
        <Fill value={legal.dpoName} label="nome do encarregado" />, e-mail <Fill value={legal.privacyEmail} label="e-mail de privacidade" />.
      </p>

      <h2>2. Dados dos Vendedores (assinantes)</h2>
      <ul>
        <li><strong>Conta:</strong> e-mail (usado para login e comunicações).</li>
        <li><strong>Loja:</strong> nome, logo, cor, descrição, WhatsApp, chave Pix, endereço de retirada, horários, produtos e fotos.</li>
        <li><strong>Assinatura:</strong> situação da assinatura e identificadores da compra recebidos da Kiwify (não recebemos dados de cartão).</li>
        <li><strong>Registros técnicos:</strong> registros de acesso e de eventos de pagamento, para segurança e auditoria.</li>
      </ul>
      <p>
        <strong>Finalidades e bases legais:</strong> prestar o serviço contratado (execução de contrato — art. 7º, V),
        cumprir obrigações legais, como guarda de registros de acesso pelo Marco Civil da Internet (art. 7º, II), e
        garantir a segurança e prevenir fraudes (legítimo interesse — art. 7º, IX).
      </p>

      <h2>3. Dados dos clientes das lojas</h2>
      <ul>
        <li>
          <strong>Não armazenamos</strong> nome, endereço, telefone ou itens do pedido do cliente final. Esses dados são
          digitados pelo cliente e enviados diretamente ao WhatsApp do Vendedor, que passa a ser o controlador desses dados.
        </li>
        <li>
          O carrinho e os dados de entrega ficam salvos apenas no próprio celular do cliente (armazenamento local do
          navegador), para facilitar o próximo pedido. O cliente pode apagá-los limpando os dados do navegador.
        </li>
        <li>Contamos visitas e cliques em &quot;Pedir&quot; de forma agregada e anônima (sem identificar a pessoa).</li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <p>Usamos fornecedores (operadores) que tratam dados em nosso nome, somente para prestar o serviço:</p>
      <ul>
        <li><strong>Kiwify</strong> — pagamento e cobrança da assinatura;</li>
        <li><strong>Supabase</strong> — banco de dados, login e armazenamento de fotos;</li>
        <li><strong>Vercel</strong> — hospedagem do site;</li>
        <li><strong>Resend</strong> — envio de e-mails.</li>
      </ul>
      <p>
        Alguns desses fornecedores podem armazenar dados fora do Brasil, com garantias contratuais de proteção compatíveis
        com a LGPD (art. 33). Não vendemos dados pessoais.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Usamos apenas cookies essenciais para manter o Vendedor conectado ao painel. Não usamos cookies de publicidade nem
        de rastreamento de terceiros.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li>Dados da conta e da loja: enquanto a conta existir. Após o cancelamento, mantemos os dados para permitir a reativação, e você pode pedir a exclusão a qualquer momento.</li>
        <li>Registros de acesso: no mínimo 6 meses (Marco Civil da Internet).</li>
        <li>Registros de pagamento: pelo prazo exigido pela legislação fiscal e para defesa em processos.</li>
      </ul>

      <h2>7. Seus direitos</h2>
      <p>
        Você pode pedir, a qualquer momento: confirmação e acesso aos dados, correção, anonimização ou exclusão, portabilidade,
        informações sobre compartilhamento e revogação de consentimento (art. 18 da LGPD). Envie seu pedido para{" "}
        <Fill value={legal.privacyEmail} label="e-mail de privacidade" />. Respondemos em até 15 dias. Você também pode
        reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), login sem senha por e-mail, regras de acesso no banco de dados que impedem um
        Vendedor de ver dados de outro, e acesso restrito às chaves do sistema.
      </p>

      <h2>9. Alterações</h2>
      <p>Esta Política pode ser atualizada. Mudanças relevantes serão comunicadas por e-mail ou no painel.</p>
    </LegalPage>
  );
}
