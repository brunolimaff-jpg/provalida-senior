'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertTriangle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PDFUploaderProps {
  pdfFileName: string;
  pdfFileSize: number;
  pdfHasText: boolean;
  pdfTextPreview: string;
  isLoading: boolean;
  onFileLoaded: (fileName: string, fileSize: number, text: string, hasText: boolean) => void;
  onClear: () => void;
}

interface PDFTextResponse {
  fileName: string;
  fileSize: number;
  numPages: number;
  text: string;
  hasText: boolean;
  error?: string;
}

export default function PDFUploader({
  pdfFileName,
  pdfFileSize,
  pdfHasText,
  pdfTextPreview,
  isLoading,
  onFileLoaded,
  onClear,
}: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = useCallback(async (file: File) => {
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/pdf-text', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json() as PDFTextResponse;

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao processar o PDF.');
      }

      console.log('[ProValida] Texto extraído do PDF (primeiros 2000 chars):', result.text.substring(0, 2000));
      onFileLoaded(result.fileName || file.name, result.fileSize || file.size, result.text, result.hasText);

      if (result.hasText) {
        toast.success(`PDF carregado: ${result.numPages} página(s) extraída(s)`);
      } else {
        toast.warning('PDF sem texto extraível — tente enviar um PDF com texto');
      }
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      onFileLoaded(file.name, file.size, '', false);
      toast.error('Erro ao processar o PDF.');
    } finally {
      setIsExtracting(false);
    }
  }, [onFileLoaded]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Formato não suportado. Use PDF.');
      return;
    }
    extractTextFromPDF(file);
  }, [extractTextFromPDF]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Se já tem arquivo carregado
  if (pdfFileName) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#cedcd8]">
                <FileText className="h-5 w-5 text-[#01696f]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{pdfFileName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{formatSize(pdfFileSize)}</p>
              </div>
            </div>
            <button
              onClick={onClear}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[#e0ced7] hover:text-[#a12c7b] transition-colors duration-180"
              aria-label="Remover arquivo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!pdfHasText && (
            <div className="flex items-start gap-2 rounded-lg border border-[#964219] bg-[#ddcfc6] p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#964219]" />
              <p className="text-xs text-[#964219]">
                PDF sem texto extraível — a extração automática não será possível
              </p>
            </div>
          )}

          {pdfHasText && pdfTextPreview && (
            <div className="rounded-lg bg-[var(--surface)] p-3 border border-[var(--border)]">
              <p className="text-[10px] font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wider">Pré-visualização do texto</p>
              <p className="text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap" style={{ maxHeight: '120px', overflow: 'hidden' }}>
                {pdfTextPreview}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !isLoading && !isExtracting && fileInputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-180 ${
        isDragging
          ? 'border-[#01696f] bg-[#cedcd8]/50 scale-[1.01]'
          : 'border-[var(--border)] bg-[var(--background)] hover:border-[#01696f] hover:bg-[#cedcd8]/20'
      } ${isLoading || isExtracting ? 'pointer-events-none opacity-60' : ''}`}
    >
      {isLoading || isExtracting ? (
        <Loader2 className="h-10 w-10 mb-3 text-[#01696f] animate-spin" />
      ) : (
        <Upload className={`h-10 w-10 mb-3 ${isDragging ? 'text-[#01696f]' : 'text-[var(--muted-foreground)]'}`} />
      )}
      <p className="text-base font-semibold text-[var(--text)]">
        {isLoading || isExtracting ? 'Processando...' : 'Anexe a proposta comercial'}
      </p>
      <p className="text-sm text-[var(--muted-foreground)] mt-1">
        Arraste o PDF aqui ou clique para selecionar
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
