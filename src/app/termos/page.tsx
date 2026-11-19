import type { Metadata } from "next";
import { Fill, LegalPage } from "@/components/marketing/legal-page";
import { legal } from "@/lib/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Termos de Uso" };

// Modelo básico. Recomendamos a revisão por um advogado antes de vender em escala.
export default function TermosPage() {
  const n = site.name;
  return (
    <LegalPage title="Termos de Uso" updatedAt={legal.updatedAt}>
      <p>
        Estes Termos regulam o uso do {n}, serviço oferecido por <Fill value={legal.companyName} label="razão social ou nome" />,
        inscrito(a) sob o CNPJ/CPF <Fill value={legal.document} label="CNPJ ou CPF" />, com endereço em{" "}
        <Fill value={legal.address} label="endereço completo" /> (&quot;{n}&quot;, &quot;nós&quot;). Ao assinar ou usar o serviço,
        você (&quot;Vendedor&quot;) concorda com estes Termos.
      </p>

      <h2>1. O que é o {n}</h2>
      <p>
        O {n} é uma ferramenta para criar um cardápio/catálogo digital. O Vendedor cadastra seus produtos e recebe um link
        público. Os clientes do Vendedor montam o pedido nesse link e o enviam pelo WhatsApp diretamente ao Vendedor.
      </p>
      <p>
        <strong>O {n} não vende, não entrega e não recebe pagamentos dos produtos do Vendedor.</strong> A negociação, o
        pagamento, a entrega e o atendimento ao cliente final são de responsabilidade exclusiva do Vendedor.
      </p>

      <h2>2. Cadastro e acesso</h2>
      <ul>
        <li>A conta é criada automaticamente após a confirmação do pagamento, com o e-mail usado na compra.</li>
        <li>O acesso é feito por link enviado ao e-mail (sem senha). Mantenha seu e-mail seguro: quem tem acesso a ele tem acesso ao painel.</li>
        <li>Cada assinatura dá direito a uma loja.</li>
      </ul>

      <h2>3. Assinatura, pagamento e cancelamento</h2>
      <ul>
        <li>A assinatura é mensal, cobrada de forma recorrente pela plataforma Kiwify, que processa os pagamentos.</li>
        <li>O preço vigente é informado na página de vendas. Alterações de preço serão comunicadas com pelo menos 30 dias de antecedência.</li>
        <li>
          Você pode cancelar a qualquer momento, sem multa. Após o cancelamento, a loja continua disponível até o fim do
          período já pago.
        </li>
        <li>Em caso de falta de pagamento, a loja é suspensa até a regularização.</li>
        <li>
          Em compras pela internet, você pode desistir em até 7 (sete) dias da contratação, com reembolso integral (art. 49
          do Código de Defesa do Consumidor). O reembolso ou chargeback suspende a loja imediatamente.
        </li>
        <li>Seus dados não são apagados na suspensão ou cancelamento, para facilitar a reativação (veja a Política de Privacidade).</li>
      </ul>

      <h2>4. Responsabilidades do Vendedor</h2>
      <ul>
        <li>Garantir que as informações, preços, fotos e descrições dos produtos são verdadeiros e atualizados.</li>
        <li>Cumprir as leis aplicáveis à sua atividade, incluindo normas sanitárias, de defesa do consumidor e tributárias.</li>
        <li>Ter os direitos sobre as fotos, marcas e textos que publicar.</li>
        <li>Tratar os dados dos seus clientes (recebidos no WhatsApp) de acordo com a LGPD.</li>
      </ul>

      <h2>5. Usos proibidos</h2>
      <p>É proibido usar o {n} para:</p>
      <ul>
        <li>vender produtos ilegais, falsificados, bebidas alcoólicas para menores, medicamentos ou itens que exijam autorização que o Vendedor não possua;</li>
        <li>publicar conteúdo ofensivo, discriminatório, enganoso ou que viole direitos de terceiros;</li>
        <li>tentar acessar dados de outros usuários, sobrecarregar ou atacar o sistema.</li>
      </ul>
      <p>O descumprimento pode levar à suspensão ou encerramento da conta, sem reembolso do período em curso.</p>

      <h2>6. Conteúdo do Vendedor</h2>
      <p>
        O conteúdo publicado continua sendo do Vendedor. Você nos autoriza a armazená-lo e exibi-lo na sua loja apenas para
        prestar o serviço. A página da loja exibe um rodapé discreto &quot;Feito com {n}&quot;.
      </p>

      <h2>7. Disponibilidade e suporte</h2>
      <p>
        Trabalhamos para manter o serviço disponível, mas podem ocorrer interrupções para manutenção ou por falhas de
        fornecedores (hospedagem, e-mail, WhatsApp). O suporte é feito por e-mail.
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        O {n} não se responsabiliza por pedidos não concluídos, pagamentos entre Vendedor e cliente final, entregas, qualidade
        dos produtos, nem por indisponibilidades do WhatsApp. Na máxima extensão permitida pela lei, nossa responsabilidade
        fica limitada ao valor pago pelo Vendedor nos últimos 3 meses.
      </p>

      <h2>9. Alterações destes Termos</h2>
      <p>Podemos atualizar estes Termos. Mudanças relevantes serão avisadas por e-mail ou no painel.</p>

      <h2>10. Lei aplicável e foro</h2>
      <p>
        Estes Termos seguem as leis brasileiras. Fica eleito o foro da comarca de <Fill value={legal.forum} label="cidade/UF" />,
        ressalvado o direito do consumidor de propor ação no foro do seu domicílio.
      </p>

      <h2>11. Contato</h2>
      <p>
        Dúvidas sobre estes Termos: <Fill value={legal.privacyEmail} label="e-mail de contato" />.
      </p>
    </LegalPage>
  );
}
