'use client';

import Topbar from '@/components/provalida/Topbar';
import ToastContainer from '@/components/provalida/ToastContainer';
import UploadView from '@/components/provalida/UploadView';
import ProcessingView from '@/components/provalida/ProcessingView';
import ResultsView from '@/components/provalida/ResultsView';
import { useProposalAnalysis } from '@/hooks/useProposalAnalysis';

/**
 * ProValida Senior — Página principal
 * Thin shell: toda a lógica de negócio está no hook useProposalAnalysis()
 * e nos módulos de serviço (services/).
 */
export default function ProValidaApp() {
  const {
    currentView,
    theme,
    pdfFileName,
    pdfFileSize,
    pdfHasText,
    pdfTextPreview,
    isAnalyzing,
    extraction,
    validationResult,
    activeFilter,
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
  } = useProposalAnalysis();

  return (
    <div className={`min-h-screen flex flex-col ${currentView === 'results' ? 'bg-white' : 'bg-[var(--background)]'}`}>
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
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            onApplyCorrection={handleApplyCorrection}
            onCopySuggestion={handleCopySuggestion}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            onReset={handleReset}
            numeroProposta={extraction.codigoProposta || ''}
          />
        )}
      </main>

      <footer className={`mt-auto border-t border-[var(--border)] py-3 ${currentView === 'results' ? 'bg-white' : 'bg-[var(--surface)]'}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
          <p className="text-[10px] text-[var(--muted-foreground)]">
            ProValida Senior © {new Date().getFullYear()} — Senior Sistemas S/A
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Validação inteligente de propostas comerciais
          </p>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
}
