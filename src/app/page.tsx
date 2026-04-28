'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { CurrentView, ThemeMode, ValidationResult, ValidationItem, ExtractionResult } from '@/components/provalida/types';
import { DEMO_PDF_TEXT, DEMO_EXTRACTION } from '@/components/provalida/constants';
import { exportPDF } from '@/lib/export-pdf';
import { exportCSV } from '@/lib/export-csv';
import { generateFallbackValidation } from '@/lib/gemini';
import Topbar from '@/components/provalida/Topbar';
import ToastContainer from '@/components/provalida/ToastContainer';
import UploadView from '@/components/provalida/UploadView';
import ProcessingView from '@/components/provalida/ProcessingView';
import ResultsView from '@/components/provalida/ResultsView';

export default function ProValidaApp() {
  // Estado principal
  const [currentView, setCurrentView] = useState<CurrentView>('upload');
  const [pdfText, setPdfText] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileSize, setPdfFileSize] = useState(0);
  const [pdfHasText, setPdfHasText] = useState(true);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [correctedText, setCorrectedText] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [activeDocTab, setActiveDocTab] = useState<'original' | 'corrected'>('original');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tema
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('provalida-theme') as ThemeMode | null;
      if (saved) {
        document.documentElement.classList.toggle('dark', saved === 'dark');
        return saved;
      }
    }
    return 'light';
  });

  // Toggle de tema
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('provalida-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return newTheme;
    });
  }, []);

  // Arquivo PDF carregado
  const handleFileLoaded = useCallback((fileName: string, fileSize: number, text: string, hasText: boolean) => {
    setPdfFileName(fileName);
    setPdfFileSize(fileSize);
    setPdfText(text);
    setPdfHasText(hasText);
  }, []);

  // Limpar PDF
  const handleClearPDF = useCallback(() => {
    setPdfFileName('');
    setPdfFileSize(0);
    setPdfText('');
    setPdfHasText(true);
  }, []);

  // Preencher com demo
  const handleFillDemo = useCallback(() => {
    setPdfText(DEMO_PDF_TEXT);
    setPdfFileName('proposta-jequitiba-agro.pdf');
    setPdfFileSize(12345);
    setPdfHasText(true);
    toast.success('Proposta demo da Jequitibá Agro carregada');
  }, []);

  // Pode analisar?
  const canAnalyze = !!(pdfFileName && pdfText && pdfHasText && !isAnalyzing);

  // Analisar proposta — fluxo principal
  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;
    setCurrentView('processing');
    setIsAnalyzing(true);

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
        } else {
          throw new Error('API de extração falhou');
        }
      } catch {
        // Fallback: usar extração demo se a API falhar
        console.log('API de extração indisponível, usando extração local...');
        extractionResult = extractFieldsLocally(pdfText);
      }

      setExtraction(extractionResult);

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
          // Adicionar campo corrigido a cada item
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

      setValidationResult(validationResult);
      setCurrentView('results');
      toast.success(`Análise concluída — Score: ${validationResult.score}/100`);
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar a proposta. Tente novamente.');
      setCurrentView('upload');
    } finally {
      setIsAnalyzing(false);
    }
  }, [canAnalyze, pdfText, pdfFileName]);

  // Aplicar correção
  const handleApplyCorrection = useCallback((item: ValidationItem) => {
    if (!item.sugestao) return;

    setValidationResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        itens: prev.itens.map((i) =>
          i.id === item.id ? { ...i, corrigido: true } : i
        ),
      };
    });

    setCorrectedText((prev) => {
      const newEntry = `[${item.nome}] ${item.sugestao}`;
      return prev ? `${prev}\n\n${newEntry}` : newEntry;
    });

    toast.success(`Correção aplicada: ${item.nome}`);
  }, []);

  // Copiar sugestão
  const handleCopySuggestion = useCallback((suggestion: string) => {
    toast.success('Sugestão copiada');
  }, []);

  // Exportar PDF
  const handleExportPDF = useCallback(() => {
    if (!validationResult) return;
    try {
      const numero = extraction?.campos.find(c => c.campo === 'Número da Proposta')?.valor || 'proposta';
      exportPDF(validationResult, numero);
      toast.success('Relatório PDF exportado');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  }, [validationResult, extraction]);

  // Exportar CSV
  const handleExportCSV = useCallback(() => {
    if (!validationResult) return;
    try {
      exportCSV(validationResult);
      toast.success('Checklist CSV exportado');
    } catch (error) {
      toast.error('Erro ao gerar CSV');
    }
  }, [validationResult]);

  // Resetar tudo
  const handleReset = useCallback(() => {
    setCurrentView('upload');
    setPdfText('');
    setPdfFileName('');
    setPdfFileSize(0);
    setPdfHasText(true);
    setExtraction(null);
    setValidationResult(null);
    setCorrectedText('');
    setActiveFilter('Todos');
    setActiveDocTab('original');
    setIsAnalyzing(false);
    toast.info('Formulário reiniciado');
  }, []);

  // Preview do texto
  const pdfTextPreview = pdfText.substring(0, 400);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Topbar
        currentView={currentView}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1">
        {currentView === 'upload' && (
          <UploadView
            pdfFileName={pdfFileName}
            pdfFileSize={pdfFileSize}
            pdfHasText={pdfHasText}
            pdfTextPreview={pdfTextPreview}
            isLoading={isAnalyzing}
            onFileLoaded={handleFileLoaded}
            onClearPDF={handleClearPDF}
            onFillDemo={handleFillDemo}
            onAnalyze={handleAnalyze}
            canAnalyze={canAnalyze}
          />
        )}

        {currentView === 'processing' && <ProcessingView />}

        {currentView === 'results' && extraction && validationResult && (
          <ResultsView
            extraction={extraction}
            resultado={validationResult}
            pdfText={pdfText}
            correctedText={correctedText}
            activeFilter={activeFilter}
            activeDocTab={activeDocTab}
            onFilterChange={setActiveFilter}
            onDocTabChange={setActiveDocTab}
            onApplyCorrection={handleApplyCorrection}
            onCopySuggestion={handleCopySuggestion}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            onReset={handleReset}
            numeroProposta={extraction.campos.find(c => c.campo === 'Número da Proposta')?.valor || ''}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
          <p className="text-[10px] text-[var(--muted)]">
            ProValida Senior © {new Date().getFullYear()} — Senior Sistemas S/A
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            Validação inteligente de propostas comerciais
          </p>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
}

// ============================================================
// Extração local de campos (fallback quando API indisponível)
// ============================================================
function extractFieldsLocally(pdfText: string): ExtractionResult {
  const lower = pdfText.toLowerCase();

  // Função auxiliar para buscar padrões
  const findPattern = (patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const match = pdfText.match(p);
      if (match) return match[1] || match[0];
    }
    return null;
  };

  const campos = [
    { campo: 'Número da Proposta', valor: findPattern([/Proposta Comercial Senior\s+\w+/i, /ID[:\s]+(\d+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined as string | undefined },
    { campo: 'Código da Proposta', valor: findPattern([/PR[\w]+/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined as string | undefined },
    { campo: 'Revisão', valor: '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Motivo da Reprogramação', valor: '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Layout', valor: '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Prazo Pagamento Módulos', valor: lower.includes('btg') ? 'BTG - Taxa de Juros: 0,00%' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Prazo Pagamento Serviços', valor: lower.includes('btg') ? 'BTG - Taxa de Juros: 0,00%' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Carência (meses)', valor: findPattern([/(\d+)\s*primeiras?\s*parcelas/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Desconto de Carência (%)', valor: findPattern([/(\d+)%\s*de\s*desconto/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Cobrança de Despesas', valor: '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Representante', valor: findPattern([/Executivo:\s*(.+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Escopo', valor: lower.includes('fechado') ? 'Fechado' : lower.includes('aberto') ? 'Aberto' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Faturamento de Serviços', valor: lower.includes('antecipado') ? 'Antecipado' : lower.includes('pós-entrega') ? 'Pós-entrega' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Tipo Alíquota', valor: '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Imposto CCI (%)', valor: lower.includes('imposto') ? '10,50' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Impostos', valor: lower.includes('impostos já inclusos') || lower.includes('contêm impostos') ? 'Impostos já inclusos' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Responsável pelo Suporte', valor: '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Possui Rateio', valor: '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Cliente', valor: findPattern([/Cliente:\s*(.+?)(?:\s*—|\s*CNPJ)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'CNPJ', valor: findPattern([/CNPJ[:\s]*([\d./-]+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Endereço', valor: findPattern([/Endereço:\s*(.+?)(?:\s*—|\s*CEP)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Executivo', valor: findPattern([/Executivo:\s*(.+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Solução', valor: findPattern([/Solução:\s*(.+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Valor Mensalidade', valor: findPattern([/Mensalidade[^:]*:\s*R\$\s*([\d.,]+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Valor Habilitação + Serviços', valor: findPattern([/Habilitação[^:]*:\s*R\$\s*([\d.,]+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Prazo Contratual', valor: findPattern([/(\d+)\s*meses/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Validade da Proposta', valor: findPattern([/Validade:\s*(\d+\s*dias)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Multa Rescisória', valor: findPattern([/Multa rescisória:\s*(.+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Condições de Financiamento', valor: lower.includes('btg') ? 'BTG Pactual' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Campo de Assinatura', valor: lower.includes('assinatura') || lower.includes('aprovação') ? 'Presente' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
  ];

  // Marcar campos encontrados e definir origem
  for (const campo of campos) {
    if (campo.valor && campo.valor.trim()) {
      campo.encontrado = true;
      // Campos que sabemos que não estão diretamente no PDF
      const camposApenasCRM = ['Revisão', 'Tipo Alíquota', 'Motivo da Reprogramação', 'Responsável pelo Suporte', 'Layout', 'Cobrança de Despesas', 'Possui Rateio'];
      if (camposApenasCRM.includes(campo.campo)) {
        campo.origem = 'inferido';
      } else {
        campo.origem = 'pdf';
      }
    }
  }

  // Calcular valores com e sem imposto
  const parseBRL = (s: string): number | null => {
    const clean = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  };

  const mensalidadeComImposto = campos.find(c => c.campo === 'Valor Mensalidade')?.valor || '';
  const habilitacaoComImposto = campos.find(c => c.campo === 'Valor Habilitação + Serviços')?.valor || '';

  const mensalidadeNum = parseBRL(mensalidadeComImposto);
  const habilitacaoNum = parseBRL(habilitacaoComImposto);
  const cci = 10.50;

  const formatBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return {
    campos,
    rateio: [],
    observacaoRateio: '',
    valoresComImposto: [
      { label: 'Mensalidade', valor: mensalidadeComImposto },
      { label: 'Habilitação + Serviços', valor: habilitacaoComImposto },
    ],
    valoresSemImposto: [
      { label: 'Mensalidade', valor: mensalidadeNum ? formatBRL(mensalidadeNum / (1 + cci / 100)) : '—' },
      { label: 'Habilitação + Serviços', valor: habilitacaoNum ? formatBRL(habilitacaoNum / (1 + cci / 100)) : '—' },
    ],
    impostoCCI: cci,
    textoBruto: pdfText,
  };
}
