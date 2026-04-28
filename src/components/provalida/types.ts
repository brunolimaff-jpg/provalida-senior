export type CurrentView = 'upload' | 'processing' | 'results';
export type ValidationStatus = 'ok' | 'warning' | 'error' | 'info';
export type ValidationCategory = 'CRM Interno' | 'CRM × PDF' | 'Qualidade';
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
  itens: ValidationItem[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface AppState {
  currentView: CurrentView;
  crmData: CRMData;
  pdfText: string;
  pdfFileName: string;
  pdfFileSize: number;
  pdfHasText: boolean;
  validationResult: ValidationResult | null;
  toasts: Toast[];
  theme: ThemeMode;
  correctedText: string;
  activeFilter: string;
  activeDocTab: 'original' | 'corrected';
}
