import type { ExtractionResult } from './types';

// Texto demo da proposta Jequitibá Agro (mais realista com estrutura de seções)
export const DEMO_PDF_TEXT = `Proposta Comercial Senior PR372150V1MH — 15/07/2025
Modelo de Documento: 2025 | Versão 08 | 15/07/2025

Cliente: Jequitibá Agro LTDA — CNPJ: 40.494.738/0001-77
Endereço: Rod MT 129, Km 05, S/N — Gaúcha do Norte, MT — CEP: 78875-000
Executivo de Contas: Bruno Lima Freitas Ferreira — bruno.ferreira@senior.com.br

1.1 MÓDULOS
Gestão de Pessoas | HCM
Módulos Contemplados | Quantidade Adquirida | Modalidade
Produção HCM | 2 | Usuário SaaS
Homologação HCM | 1 | Usuário SaaS
Administração de Pessoal | 100 | Colaboradores
Analisador de Impacto eSocial | 100 | Colaboradores
Documentos Eletrônicos eSocial | 100 | Colaboradores
Solução de Ponto Senior | 100 | Colaboradores

Gestão Empresarial | ERP
Módulos Contemplados | Quantidade Adquirida | Modalidade
Produção ERP | 2 | Usuário SaaS
Homologação ERP | 1 | Usuário SaaS
Contabilidade | 1 | Empresa
Escrita Fiscal | 1 | Empresa
Finanças | 1 | Empresa
Compras | 1 | Empresa

2. ESCOPO DE SERVIÇOS CONTEMPLADOS
ESCOPO_SINTETICO_372008_PM_ERP_JEQUITIBA_04082025
ESCOPO_SINTETICO_371967_[BV]_HCM_JEQUITIBA_04082025

3. INVESTIMENTO
Mensalidade (com impostos): R$ 15.240,80
Habilitação + Serviços (com impostos): R$ 550.523,95
Todos os valores contêm impostos de 10,50% (CCI).
Impostos já inclusos nos valores apresentados.

5. CONDIÇÕES DE PAGAMENTO
Mensalidade:
06 primeiras parcelas com 50% de desconto — R$ 7.620,40
Parcelas subsequentes (a partir do 7o mês) — R$ 15.240,80
Financiamento Banco BTG Pactual. Prazo: 15 dias corridados.
Cancelamento automático se financiamento não concluído no prazo.

Habilitação + Serviços:
Pagamento à vista ou financiado via BTG Pactual.
Desconto de habilitação: Não informado
Desconto de serviços: Não informado

Faturamento ANTECIPADO — no momento da assinatura.
Prazo mínimo: 36 meses. Validade: 60 dias.
Multa rescisória: 35%/30%/25%.

Aprovação: _________________________ Nome | Cargo | Data | Assinatura`;

