'use client';

import type { CRMData, ValidationItem, ValidationResult } from './types';

// Tipo para campos extraídos
export interface ExtractedField {
  campo: string;
  valor: string;
  encontrado: boolean;
  origem: 'pdf' | 'inferido' | 'nao_encontrado';
  trechoPDF?: string;
}

export interface ExtractedRateio {
  conta: string;
  tipoRateio: string;
  percentual: string;
}

export interface ExtractionResult {
  campos: ExtractedField[];
  rateio: ExtractedRateio[];
  observacaoRateio: string;
  valoresComImposto: { label: string; valor: string }[];
  valoresSemImposto: { label: string; valor: string }[];
  impostoCCI: number;
  textoBruto: string;
}

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
