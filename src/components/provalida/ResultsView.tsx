'use client';

import type { ValidationItem, ValidationResult } from './types';
import DocumentPanel from './DocumentPanel';
import ValidationPanel from './ValidationPanel';

interface ResultsViewProps {
  resultado: ValidationResult;
  pdfText: string;
  correctedText: string;
  activeFilter: string;
  activeDocTab: 'original' | 'corrected';
  onFilterChange: (filter: string) => void;
  onDocTabChange: (tab: 'original' | 'corrected') => void;
  onApplyCorrection: (item: ValidationItem) => void;
  onCopySuggestion: (suggestion: string) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onReset: () => void;
  numeroProposta: string;
}

export default function ResultsView({
  resultado,
  pdfText,
  correctedText,
  activeFilter,
  activeDocTab,
  onFilterChange,
  onDocTabChange,
  onApplyCorrection,
  onCopySuggestion,
  onExportPDF,
  onExportCSV,
  onReset,
  numeroProposta,
}: ResultsViewProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Painel do documento — 55% */}
        <div className="lg:col-span-3">
          <DocumentPanel
            pdfText={pdfText}
            correctedText={correctedText}
            activeTab={activeDocTab}
            onTabChange={onDocTabChange}
          />
        </div>

        {/* Painel de validação — 45% */}
        <div className="lg:col-span-2">
          <ValidationPanel
            resultado={resultado}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            onApplyCorrection={onApplyCorrection}
            onCopySuggestion={onCopySuggestion}
            onExportPDF={onExportPDF}
            onExportCSV={onExportCSV}
            onReset={onReset}
            numeroProposta={numeroProposta}
          />
        </div>
      </div>
    </div>
  );
}