// Resultado de extração demo (simula o que a IA retornaria) — agora estruturado por seções
export const DEMO_EXTRACTION: ExtractionResult = {
  cliente: 'Jequitibá Agro LTDA',
  cnpj: '40.494.738/0001-77',
  endereco: 'Rod MT 129, Km 05, S/N — Gaúcha do Norte, MT — CEP: 78875-000',
  executivo: 'Bruno Lima Freitas Ferreira',
  emailExecutivo: 'bruno.ferreira@senior.com.br',
  cargoExecutivo: 'Executivo de Contas',
  numeroProposta: '428658',
  codigoProposta: 'PR372150V1MH',
  versaoModelo: '2025 | Versão 08 | 15/07/2025',

  // 1.1 MÓDULOS
  modulos: [
    // Bloco: Gestão de Pessoas | HCM
    { bloco: 'Gestão de Pessoas | HCM', modulo: 'Produção HCM', quantidade: '2', unidade: 'Usuários SaaS' },
    { bloco: 'Gestão de Pessoas | HCM', modulo: 'Homologação HCM', quantidade: '1', unidade: 'Usuário SaaS' },
    { bloco: 'Gestão de Pessoas | HCM', modulo: 'Administração de Pessoal', quantidade: '100', unidade: 'Colaboradores' },
    { bloco: 'Gestão de Pessoas | HCM', modulo: 'Analisador de Impacto eSocial', quantidade: '100', unidade: 'Colaboradores' },
    { bloco: 'Gestão de Pessoas | HCM', modulo: 'Documentos Eletrônicos eSocial', quantidade: '100', unidade: 'Colaboradores' },
    { bloco: 'Gestão de Pessoas | HCM', modulo: 'Solução de Ponto Senior', quantidade: '100', unidade: 'Colaboradores' },
    // Bloco: Gestão Empresarial | ERP
    { bloco: 'Gestão Empresarial | ERP', modulo: 'Produção ERP', quantidade: '2', unidade: 'Usuários SaaS' },
    { bloco: 'Gestão Empresarial | ERP', modulo: 'Homologação ERP', quantidade: '1', unidade: 'Usuário SaaS' },
    { bloco: 'Gestão Empresarial | ERP', modulo: 'Contabilidade', quantidade: '1', unidade: 'Empresa' },
    { bloco: 'Gestão Empresarial | ERP', modulo: 'Escrita Fiscal', quantidade: '1', unidade: 'Empresa' },
    { bloco: 'Gestão Empresarial | ERP', modulo: 'Finanças', quantidade: '1', unidade: 'Empresa' },
    { bloco: 'Gestão Empresarial | ERP', modulo: 'Compras', quantidade: '1', unidade: 'Empresa' },
  ],

  // 2. ESCOPO DE SERVIÇOS CONTEMPLADOS
  escopos: [
    { id: 'ESCOPO_SINTETICO_372008_PM_ERP_JEQUITIBA_04082025' },
    { id: 'ESCOPO_SINTETICO_371967_[BV]_HCM_JEQUITIBA_04082025' },
  ],

  // 3. INVESTIMENTO
  investimentos: [
    { descricao: 'Mensalidade', valorComImposto: 'R$ 15.240,80', valorSemImposto: 'R$ 13.792,58' },
    { descricao: 'Habilitação + Serviços', valorComImposto: 'R$ 550.523,95', valorSemImposto: 'R$ 498.218,10' },
  ],
  impostoCCI: 10.50,
  impostosInclusos: true,

  // 5. CONDIÇÕES DE PAGAMENTO
  condicoes: [
    {
      tipo: 'Mensalidade',
      condicao: '06 primeiras parcelas com 50% de desconto — R$ 7.620,40\nParcelas subsequentes (a partir do 7o mês) — R$ 15.240,80',
      descontoHabilitacao: 'Não informado',
      descontoServicos: 'Não informado',
    },
    {
      tipo: 'Habilitação + Serviços',
      condicao: 'Pagamento à vista ou financiado via BTG Pactual.',
      descontoHabilitacao: 'Não informado',
      descontoServicos: 'Não informado',
    },
  ],
  prazoContratual: '36 meses',
  validadeProposta: '60 dias',
  multaRescisoria: '35%/30%/25%',
  faturamentoServicos: 'Antecipado',
  financiamento: 'Financiamento Banco BTG Pactual — Prazo: 15 dias — Cancelamento automático',

  // Campos ausentes (podem não estar na proposta)
  camposAusentes: {
    revisao: '',
    tipoAliquota: '',
    impostos: 'Impostos já inclusos',
    motivoReprogramacao: '',
    responsavelSuporte: '',
    layout: '',
    cobrancaDespesas: '',
    possuiRateio: '',
  },

  // Rateio
  rateio: [
    { conta: 'Jequitibá Agro LTDA', tipoRateio: 'Licenças', percentual: '100.00' },
    { conta: 'Jequitibá Agro LTDA', tipoRateio: 'Serviços', percentual: '100.00' },
  ],
  observacaoRateio: 'Pagamento pelo BTG.',

  // Campo de assinatura
  campoAssinatura: 'Presente',

  // Campos flat para compatibilidade com validação
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
    { campo: 'Endereço', valor: 'Rod MT 129, Km 05, S/N — Gaúcha do Norte, MT — CEP: 78875-000', encontrado: true, origem: 'pdf', trechoPDF: 'Endereço: Rod MT 129, Km 05, S/N' },
    { campo: 'Executivo', valor: 'Bruno Lima Freitas Ferreira', encontrado: true, origem: 'pdf', trechoPDF: 'Executivo de Contas: Bruno Lima Freitas Ferreira' },
    { campo: 'Solução', valor: 'HCM + ERP — SaaS', encontrado: true, origem: 'pdf', trechoPDF: '1.1 MÓDULOS Gestão de Pessoas | HCM / Gestão Empresarial | ERP' },
    { campo: 'Valor Mensalidade', valor: 'R$ 15.240,80', encontrado: true, origem: 'pdf', trechoPDF: 'Mensalidade (com impostos): R$ 15.240,80' },
    { campo: 'Valor Habilitação + Serviços', valor: 'R$ 550.523,95', encontrado: true, origem: 'pdf', trechoPDF: 'Habilitação + Serviços (com impostos): R$ 550.523,95' },
    { campo: 'Prazo Contratual', valor: '36 meses', encontrado: true, origem: 'pdf', trechoPDF: 'Prazo mínimo: 36 meses' },
    { campo: 'Validade da Proposta', valor: '60 dias', encontrado: true, origem: 'pdf', trechoPDF: 'Validade: 60 dias' },
    { campo: 'Multa Rescisória', valor: '35%/30%/25%', encontrado: true, origem: 'pdf', trechoPDF: 'Multa rescisória: 35%/30%/25%' },
    { campo: 'Condições de Financiamento', valor: 'Financiamento Banco BTG Pactual — Prazo: 15 dias — Cancelamento automático', encontrado: true, origem: 'pdf', trechoPDF: 'Financiamento Banco BTG Pactual. Prazo: 15 dias corridados.' },
    { campo: 'Campo de Assinatura', valor: 'Presente', encontrado: true, origem: 'pdf', trechoPDF: 'Aprovação: _________________________ Nome | Cargo | Data | Assinatura' },
  ],

  textoBruto: DEMO_PDF_TEXT,
};

export const PROCESSING_STEPS = [
  'Lendo o arquivo PDF...',
  'Extraindo campos com IA...',
  'Organizando seções da proposta...',
  'Calculando valores com e sem impostos...',
  'Preparando resultados...'
];

export const LAYOUT_OPTIONS = [
  'Senior',
  'Cliente',
  'Parceiro',
  'Personalizado',
];

export const PRAZO_OPTIONS = [
  'À vista',
  '15 dias',
  '20 dias',
  '30 dias',
  'BTG - Taxa de Juros: 0,00%',
];

export const COBRANCA_OPTIONS = [
  'Não cobrar',
  'Conforme RDV',
  '14 dias após RDV',
  'Reembolsável',
];

export const ESCOPO_OPTIONS = [
  'Aberto',
  'Fechado',
  'Sob demanda',
];

export const FATURAMENTO_OPTIONS = [
  'Antecipado',
  'Pós-entrega',
  'Mensal',
  'Por pacote',
  'Por marco',
];

export const ALIQUOTA_OPTIONS = [
  'Alíquota padrão',
  'Alíquota média',
  'Sem incidência',
];

export const IMPOSTOS_OPTIONS = [
  'Impostos já inclusos',
  'Impostos não inclusos',
  'Verificar com fiscal',
];
