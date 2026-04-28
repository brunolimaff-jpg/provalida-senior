'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { CRMData, CurrentView, ThemeMode, ValidationResult, ValidationItem } from '@/components/provalida/types';
import { DEMO_CRM, DEMO_PDF_TEXT, INITIAL_CRM } from '@/components/provalida/constants';
import { callGemini } from '@/lib/gemini';
import { exportPDF } from '@/lib/export-pdf';
import { exportCSV } from '@/lib/export-csv';
import Topbar from '@/components/provalida/Topbar';
import ToastContainer from '@/components/provalida/ToastContainer';
import UploadView from '@/components/provalida/UploadView';
import ProcessingView from '@/components/provalida/ProcessingView';
import ResultsView from '@/components/provalida/ResultsView';

export default function ProValidaApp() {
  // Estado principal
  const [currentView, setCurrentView] = useState<CurrentView>('upload');
  const [crmData, setCrmData] = useState<CRMData>(INITIAL_CRM);
  const [pdfText, setPdfText] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileSize, setPdfFileSize] = useState(0);
  const [pdfHasText, setPdfHasText] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [correctedText, setCorrectedText] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [activeDocTab, setActiveDocTab] = useState<'original' | 'corrected'>('original');

  // Carregar tema do localStorage na inicialização
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

  // Preencher com dados demo
  const handleFillDemo = useCallback(() => {
    setCrmData(DEMO_CRM);
    setPdfText(DEMO_PDF_TEXT);
    setPdfFileName('proposta-demo.pdf');
    setPdfFileSize(12345);
    setPdfHasText(true);
    toast.success('Dados de demonstração preenchidos');
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

  // Verificar se pode validar
  const canValidate = !!(crmData.numeroProposta && crmData.codigoProposta && crmData.layout && crmData.prazoPagamentoModulos && crmData.prazoPagamentoServicos && crmData.escopo && crmData.faturamentoServicos && crmData.tipoAliquota && crmData.impostos && crmData.representante);

  // Validar proposta
  const handleValidate = useCallback(async () => {
    setCurrentView('processing');

    try {
      // Aguardar um mínimo de 3 segundos para a animação
      const [result] = await Promise.all([
        callGemini(crmData, pdfText, pdfHasText),
        new Promise<void>((resolve) => setTimeout(resolve, 3500))
      ]);

      setValidationResult(result);
      setCurrentView('results');
      toast.success(`Validação concluída — Score: ${result.score}/100`);
    } catch (error) {
      console.error('Erro na validação:', error);
      toast.error('Erro ao validar a proposta. Tente novamente.');
      setCurrentView('upload');
    }
  }, [crmData, pdfText, pdfHasText]);

  // Aplicar correção
  const handleApplyCorrection = useCallback((item: ValidationItem) => {
    if (!item.sugestao) return;

    // Marcar item como corrigido no resultado
    setValidationResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        itens: prev.itens.map((i) =>
          i.id === item.id ? { ...i, corrigido: true } : i
        ),
      };
    });

    // Adicionar sugestão ao texto corrigido
    setCorrectedText((prev) => {
      const newEntry = `[${item.nome}] ${item.sugestao}`;
      return prev ? `${prev}\n\n${newEntry}` : newEntry;
    });

    toast.success(`Correção aplicada: ${item.nome}`);
  }, []);

  // Copiar sugestão
  const handleCopySuggestion = useCallback((suggestion: string) => {
    toast.success('Sugestão copiada para a área de transferência');
  }, []);

  // Exportar PDF
  const handleExportPDF = useCallback(() => {
    if (!validationResult) return;
    try {
      exportPDF(validationResult, crmData.numeroProposta);
      toast.success('Relatório PDF exportado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar o relatório PDF');
    }
  }, [validationResult, crmData.numeroProposta]);

  // Exportar CSV
  const handleExportCSV = useCallback(() => {
    if (!validationResult) return;
    try {
      exportCSV(validationResult);
      toast.success('Checklist CSV exportado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao gerar o checklist CSV');
    }
  }, [validationResult]);

  // Resetar tudo
  const handleReset = useCallback(() => {
    setCurrentView('upload');
    setCrmData(INITIAL_CRM);
    setPdfText('');
    setPdfFileName('');
    setPdfFileSize(0);
    setPdfHasText(true);
    setValidationResult(null);
    setCorrectedText('');
    setActiveFilter('Todos');
    setActiveDocTab('original');
    toast.info('Formulário reiniciado');
  }, []);

  // Preview do texto do PDF (primeiros 400 caracteres)
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
            crmData={crmData}
            onCRMChange={setCrmData}
            pdfFileName={pdfFileName}
            pdfFileSize={pdfFileSize}
            pdfHasText={pdfHasText}
            pdfTextPreview={pdfTextPreview}
            onFileLoaded={handleFileLoaded}
            onClearPDF={handleClearPDF}
            onFillDemo={handleFillDemo}
            onValidate={handleValidate}
            canValidate={canValidate}
          />
        )}

        {currentView === 'processing' && <ProcessingView />}

        {currentView === 'results' && validationResult && (
          <ResultsView
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
            numeroProposta={crmData.numeroProposta}
          />
        )}
      </main>

      {/* Footer */}
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
