/**
 * Hook customizado: useProposalAnalysis — ProValida Senior
 * Orquestra todo o fluxo de análise de propostas comerciais:
 * 1. Upload do PDF → extração de texto
 * 2. Extração de campos via API (ou fallback local)
 * 3. Complementação com extração local
 * 4. Validação via API (ou fallback local)
 * 5. Exportação de resultados
 *
 * Separa a lógica de negócio da apresentação (page.tsx).
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { CurrentView, ThemeMode, ValidationResult, ValidationItem, ExtractionResult } from '@/components/provalida/types';
import { DEMO_PDF_TEXT } from '@/components/provalida/constants';
import { exportPDF } from '@/lib/export-pdf';
import { exportCSV } from '@/lib/export-csv';
import { generateFallbackValidation } from '@/lib/gemini';
import { complementarComExtracaoLocal, validarERecalcularInvestimentos } from '@/services/field-complement';
import { extractFieldsLocally } from '@/services/local-extraction';

// ============================================================
// Estado do hook
// ============================================================

interface ProposalAnalysisState {
  currentView: CurrentView;
  pdfText: string;
  pdfFileName: string;
  pdfFileSize: number;
  pdfHasText: boolean;
  extraction: ExtractionResult | null;
  validationResult: ValidationResult | null;
  activeFilter: string;
  isAnalyzing: boolean;
  theme: ThemeMode;
}

const initialState: ProposalAnalysisState = {
  currentView: 'upload',
  pdfText: '',
  pdfFileName: '',
  pdfFileSize: 0,
  pdfHasText: true,
  extraction: null,
  validationResult: null,
  activeFilter: 'Todos',
  isAnalyzing: false,
  theme: 'light',
};

// ============================================================
// Hook
// ============================================================

export function useProposalAnalysis() {
  const [state, setState] = useState<ProposalAnalysisState>(() => {
    // Restaurar tema salvo
    let theme: ThemeMode = 'light';
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('provalida-theme') as ThemeMode | null;
      if (saved) {
        theme = saved;
        document.documentElement.classList.toggle('dark', saved === 'dark');
      }
    }
    return { ...initialState, theme };
  });

  // ============================================================
  // Tema
  // ============================================================

  const toggleTheme = useCallback(() => {
    setState(prev => {
      const newTheme = prev.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('provalida-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return { ...prev, theme: newTheme };
    });
  }, []);

  // ============================================================
  // Upload do PDF
  // ============================================================

  const handleFileLoaded = useCallback((fileName: string, fileSize: number, text: string, hasText: boolean) => {
    setState(prev => ({
      ...prev,
      pdfFileName: fileName,
      pdfFileSize: fileSize,
      pdfText: text,
      pdfHasText: hasText,
    }));
  }, []);

  const handleClearPDF = useCallback(() => {
    setState(prev => ({
      ...prev,
      pdfFileName: '',
      pdfFileSize: 0,
      pdfText: '',
      pdfHasText: true,
    }));
  }, []);

  const handleFillDemo = useCallback(() => {
    setState(prev => ({
      ...prev,
      pdfText: DEMO_PDF_TEXT,
      pdfFileName: 'proposta-jequitiba-agro.pdf',
      pdfFileSize: 12345,
      pdfHasText: true,
    }));
    toast.success('Proposta demo da Jequitibá Agro carregada');
  }, []);

  // ============================================================
  // Pode analisar?
  // ============================================================

  const canAnalyze = !!(state.pdfFileName && state.pdfText && state.pdfHasText && !state.isAnalyzing);

  // ============================================================
  // Analisar proposta — fluxo principal
  // ============================================================

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;

    setState(prev => ({ ...prev, currentView: 'processing', isAnalyzing: true }));

    try {
      const { pdfText, pdfFileName } = state;

      // Passo 1: Extrair campos da proposta via API
      let extractionResult: ExtractionResult;

      try {
        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfText, fileName: pdfFileName }),
        });

        if (extractRes.ok) {
          extractionResult = await extractRes.json();
          // Garantir campos obrigatórios e normalizar dados da API
          extractionResult.textoBruto = extractionResult.textoBruto || pdfText;
          extractionResult.modulos = extractionResult.modulos || [];
          extractionResult.escopos = extractionResult.escopos || [];
          extractionResult.condicoes = extractionResult.condicoes || [];
          extractionResult.camposAusentes = extractionResult.camposAusentes || {
            revisao: '', tipoAliquota: '', impostos: '', motivoReprogramacao: '',
            responsavelSuporte: '', layout: '', cobrancaDespesas: '', possuiRateio: ''
          };
          extractionResult.rateio = extractionResult.rateio || [];
          extractionResult.campos = extractionResult.campos || [];

          // Complementar dados faltantes com extração local do texto
          extractionResult = complementarComExtracaoLocal(extractionResult, pdfText);

          // Recalcular e validar investimentos
          extractionResult.investimentos = validarERecalcularInvestimentos(
            extractionResult.investimentos || [],
            extractionResult.impostoCCI || 10.50,
            extractionResult.impostosInclusos ?? true,
            pdfText
          );
        } else {
          throw new Error('API de extração falhou');
        }
      } catch {
        // Fallback: usar extração local se a API falhar
        console.log('API de extração indisponível, usando extração local...');
        extractionResult = extractFieldsLocally(pdfText);
      }

      // Passo 2: Validar campos extraídos via API
      let validationResult: ValidationResult;

      try {
        const validateRes = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campos: extractionResult.campos,
            pdfText: extractionResult.textoBruto,
          }),
        });

        if (validateRes.ok) {
          validationResult = await validateRes.json();
          validationResult.itens = validationResult.itens.map((item: ValidationItem) => ({
            ...item,
            corrigido: false,
          }));
        } else {
          throw new Error('API de validação falhou');
        }
      } catch {
        // Fallback: validação local
        console.log('API de validação indisponível, usando validação local...');
        validationResult = generateFallbackValidation(
          extractionResult.campos,
          extractionResult.textoBruto,
          true
        );
      }

      setState(prev => ({
        ...prev,
        extraction: extractionResult,
        validationResult,
        currentView: 'results',
        isAnalyzing: false,
      }));

      toast.success(`Análise concluída — Score: ${validationResult.score}/100`);
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar a proposta. Tente novamente.');
      setState(prev => ({ ...prev, currentView: 'upload', isAnalyzing: false }));
    }
  }, [canAnalyze, state.pdfText, state.pdfFileName]);

  // ============================================================
  // Ações de validação
  // ============================================================

  const handleCopySuggestion = useCallback((_suggestion: string) => {
    toast.success('Sugestão copiada');
  }, []);

  const handleApplyCorrection = useCallback((item: ValidationItem) => {
    if (!item.sugestao) return;

    setState(prev => {
      if (!prev.validationResult) return prev;
      return {
        ...prev,
        validationResult: {
          ...prev.validationResult,
          itens: prev.validationResult.itens.map(i =>
            i.id === item.id ? { ...i, corrigido: true } : i
          ),
        },
      };
    });

    toast.success(`Correção aplicada: ${item.nome}`);
  }, []);

  // ============================================================
  // Exportação
  // ============================================================

  const handleExportPDF = useCallback(() => {
    if (!state.validationResult) return;
    try {
      const numero = state.extraction?.codigoProposta || 'proposta';
      exportPDF(state.validationResult, numero);
      toast.success('Relatório PDF exportado');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  }, [state.validationResult, state.extraction]);

  const handleExportCSV = useCallback(() => {
    if (!state.validationResult) return;
    try {
      exportCSV(state.validationResult);
      toast.success('Checklist CSV exportado');
    } catch {
      toast.error('Erro ao gerar CSV');
    }
  }, [state.validationResult]);

  // ============================================================
  // Filtros e reset
  // ============================================================

  const handleFilterChange = useCallback((filter: string) => {
    setState(prev => ({ ...prev, activeFilter: filter }));
  }, []);

  const handleReset = useCallback(() => {
    setState({ ...initialState, theme: state.theme });
    toast.info('Formulário reiniciado');
  }, [state.theme]);

  // ============================================================
  // Derivações
  // ============================================================

  const pdfTextPreview = state.pdfText.substring(0, 400);

  // ============================================================
  // Retorno
  // ============================================================

  return {
    // Estado
    ...state,
    pdfTextPreview,
    canAnalyze,

    // Ações
    toggleTheme,
    handleFileLoaded,
    handleClearPDF,
    handleFillDemo,
    handleAnalyze,
    handleCopySuggestion,
    handleApplyCorrection,
    handleExportPDF,
    handleExportCSV,
    handleFilterChange,
    handleReset,
  };
}
