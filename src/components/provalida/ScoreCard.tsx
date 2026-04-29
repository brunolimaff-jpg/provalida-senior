'use client';

import type { ValidationResult } from './types';

interface ScoreCardProps {
  resultado: ValidationResult;
}

export default function ScoreCard({ resultado }: ScoreCardProps) {
  const { score, classificacao, resumo, itens } = resultado;

  // Cor do score
  const scoreColor = score >= 85 ? '#437a22' : score >= 65 ? '#964219' : '#a12c7b';
  const scoreBg = score >= 85 ? '#d4dfcc' : score >= 65 ? '#ddcfc6' : '#e0ced7';

  // Classificação com ícone
  const classificacaoLabel = score >= 85 ? 'Aprovada ✓' : score >= 65 ? 'Com Ressalvas' : 'Necessita Revisão';

  // Contadores
  const okCount = itens.filter(i => i.status === 'ok').length;
  const warnCount = itens.filter(i => i.status === 'warning').length;
  const errCount = itens.filter(i => i.status === 'error').length;
  const infoCount = itens.filter(i => i.status === 'info').length;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Score numérico */}
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: scoreBg }}
        >
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: scoreColor }}>{score}</p>
            <p className="text-[10px] font-medium" style={{ color: scoreColor }}>/100</p>
          </div>
        </div>

        {/* Classificação e resumo */}
        <div className="min-w-0">
          <p className="text-base font-semibold text-[var(--text)]">{classificacaoLabel}</p>
          <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{resumo}</p>
        </div>
      </div>

      {/* Contadores */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#d4dfcc] px-2.5 py-1 text-xs font-medium text-[#437a22]">
          {okCount} OK
        </span>
        {warnCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ddcfc6] px-2.5 py-1 text-xs font-medium text-[#964219]">
            {warnCount} Aviso{warnCount > 1 ? 's' : ''}
          </span>
        )}
        {errCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e0ced7] px-2.5 py-1 text-xs font-medium text-[#a12c7b]">
            {errCount} Crítico{errCount > 1 ? 's' : ''}
          </span>
        )}
        {infoCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#cedcd8] px-2.5 py-1 text-xs font-medium text-[#01696f]">
            {infoCount} Info
          </span>
        )}
      </div>
    </div>
  );
}
