'use client';

import { FileText, FilePenLine } from 'lucide-react';

interface DocumentPanelProps {
  pdfText: string;
  correctedText: string;
  activeTab: 'original' | 'corrected';
  onTabChange: (tab: 'original' | 'corrected') => void;
}

export default function DocumentPanel({ pdfText, correctedText, activeTab, onTabChange }: DocumentPanelProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Abas */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => onTabChange('original')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-180 ${
            activeTab === 'original'
              ? 'border-b-2 border-[#01696f] text-[#01696f]'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <FileText className="h-4 w-4" />
          Original
        </button>
        <button
          onClick={() => onTabChange('corrected')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-180 ${
            activeTab === 'corrected'
              ? 'border-b-2 border-[#01696f] text-[#01696f]'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <FilePenLine className="h-4 w-4" />
          Com Correções
          {correctedText && (
            <span className="ml-1 rounded-full bg-[#437a22] px-1.5 py-0.5 text-[10px] text-white">
              {correctedText.split('\n').filter(l => l.trim()).length}
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo */}
      <div className="max-h-[70vh] overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'original' ? (
          pdfText ? (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--text)] font-[family-name:var(--font-satoshi)]">
              {pdfText}
            </pre>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              Nenhum texto extraído do PDF
            </p>
          )
        ) : correctedText ? (
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--text)] font-[family-name:var(--font-satoshi)]">
            {correctedText}
          </pre>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            Nenhuma correção aplicada ainda. Clique em &quot;Aplicar&quot; nas sugestões para gerar o texto corrigido.
          </p>
        )}
      </div>
    </div>
  );
}
