/**
 * ✏️ PREENCHA AQUI os dados do responsável legal.
 * Eles aparecem nos Termos de Uso e na Política de Privacidade.
 * Enquanto um campo estiver vazio, a página mostra um aviso amarelo [PREENCHER].
 */
export const legal = {
  /** Razão social ou nome completo (se for pessoa física/MEI). Ex.: "Maria Silva Tecnologia LTDA" */
  companyName: "",
  /** CNPJ (ou CPF, se ainda não tiver empresa). Ex.: "12.345.678/0001-90" */
  document: "",
  /** Endereço completo. Ex.: "Rua X, 123, Sala 4, Centro, Campinas/SP, CEP 13000-000" */
  address: "",
  /** E-mail para assuntos legais e de privacidade (LGPD). Ex.: "privacidade@seudominio.com.br" */
  privacyEmail: "",
  /** Nome do encarregado de dados (DPO). Em empresas pequenas costuma ser o próprio dono. */
  dpoName: "",
  /** Cidade/UF do foro para resolver disputas. Ex.: "Campinas/SP" */
  forum: "",
  /** Data da última atualização dos documentos. */
  updatedAt: "19 de novembro de 2026",
} as const;
