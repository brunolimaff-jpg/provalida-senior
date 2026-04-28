'use client';

import type { ValidationResult, ValidationItem } from './types';
import ScoreCard from './ScoreCard';
import FilterChips from './FilterChips';
import ValidationList from './ValidationList';
import ExportPanel from './ExportPanel';

interface ValidationPanelProps {
  resultado: ValidationResult;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onApplyCorrection: (item: ValidationItem) => void;
  onCopySuggestion: (suggestion: string) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onReset: () => void;
  numeroProposta: string;
}

export default function ValidationPanel({
  resultado,
  activeFilter,
  onFilterChange,
  onApplyCorrection,
  onCopySuggestion,
  onExportPDF,
  onExportCSV,
  onReset,
  numeroProposta,
}: ValidationPanelProps) {
  // Filtrar itens pela categoria selecionada
  const filteredItens = activeFilter === 'Todos'
    ? resultado.itens
    : resultado.itens.filter(i => i.categoria === activeFilter);

  // Obter categorias únicas
  const categories = [...new Set(resultado.itens.map(i => i.categoria))];

  return (
    <div className="space-y-4">
      {/* Score */}
      <ScoreCard resultado={resultado} />

      {/* Filtros */}
      <FilterChips
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        categories={categories}
      />

      {/* Lista de validações */}
      <ValidationList
        itens={filteredItens}
        onApplyCorrection={onApplyCorrection}
        onCopySuggestion={onCopySuggestion}
      />

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
