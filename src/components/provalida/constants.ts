import type { ExtractionResult } from './types';

// Texto demo da proposta Jequitibá Agro
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

// Resultado de extração demo (simula o que a IA retornaria)
export const DEMO_EXTRACTION: ExtractionResult = {
  campos: [
    { campo: 'Número da Proposta', valor: '428658', encontrado: true, origem: 'pdf', trechoPDF: 'Proposta Comercial Senior PR372150V1MH' },
    { campo: 'Código da Proposta', valor: 'PR372150V1MH', encontrado: true, origem: 'pdf', trechoPDF: 'Senior PR372150V1MH' },
    { campo: 'Revisão', valor: '', encontrado: false, origem: 'nao_encontrado', trechoPDF: undefined },
    { campo: 'Motivo da Reprogramação', valor: '', encontrado: false, origem: 'nao_encontrado', trechoPDF: undefined },
    { campo: 'Layout', valor: '', encontrado: false, origem: 'nao_encontrado', trechoPDF: undefined },
    { campo: 'Prazo Pagamento Módulos', valor: 'BTG - Taxa de Juros: 0,00%', encontrado: true, origem: 'inferido', trechoPDF: 'Financiamento Banco BTG Pactual' },
    { campo: 'Prazo Pagamento Serviços', valor: 'BTG - Taxa de Juros: 0,00%', encontrado: true, origem: 'inferido', trechoPDF: 'Financiamento Banco BTG Pactual' },
    { campo: 'Carência (meses)', valor: '6', encontrado: true, origem: 'pdf', trechoPDF: '06 primeiras parcelas com 50% de desconto' },
    { campo: 'Desconto de Carência (%)', valor: '50', encontrado: true, origem: 'pdf', trechoPDF: '06 primeiras parcelas com 50% de desconto' },
    { campo: 'Cobrança de Despesas', valor: '', encontrado: false, origem: 'nao_encontrado', trechoPDF: undefined },
    { campo: 'Representante', valor: 'Senior Filial MT', encontrado: true, origem: 'inferido', trechoPDF: 'Bruno Lima Freitas Ferreira — bruno.ferreira@senior.com.br' },
    { campo: 'Escopo', valor: 'Fechado', encontrado: true, origem: 'inferido', trechoPDF: 'Solução: HCM + ERP + Senior GAtec — SaaS' },
    { campo: 'Faturamento de Serviços', valor: 'Antecipado', encontrado: true, origem: 'pdf', trechoPDF: 'Faturamento ANTECIPADO — no momento da assinatura' },
    { campo: 'Tipo Alíquota', valor: '', encontrado: false, origem: 'nao_encontrado', trechoPDF: undefined },
    { campo: 'Imposto CCI (%)', valor: '10,50', encontrado: true, origem: 'inferido', trechoPDF: 'Todos os valores contêm impostos' },
    { campo: 'Impostos', valor: 'Impostos já inclusos', encontrado: true, origem: 'inferido', trechoPDF: 'Todos os valores contêm impostos' },
    { campo: 'Responsável pelo Suporte', valor: '', encontrado: false, origem: 'nao_encontrado', trechoPDF: undefined },
    { campo: 'Possui Rateio', valor: '', encontrado: false, origem: 'nao_encontrado', trechoPDF: undefined },
    { campo: 'Cliente', valor: 'Jequitibá Agro LTDA', encontrado: true, origem: 'pdf', trechoPDF: 'Cliente: Jequitibá Agro LTDA' },
    { campo: 'CNPJ', valor: '40.494.738/0001-77', encontrado: true, origem: 'pdf', trechoPDF: 'CNPJ: 40.494.738/0001-77' },
    { campo: 'Endereço', valor: 'Rod MT 129, Km 05, S/N — Gaúcha do Norte, MT — CEP: 78875-000', encontrado: true, origem: 'pdf', trechoPDF: 'Endereço: Rod MT 129, Km 05, S/N — Gaúcha do Norte, MT' },
    { campo: 'Executivo', valor: 'Bruno Lima Freitas Ferreira', encontrado: true, origem: 'pdf', trechoPDF: 'Executivo: Bruno Lima Freitas Ferreira' },
    { campo: 'Solução', valor: 'HCM + ERP + Senior GAtec — SaaS', encontrado: true, origem: 'pdf', trechoPDF: 'Solução: HCM + ERP + Senior GAtec — SaaS' },
    { campo: 'Valor Mensalidade', valor: 'R$ 15.240,80', encontrado: true, origem: 'pdf', trechoPDF: 'Mensalidade (com impostos): R$ 15.240,80' },
    { campo: 'Valor Habilitação + Serviços', valor: 'R$ 550.523,95', encontrado: true, origem: 'pdf', trechoPDF: 'Habilitação + Serviços (com impostos): R$ 550.523,95' },
    { campo: 'Prazo Contratual', valor: '36 meses', encontrado: true, origem: 'pdf', trechoPDF: 'Prazo mínimo: 36 meses' },
    { campo: 'Validade da Proposta', valor: '60 dias', encontrado: true, origem: 'pdf', trechoPDF: 'Validade: 60 dias' },
    { campo: 'Multa Rescisória', valor: '35%/30%/25%', encontrado: true, origem: 'pdf', trechoPDF: 'Multa rescisória: 35%/30%/25%' },
    { campo: 'Condições de Financiamento', valor: 'Financiamento Banco BTG Pactual — Prazo: 15 dias — Cancelamento automático', encontrado: true, origem: 'pdf', trechoPDF: 'Financiamento Banco BTG Pactual. Prazo: 15 dias corridos. Cancelamento automático' },
    { campo: 'Campo de Assinatura', valor: 'Presente', encontrado: true, origem: 'pdf', trechoPDF: 'Aprovação: _________________________ Nome | Cargo | Data | Assinatura' },
  ],
  rateio: [
    { conta: 'Jequitibá Agro LTDA', tipoRateio: 'Licenças', percentual: '100.00' },
    { conta: 'Jequitibá Agro LTDA', tipoRateio: 'Serviços', percentual: '100.00' },
  ],
  observacaoRateio: 'Pagamento pelo BTG.',
  valoresComImposto: [
    { label: 'Mensalidade', valor: 'R$ 15.240,80' },
    { label: 'Habilitação + Serviços', valor: 'R$ 550.523,95' },
  ],
  valoresSemImposto: [
    { label: 'Mensalidade', valor: 'R$ 13.792,58' },
    { label: 'Habilitação + Serviços', valor: 'R$ 498.218,10' },
  ],
  impostoCCI: 10.50,
  textoBruto: DEMO_PDF_TEXT,
};

export const PROCESSING_STEPS = [
  'Lendo o arquivo PDF...',
  'Extraindo campos com IA...',
  'Calculando valores com e sem impostos...',
  'Validando regras de negócio...',
  'Preparando resultados...'
];
