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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extrair texto do PDF usando pdfjs-dist
  // Agrupa itens por posição Y para reconstruir as linhas originais
  const extractTextFromPDF = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
      const numPages = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Agrupar itens por posição Y (mesma linha visual)
        // Isso preserva a estrutura de linhas do documento original
        interface TextItem {
          str: string;
          x: number;
          y: number;
          width: number;
        }
        const lineMap = new Map<string, TextItem[]>();
        const Y_TOLERANCE = 3; // tolerância de 3px para considerar mesma linha

        for (const item of textContent.items) {
          const tItem = item as { str?: string; transform?: number[]; width?: number };
          if (!tItem.str || tItem.str.trim() === '' || !tItem.transform) continue;

          const x = tItem.transform[4];
          const y = Math.round(tItem.transform[5]); // arredondar Y para agrupar
          const w = tItem.width || 0;

          // Encontrar linha existente dentro da tolerância
          let matchedKey: string | null = null;
          for (const key of lineMap.keys()) {
            const existingY = parseInt(key);
            if (Math.abs(y - existingY) <= Y_TOLERANCE) {
              matchedKey = key;
              break;
            }
          }

          const entry: TextItem = { str: tItem.str, x, y, width: w };
          if (matchedKey) {
            lineMap.get(matchedKey)!.push(entry);
          } else {
            lineMap.set(String(y), [entry]);
          }
        }

        // Ordenar linhas de cima para baixo (Y decrescente em PDF)
        const sortedLines = [...lineMap.entries()]
          .sort(([a], [b]) => parseInt(b) - parseInt(a));

        for (const [, items] of sortedLines) {
          // Ordenar itens da esquerda para a direita
          items.sort((a, b) => a.x - b.x);
          const lineText = items.map(i => i.str).join(' ');
          fullText += lineText + '\n';
        }

        fullText += '\n'; // separar páginas
      }

      const hasText = fullText.trim().length > 10;
      console.log('[ProValida] Texto extraído do PDF (primeiros 2000 chars):', fullText.substring(0, 2000));
      onFileLoaded(file.name, file.size, fullText, hasText);

      if (hasText) {
        toast.success(`PDF carregado: ${numPages} página(s) extraída(s)`);
      } else {
        toast.warning('PDF sem texto extraível — tente enviar um PDF com texto');
      }
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      onFileLoaded(file.name, file.size, '', false);
      toast.error('Erro ao processar o PDF.');
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
                <p className="text-xs text-[var(--muted)]">{formatSize(pdfFileSize)}</p>
              </div>
            </div>
            <button
              onClick={onClear}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[#e0ced7] hover:text-[#a12c7b] transition-colors duration-180"
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
              <p className="text-[10px] font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">Pré-visualização do texto</p>
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
      onClick={() => !isLoading && fileInputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-180 ${
        isDragging
          ? 'border-[#01696f] bg-[#cedcd8]/50 scale-[1.01]'
          : 'border-[var(--border)] bg-[var(--background)] hover:border-[#01696f] hover:bg-[#cedcd8]/20'
      } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
    >
      {isLoading ? (
        <Loader2 className="h-10 w-10 mb-3 text-[#01696f] animate-spin" />
      ) : (
        <Upload className={`h-10 w-10 mb-3 ${isDragging ? 'text-[#01696f]' : 'text-[var(--muted)]'}`} />
      )}
      <p className="text-base font-semibold text-[var(--text)]">
        {isLoading ? 'Processando...' : 'Anexe a proposta comercial'}
      </p>
      <p className="text-sm text-[var(--muted)] mt-1">
        Arraste o PDF aqui ou clique para selecionar
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
