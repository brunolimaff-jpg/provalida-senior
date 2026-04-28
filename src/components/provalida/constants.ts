import type { CRMData } from './types';

export const DEMO_CRM: CRMData = {
  numeroProposta: "428658",
  codigoProposta: "PR372150V1MH",
  revisao: 7,
  motivoReprogramacao: "",
  layout: "Layout Demandas Avulsas",
  prazoPagamentoModulos: "BTG - Taxa de Juros: 0,00%",
  prazoPagamentoServicos: "BTG - Taxa de Juros: 0,00%",
  carenciaMeses: 6,
  descontoCarencia: 50,
  cobrancaDespesas: "Regras de deslocamento padrão Senior",
  representante: "Senior Filial MT",
  escopo: "Fechado",
  faturamentoServicos: "Antecipado",
  tipoAliquota: "Alíquota Média",
  impostoCCI: 10.50,
  impostos: "Impostos já inclusos",
  responsavelSuporte: "Senior Matriz",
  possuiRateio: "Sim",
  contasRateio: [
    { id: "1", conta: "[ID ERP: 36862] JEQUITIBA AGRO LTDA", percentual: "" },
    { id: "2", conta: "[ID ERP: 36862] JEQUITIBA AGRO LTDA", percentual: "" }
  ]
};

export const DEMO_PDF_TEXT = `Proposta Comercial Senior PR372150V1MH — 15/07/2025
Cliente: Jequitibá Agro LTDA — CNPJ: 40.494.738/0001-77
Endereço: Rod MT 129, Km 05, S/N — Gaúcha do Norte, MT — CEP: 78875-000
Executivo: Bruno Lima Freitas Ferreira — bruno.ferreira@senior.com.br
Solução: HCM + ERP + Senior GAtec — SaaS
Mensalidade (com impostos): R$ 15.240,80
Habilitação + Serviços (com impostos): R$ 550.523,95
CONDIÇÕES: Financiamento Banco BTG Pactual. Prazo: 15 dias corridos.
Cancelamento automático se financiamento não concluído no prazo.
Faturamento ANTECIPADO — no momento da assinatura.
06 primeiras parcelas com 50% de desconto — R$ 7.620,40.
Todos os valores contêm impostos. Prazo mínimo: 36 meses.
Validade: 60 dias. Multa rescisória: 35%/30%/25%.
Aprovação: _________________________ Nome | Cargo | Data | Assinatura`;

export const INITIAL_CRM: CRMData = {
  numeroProposta: "",
  codigoProposta: "",
  revisao: 1,
  motivoReprogramacao: "",
  layout: "",
  prazoPagamentoModulos: "",
  prazoPagamentoServicos: "",
  carenciaMeses: 0,
  descontoCarencia: 0,
  cobrancaDespesas: "",
  representante: "",
  escopo: "",
  faturamentoServicos: "",
  tipoAliquota: "",
  impostoCCI: 0,
  impostos: "",
  responsavelSuporte: "",
  possuiRateio: "Não",
  contasRateio: [{ id: "1", conta: "", percentual: "" }]
};

export const LAYOUT_OPTIONS = [
  "Layout Demandas Avulsas",
  "Layout Proposta Padrão",
  "Layout ERP Completo",
  "Outro"
];

export const PRAZO_OPTIONS = [
  "BTG - Taxa de Juros: 0,00%",
  "À Vista",
  "30/60/90 dias",
  "Outro"
];

export const COBRANCA_OPTIONS = [
  "Regras de deslocamento padrão Senior",
  "Sem cobrança",
  "Personalizado"
];

export const ESCOPO_OPTIONS = ["Fechado", "Aberto"];
export const FATURAMENTO_OPTIONS = ["Antecipado", "Pós-entrega"];
export const ALIQUOTA_OPTIONS = ["Alíquota Média", "Simples Nacional", "Lucro Real", "Lucro Presumido"];
export const IMPOSTOS_OPTIONS = ["Impostos já inclusos", "Impostos não inclusos"];

export const PROCESSING_STEPS = [
  "Lendo o arquivo PDF...",
  "Verificando campos do CRM entre si...",
  "Cruzando CRM com o conteúdo do PDF...",
  "Consultando Gemini para diagnóstico...",
  "Preparando resultados..."
];
