'use client';

import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, ChevronDown, Copy, Check } from 'lucide-react';
import type { ValidationItem as ValidationItemType } from './types';

interface ValidationItemProps {
  item: ValidationItemType;
  onApplyCorrection: (item: ValidationItemType) => void;
  onCopySuggestion: (suggestion: string) => void;
}

const statusIcons = {
  ok: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const statusColors = {
  ok: { icon: '#437a22', bg: '#d4dfcc', border: '#437a22' },
  warning: { icon: '#964219', bg: '#ddcfc6', border: '#964219' },
  error: { icon: '#a12c7b', bg: '#e0ced7', border: '#a12c7b' },
  info: { icon: '#01696f', bg: '#cedcd8', border: '#01696f' },
};

export default function ValidationItem({ item, onApplyCorrection, onCopySuggestion }: ValidationItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const IconComponent = statusIcons[item.status];
  const colors = statusColors[item.status];

  const handleCopy = async () => {
    if (!item.sugestao) return;
    try {
      await navigator.clipboard.writeText(item.sugestao);
      setCopied(true);
      onCopySuggestion(item.sugestao);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = item.sugestao;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`rounded-xl border transition-colors duration-180 ${
        item.corrigido
          ? 'border-[#437a22] bg-[#d4dfcc]/30'
          : `border-[var(--border)] bg-[var(--surface)]`
      }`}
    >
      {/* Cabeçalho do item */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 p-3 text-left"
        aria-expanded={isOpen}
      >
        <IconComponent className="h-4 w-4 shrink-0" style={{ color: colors.icon }} />
        <span className="flex-1 text-sm font-medium text-[var(--text)]">
          {item.nome}
          {item.corrigido && (
            <span className="ml-2 text-xs font-normal text-[#437a22]">✓ Corrigido</span>
          )}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: colors.bg, color: colors.icon }}
        >
          {item.categoria}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-180 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Conteúdo expandido */}
      {isOpen && (
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 space-y-2">
          {/* Valor CRM */}
          {item.valorCRM && (
            <div className="text-xs">
              <span className="font-medium text-[var(--muted-foreground)]">Valor CRM:</span>{' '}
              <span className="text-[var(--text)]">{item.valorCRM}</span>
            </div>
          )}

          {/* Evidência PDF */}
          <div className="text-xs">
            <span className="font-medium text-[var(--muted-foreground)]">Evidência PDF:</span>{' '}
            <span className="text-[var(--text)]">{item.evidenciaPDF}</span>
          </div>

          {/* Mensagem de problema */}
          {item.status !== 'ok' && (
            <div
              className="rounded-lg p-2 text-xs"
              style={{ backgroundColor: colors.bg, color: colors.icon }}
            >
              ⚠️ {item.mensagem}
            </div>
          )}

          {/* Sugestão */}
          {item.sugestao && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 space-y-2">
              <p className="text-xs font-medium text-[var(--text)]">💡 Sugestão:</p>
              <p className="text-xs text-[var(--muted-foreground)]">{item.sugestao}</p>
              <div className="flex gap-2">
                {!item.corrigido && item.status !== 'ok' && (
                  <button
                    onClick={() => onApplyCorrection(item)}
                    className="flex items-center gap-1 rounded-md bg-[#437a22] px-2.5 py-1 text-[10px] font-medium text-white hover:bg-[#366118] transition-colors duration-180"
                  >
                    <Check className="h-3 w-3" />
                    Aplicar
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[10px] font-medium text-[var(--text)] hover:bg-[var(--surface)] transition-colors duration-180"
                >
                  {copied ? <Check className="h-3 w-3 text-[#437a22]" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
