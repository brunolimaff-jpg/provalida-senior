'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

interface PDFUploaderProps {
  pdfFileName: string;
  pdfFileSize: number;
  pdfHasText: boolean;
  pdfTextPreview: string;
  onFileLoaded: (fileName: string, fileSize: number, text: string, hasText: boolean) => void;
  onClear: () => void;
}

export default function PDFUploader({
  pdfFileName,
  pdfFileSize,
  pdfHasText,
  pdfTextPreview,
  onFileLoaded,
  onClear,
}: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extrair texto do PDF usando pdfjs-dist
  const extractTextFromPDF = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Importar pdfjs-dist dinamicamente
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
      const numPages = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: { str?: string }) => item.str || '')
          .join(' ');
        fullText += pageText + '\n';
      }

      const hasText = fullText.trim().length > 10;
      onFileLoaded(file.name, file.size, fullText, hasText);

      if (hasText) {
        toast.success(`PDF carregado: ${numPages} página(s) extraída(s)`);
      } else {
        toast.warning('PDF sem texto extraível — apenas validação interna será executada');
      }
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      // Tentar marcar como PDF sem texto
      onFileLoaded(file.name, file.size, '', false);
      toast.error('Erro ao processar o PDF. Apenas validação interna será executada.');
    } finally {
      setIsLoading(false);
    }
  }, [onFileLoaded]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      toast.error('Formato não suportado. Use PDF ou DOCX.');
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

  // Formatar tamanho do arquivo
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Se já tem arquivo carregado
  if (pdfFileName) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#01696f]" />
              <div>
                <p className="text-sm font-medium text-[var(--text)]">{pdfFileName}</p>
                <p className="text-xs text-[var(--muted)]">{formatSize(pdfFileSize)}</p>
              </div>
            </div>
            <button
              onClick={onClear}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[#e0ced7] hover:text-[#a12c7b] transition-colors duration-180"
              aria-label="Remover arquivo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Banner de PDF sem texto */}
          {!pdfHasText && (
            <div className="flex items-start gap-2 rounded-lg border border-[#964219] bg-[#ddcfc6] p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#964219]" />
              <p className="text-xs text-[#964219]">
                PDF sem texto extraível — apenas validação interna será executada
              </p>
            </div>
          )}

          {/* Preview do texto */}
          {pdfHasText && pdfTextPreview && (
            <div className="rounded-lg bg-[var(--surface)] p-3">
              <p className="text-[10px] font-medium text-[var(--muted)] mb-1">Pré-visualização</p>
              <p className="text-xs text-[var(--text)] leading-relaxed line-clamp-6 whitespace-pre-wrap">
                {pdfTextPreview}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors duration-180 ${
          isDragging
            ? 'border-[#01696f] bg-[#cedcd8]/50'
            : 'border-[var(--border)] bg-[var(--background)] hover:border-[#01696f] hover:bg-[#cedcd8]/20'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <Upload className={`h-8 w-8 mb-3 ${isDragging ? 'text-[#01696f]' : 'text-[var(--muted)]'}`} />
        <p className="text-sm font-medium text-[var(--text)]">
          {isLoading ? 'Processando...' : 'Arraste o PDF aqui'}
        </p>
        <p className="text-xs text-[var(--muted)] mt-1">
          ou clique para selecionar — PDF, DOCX
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
