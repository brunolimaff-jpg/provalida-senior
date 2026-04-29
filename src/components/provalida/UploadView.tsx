'use client';

import { useState, useCallback } from 'react';
import PDFUploader from './PDFUploader';
import { DEMO_PDF_TEXT } from './constants';

interface UploadViewProps {
  pdfFileName: string;
  pdfFileSize: number;
  pdfHasText: boolean;
  pdfTextPreview: string;
  isLoading: boolean;
  onFileLoaded: (fileName: string, fileSize: number, text: string, hasText: boolean) => void;
  onClearPDF: () => void;
  onFillDemo: () => void;
  onAnalyze: () => void;
  canAnalyze: boolean;
}

export default function UploadView({
  pdfFileName,
  pdfFileSize,
  pdfHasText,
  pdfTextPreview,
  isLoading,
  onFileLoaded,
  onClearPDF,
  onFillDemo,
  onAnalyze,
  canAnalyze,
}: UploadViewProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Título */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Anexe a proposta comercial
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
          Faça upload do PDF da proposta e o ProValida extrairá automaticamente todos os campos e validará as regras de negócio.
        </p>
      </div>

      {/* Área de upload */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <PDFUploader
          pdfFileName={pdfFileName}
          pdfFileSize={pdfFileSize}
          pdfHasText={pdfHasText}
          pdfTextPreview={pdfTextPreview}
          isLoading={isLoading}
          onFileLoaded={onFileLoaded}
          onClear={onClearPDF}
        />
      </div>

      {/* Info sobre campos do CRM */}
      <div className="mt-4 rounded-xl border border-[#964219]/30 bg-[#ddcfc6]/40 p-4">
        <p className="text-xs font-semibold text-[#964219] mb-2">⚠ Campos que podem não aparecer na proposta</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Alguns campos existem apenas no CRM e não estão no PDF: <strong>Revisão</strong>, <strong>Tipo Alíquota</strong>, <strong>Imposto CCI</strong>, <strong>Motivo da Reprogramação</strong>, <strong>Responsável pelo Suporte</strong>, <strong>Layout</strong>, <strong>Cobrança de Despesas</strong>. Esses serão sinalizados para verificação manual.
        </p>
      </div>

      {/* Botões de ação */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onFillDemo}
          className="w-full sm:w-auto rounded-lg border border-[var(--border)] bg-[var(--background)] px-5 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] transition-colors duration-180"
        >
          📋 Usar proposta demo
        </button>
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="w-full sm:w-auto rounded-lg bg-[#01696f] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#015055] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-180 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analisando...
            </>
          ) : (
            '→ Analisar Proposta'
          )}
        </button>
      </div>
    </div>
  );
}
