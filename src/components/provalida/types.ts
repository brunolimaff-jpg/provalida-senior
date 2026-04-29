'use client';

// ============================================================
// Tipos para extração de propostas comerciais — ProValida Senior
// ============================================================

// --- Campo genérico extraído ---
export interface ExtractedField {
  campo: string;
  valor: string;
  encontrado: boolean;
  origem: 'pdf' | 'inferido' | 'nao_encontrado';
  trechoPDF?: string;
}

// --- Módulos ---
export interface ModuloItem {
  bloco: string;          // Ex: "Gestão de Pessoas | HCM", "Gestão Empresarial | ERP"
  modulo: string;         // Ex: "Produção HCM", "Administração de Pessoal"
  quantidade: string;     // Ex: "2", "100"
  unidade: string;        // Ex: "usuários SaaS", "colaboradores"
}

// --- Escopo ---
export interface EscopoItem {
  id: string;             // Ex: "ESCOPO_SINTETICO_372008_PM_ERP_JEQUITIBA_04082025"
  descricao?: string;     // Opcional: descrição do escopo
}

// --- Investimento ---
export interface InvestimentoItem {
  descricao: string;      // Ex: "Mensalidade", "Habilitação + Serviços"
  valorComImposto: string; // Ex: "R$ 15.240,80"
  valorSemImposto: string; // Ex: "R$ 13.792,58"
}

// --- Condições de Pagamento ---
export interface CondicaoPagamento {
  tipo: string;           // Ex: "Mensalidade", "Habilitação + Serviços"
  condicao: string;       // Ex: "06 primeiras parcelas com 50% de desconto — R$ 7.620,40"
  descontoHabilitacao?: string; // Ex: "Não informado" ou valor do desconto
  descontoServicos?: string;    // Ex: "Não informado" ou valor do desconto
}

// --- Campos que podem não estar na proposta ---
export interface CamposAusentes {
  revisao: string;                // Ex: "" (vazio = não encontrado)
  tipoAliquota: string;           // Ex: "" ou "Alíquota Média"
  impostos: string;               // Ex: "" ou "Impostos já inclusos"
  motivoReprogramacao: string;    // Ex: "" (vazio = não encontrado)
  responsavelSuporte: string;     // Ex: ""
  layout: string;                 // Ex: ""
  cobrancaDespesas: string;       // Ex: ""
  possuiRateio: string;           // Ex: ""
}

// --- Rateio ---
export interface ExtractedRateio {
  conta: string;
  tipoRateio: string;
  percentual: string;
}

// --- Resultado da extração (estruturado por seções) ---
export interface ExtractionResult {
  // Informações gerais
  cliente: string;
  cnpj: string;
  endereco: string;
  executivo: string;
  emailExecutivo?: string;
  cargoExecutivo?: string;
  numeroProposta: string;
  codigoProposta: string;
  versaoModelo?: string;

  // 1.1 MÓDULOS
  modulos: ModuloItem[];

  // 2. ESCOPO DE SERVIÇOS CONTEMPLADOS
  escopos: EscopoItem[];

  // 3. INVESTIMENTO
  investimentos: InvestimentoItem[];
  impostoCCI: number;        // Ex: 10.50
  impostosInclusos: boolean; // Se os valores já incluem impostos

  // 5. CONDIÇÕES DE PAGAMENTO
  condicoes: CondicaoPagamento[];
  prazoContratual: string;
  validadeProposta: string;
  multaRescisoria: string;
  faturamentoServicos?: string;
  financiamento?: string;

  // Campos ausentes (podem não estar na proposta)
  camposAusentes: CamposAusentes;

  // Rateio (se existir)
  rateio: ExtractedRateio[];
  observacaoRateio: string;

  // Campo de assinatura
  campoAssinatura: string;

  // Campos flat para compatibilidade com validação
  campos: ExtractedField[];

  // Texto bruto
  textoBruto: string;
}

// --- Validação ---
export type CurrentView = 'upload' | 'processing' | 'results';
export type ValidationStatus = 'ok' | 'warning' | 'error' | 'info';
export type ValidationCategory = 'CRM Interno' | 'CRM × PDF' | 'Qualidade' | 'Campo Exclusivo CRM';
export type ThemeMode = 'light' | 'dark';

export interface ContaRateio {
  id: string;
  conta: string;
  percentual: string;
}

export interface CRMData {
  numeroProposta: string;
  codigoProposta: string;
  revisao: number;
  motivoReprogramacao: string;
  layout: string;
  prazoPagamentoModulos: string;
  prazoPagamentoServicos: string;
  carenciaMeses: number;
  descontoCarencia: number;
  cobrancaDespesas: string;
  representante: string;
  escopo: string;
  faturamentoServicos: string;
  tipoAliquota: string;
  impostoCCI: number;
  impostos: string;
  responsavelSuporte: string;
  possuiRateio: string;
  contasRateio: ContaRateio[];
}

export interface ValidationItem {
  id: string;
  nome: string;
  categoria: ValidationCategory;
  status: ValidationStatus;
  valorCRM: string | null;
  evidenciaPDF: string;
  mensagem: string;
  sugestao: string | null;
  corrigido: boolean;
}

export interface ValidationResult {
  score: number;
  classificacao: string;
  resumo: string;
  camposCRMNaoEncontrados?: string[];
  itens: ValidationItem[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}
