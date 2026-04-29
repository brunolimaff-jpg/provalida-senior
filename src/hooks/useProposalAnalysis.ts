'use client';

/**
 * Hook customizado: useProposalAnalysis — ProValida Senior
 * Orquestra todo o fluxo de análise de propostas comerciais.
 * Separa a lógica de negócio da apresentação (page.tsx).
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { CurrentView, ThemeMode, ValidationResult, ValidationItem, ExtractionResult } from '@/components/provalida/types';
import { DEMO_PDF_TEXT } from '@/components/provalida/constants';
import { exportPDF } from '@/lib/export-pdf';
import { exportCSV } from '@/lib/export-csv';
import { generateFallbackValidation } from '@/lib/gemini';
import { complementarComExtracaoLocal, validarERecalcularInvestimentos } from '@/services/field-complement';
import { extractFieldsLocally } from '@/services/local-extraction';

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

export function useProposalAnalysis() {
  const [state, setState] = useState<ProposalAnalysisState>(() => {
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

  // Ref para acessar estado atual dentro de callbacks assíncronos
  const stateRef = useRef(state);
  stateRef.current = state;

  // Tema
  const toggleTheme = useCallback(() => {
    setState(prev => {
      const newTheme = prev.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('provalida-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return { ...prev, theme: newTheme };
    });
  }, []);

  // Upload do PDF
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

  const canAnalyze = !!(state.pdfFileName && state.pdfText && state.pdfHasText && !state.isAnalyzing);

  // Analisar proposta — fluxo principal
  const handleAnalyze = useCallback(async () => {
    // Usar ref para pegar estado mais atual
    const { pdfText, pdfFileName } = stateRef.current;
    if (!pdfText || !pdfFileName) return;

    setState(prev => ({ ...prev, currentView: 'processing', isAnalyzing: true }));

    try {
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
          // Garantir campos obrigatórios
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

          // Complementar dados faltantes com extração local
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
      } catch (err) {
        console.log('API de extração indisponível, usando extração local...', err);
        extractionResult = extractFieldsLocally(pdfText);
        // Complementar dados faltantes com extração local (garantir consistência)
        extractionResult = complementarComExtracaoLocal(extractionResult, pdfText);
        extractionResult.investimentos = validarERecalcularInvestimentos(
          extractionResult.investimentos || [],
          extractionResult.impostoCCI || 10.50,
          extractionResult.impostosInclusos ?? true,
          pdfText
        );
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
      } catch (err) {
        console.log('API de validação indisponível, usando validação local...', err);
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
  }, []); // Sem deps — usa stateRef para estado atual

  // Ações de validação
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

  // Exportação
  const handleExportPDF = useCallback(() => {
    const { validationResult, extraction } = stateRef.current;
    if (!validationResult) return;
    try {
      const numero = extraction?.codigoProposta || 'proposta';
      exportPDF(validationResult, numero, extraction || undefined);
      toast.success('Relatório PDF exportado');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    const { validationResult, extraction } = stateRef.current;
    if (!validationResult) return;
    try {
      exportCSV(validationResult, extraction || undefined);
      toast.success('Checklist CSV exportado');
    } catch {
      toast.error('Erro ao gerar CSV');
    }
  }, []);

  // Filtros e reset
  const handleFilterChange = useCallback((filter: string) => {
    setState(prev => ({ ...prev, activeFilter: filter }));
  }, []);

  const handleReset = useCallback(() => {
    setState(prev => ({ ...initialState, theme: prev.theme }));
    toast.info('Formulário reiniciado');
  }, []);

  const pdfTextPreview = state.pdfText.substring(0, 400);

  return {
    ...state,
    pdfTextPreview,
    canAnalyze,
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
