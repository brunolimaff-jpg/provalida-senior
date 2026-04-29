'use client';

import { Download, FileSpreadsheet, RotateCcw } from 'lucide-react';
import type { ValidationResult } from './types';

interface ExportPanelProps {
  resultado: ValidationResult;
  numeroProposta: string;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onReset: () => void;
}

export default function ExportPanel({
  resultado,
  numeroProposta,
  onExportPDF,
  onExportCSV,
  onReset,
}: ExportPanelProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onExportPDF}
          className="flex items-center gap-2 rounded-lg bg-[#01696f] px-4 py-2 text-xs font-medium text-white hover:bg-[#015055] transition-colors duration-180"
        >
          <Download className="h-3.5 w-3.5" />
          Relatório PDF
        </button>
        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface)] transition-colors duration-180"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Checklist CSV
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-[#e0ced7] hover:text-[#a12c7b] transition-colors duration-180 ml-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Nova Validação
        </button>
      </div>
    </div>
  );
}
