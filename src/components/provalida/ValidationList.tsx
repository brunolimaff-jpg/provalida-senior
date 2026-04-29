'use client';

import type { ValidationItem as ValidationItemType } from './types';
import ValidationItemComponent from './ValidationItem';

interface ValidationListProps {
  itens: ValidationItemType[];
  onApplyCorrection: (item: ValidationItemType) => void;
  onCopySuggestion: (suggestion: string) => void;
}

export default function ValidationList({ itens, onApplyCorrection, onCopySuggestion }: ValidationListProps) {
  // Ordenar: erros primeiro, depois warnings, depois info, depois ok
  const statusOrder: Record<string, number> = { error: 0, warning: 1, info: 2, ok: 3 };
  const sortedItens = [...itens].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
      {sortedItens.map((item) => (
        <ValidationItemComponent
          key={item.id}
          item={item}
          onApplyCorrection={onApplyCorrection}
          onCopySuggestion={onCopySuggestion}
        />
      ))}
      {itens.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--muted)]">Nenhum item encontrado.</p>
      )}
    </div>
  );
}
