'use client';

import type { ExtractionResult, ValidationItem, ValidationResult } from './types';
import DocumentPanel from './DocumentPanel';
import ScoreCard from './ScoreCard';
import FilterChips from './FilterChips';
import ValidationList from './ValidationList';
import ExportPanel from './ExportPanel';
import ExtractedFieldsPanel from './ExtractedFieldsPanel';
import TaxCalculationPanel from './TaxCalculationPanel';

interface ResultsViewProps {
  extraction: ExtractionResult;
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
  extraction,
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
      {/* Seção: Campos Extraídos */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">Campos Extraídos da Proposta</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Painel de campos extraídos — 2/3 */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm max-h-[70vh] overflow-y-auto custom-scrollbar">
              <ExtractedFieldsPanel
                campos={extraction.campos}
                rateio={extraction.rateio}
                observacaoRateio={extraction.observacaoRateio}
              />
            </div>
          </div>

          {/* Cálculo de impostos + Documento — 1/3 */}
          <div className="space-y-4">
            <TaxCalculationPanel
              valoresComImposto={extraction.valoresComImposto}
              valoresSemImposto={extraction.valoresSemImposto}
              impostoCCI={extraction.impostoCCI}
              impostosInclusos={extraction.campos.find(c => c.campo === 'Impostos')?.valor?.includes('inclusos') ?? true}
            />
            <DocumentPanel
              pdfText={pdfText}
              correctedText={correctedText}
              activeTab={activeDocTab}
              onTabChange={onDocTabChange}
            />
          </div>
        </div>
      </div>

      {/* Seção: Validação */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">Validação</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Score + filtros — 1/3 */}
          <div className="space-y-4">
            <ScoreCard resultado={resultado} />

            {/* Alerta campos exclusivos CRM */}
            {resultado.camposCRMNaoEncontrados && resultado.camposCRMNaoEncontrados.length > 0 && (
              <div className="rounded-xl border border-[#a12c7b]/30 bg-[#e0ced7]/30 p-4">
                <p className="text-xs font-semibold text-[#a12c7b] mb-2">Campos exclusivos do CRM (não estão no PDF)</p>
                <ul className="space-y-1">
                  {resultado.camposCRMNaoEncontrados.map((campo) => (
                    <li key={campo} className="text-xs text-[var(--text)] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#a12c7b] shrink-0" />
                      {campo}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-[var(--muted)]">
                  Verifique esses campos diretamente no sistema CRM.
                </p>
              </div>
            )}

            <FilterChips
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
              categories={[...new Set(resultado.itens.map(i => i.categoria))]}
            />
          </div>

          {/* Lista de validação — 2/3 */}
          <div className="lg:col-span-2">
            <ValidationList
              itens={activeFilter === 'Todos'
                ? resultado.itens
                : resultado.itens.filter(i => i.categoria === activeFilter)
              }
              onApplyCorrection={onApplyCorrection}
              onCopySuggestion={onCopySuggestion}
            />
          </div>
        </div>
      </div>

      {/* Exportação */}
      <ExportPanel
        resultado={resultado}
        numeroProposta={numeroProposta}
        onExportPDF={onExportPDF}
        onExportCSV={onExportCSV}
        onReset={onReset}
      />
    </div>
  );
}
