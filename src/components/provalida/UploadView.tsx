'use client';

import CRMForm from './CRMForm';
import PDFUploader from './PDFUploader';
import type { CRMData } from './types';

interface UploadViewProps {
  crmData: CRMData;
  onCRMChange: (data: CRMData) => void;
  pdfFileName: string;
  pdfFileSize: number;
  pdfHasText: boolean;
  pdfTextPreview: string;
  onFileLoaded: (fileName: string, fileSize: number, text: string, hasText: boolean) => void;
  onClearPDF: () => void;
  onFillDemo: () => void;
  onValidate: () => void;
  canValidate: boolean;
}

export default function UploadView({
  crmData,
  onCRMChange,
  pdfFileName,
  pdfFileSize,
  pdfHasText,
  pdfTextPreview,
  onFileLoaded,
  onClearPDF,
  onFillDemo,
  onValidate,
  canValidate,
}: UploadViewProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Formulário CRM — 60% */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-sm">
            <CRMForm crmData={crmData} onChange={onCRMChange} />
          </div>
        </div>

        {/* Upload PDF — 40% */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[var(--text)] mb-4">Proposta em PDF</h2>
            <PDFUploader
              pdfFileName={pdfFileName}
              pdfFileSize={pdfFileSize}
              pdfHasText={pdfHasText}
              pdfTextPreview={pdfTextPreview}
              onFileLoaded={onFileLoaded}
              onClear={onClearPDF}
            />
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
        <button
          onClick={onFillDemo}
          className="w-full sm:w-auto rounded-lg border border-[var(--border)] bg-[var(--background)] px-5 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] transition-colors duration-180"
        >
          Preencher com Demo
        </button>
        <button
          onClick={onValidate}
          disabled={!canValidate}
          className="w-full sm:w-auto rounded-lg bg-[#01696f] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#015055] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-180"
        >
          → Validar Proposta
        </button>
      </div>
    </div>
  );
}
