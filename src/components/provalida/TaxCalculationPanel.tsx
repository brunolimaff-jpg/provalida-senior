'use client';

import { Calculator, Info } from 'lucide-react';

interface TaxCalculationPanelProps {
  valoresComImposto: { label: string; valor: string }[];
  valoresSemImposto: { label: string; valor: string }[];
  impostoCCI: number;
  impostosInclusos: boolean;
}

export default function TaxCalculationPanel({
  valoresComImposto,
  valoresSemImposto,
  impostoCCI,
  impostosInclusos,
}: TaxCalculationPanelProps) {
  if (!valoresComImposto || valoresComImposto.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-4 w-4 text-[#01696f]" />
        <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
          Cálculo de Impostos — CCI {impostoCCI}%
        </h3>
      </div>

      {/* Info sobre o cálculo */}
      <div className="flex items-start gap-2 rounded-lg bg-[#cedcd8]/30 border border-[#01696f]/20 p-2.5 mb-3">
        <Info className="h-3.5 w-3.5 mt-0.5 text-[#01696f] shrink-0" />
        <p className="text-[10px] text-[var(--text)]">
          {impostosInclusos
            ? `Os valores da proposta JÁ INCLUEM os ${impostoCCI}% de imposto CCI. Os valores "sem imposto" foram calculados dividindo por ${(1 + impostoCCI / 100).toFixed(3)}.`
            : `Os valores da proposta NÃO INCLUEM os ${impostoCCI}% de imposto CCI. Os valores "com imposto" foram calculados multiplicando por ${(1 + impostoCCI / 100).toFixed(3)}.`
          }
        </p>
      </div>

      {/* Tabela de valores */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="pb-2 text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Item</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-[#437a22] uppercase tracking-wider">Com Imposto</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-[#964219] uppercase tracking-wider">Sem Imposto</th>
            </tr>
          </thead>
          <tbody>
            {valoresComImposto.map((item, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2.5 text-xs font-medium text-[var(--text)]">{item.label}</td>
                <td className="py-2.5 text-right text-xs font-semibold text-[#437a22]">{item.valor}</td>
                <td className="py-2.5 text-right text-xs font-semibold text-[#964219]">
                  {valoresSemImposto[i]?.valor || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
