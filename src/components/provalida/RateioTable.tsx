'use client';

import { Plus, X } from 'lucide-react';
import type { ContaRateio } from './types';

interface RateioTableProps {
  contas: ContaRateio[];
  onChange: (contas: ContaRateio[]) => void;
}

export default function RateioTable({ contas, onChange }: RateioTableProps) {
  // Calcular soma dos percentuais
  const percentuais = contas
    .map(c => parseFloat(c.percentual.replace(',', '.')))
    .filter(v => !isNaN(v));
  const soma = percentuais.reduce((a, b) => a + b, 0);
  const somaValida = Math.abs(soma - 100) < 0.01;
  const temVazios = contas.some(c => !c.percentual || c.percentual.trim() === '');

  const handleContaChange = (id: string, field: 'conta' | 'percentual', value: string) => {
    onChange(contas.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleAddRow = () => {
    const newId = String(Date.now());
    onChange([...contas, { id: newId, conta: '', percentual: '' }]);
  };

  const handleRemoveRow = (id: string) => {
    if (contas.length <= 1) return;
    onChange(contas.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--background)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">Conta</th>
              <th className="w-32 px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">Percentual %</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {contas.map((conta) => (
              <tr key={conta.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={conta.conta}
                    onChange={(e) => handleContaChange(conta.id, 'conta', e.target.value)}
                    placeholder="Nome da conta"
                    className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={conta.percentual}
                    onChange={(e) => handleContaChange(conta.id, 'percentual', e.target.value)}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleRemoveRow(conta.id)}
                    disabled={contas.length <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[#e0ced7] hover:text-[#a12c7b] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-180"
                    aria-label="Remover linha"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Soma dos percentuais */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleAddRow}
          className="flex items-center gap-1 text-xs font-medium text-[#01696f] hover:text-[#015055] transition-colors duration-180"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
        <div className={`text-xs font-semibold ${somaValida && !temVazios ? 'text-[#437a22]' : 'text-[#a12c7b]'}`}>
          Soma: {soma.toFixed(2)}%{somaValida && !temVazios ? ' ✓' : temVazios ? ' (incompleto)' : ' ≠ 100%'}
        </div>
      </div>
    </div>
  );
}
