'use client';

import { CheckCircle, AlertTriangle, XCircle, HelpCircle, Eye, FileText } from 'lucide-react';
import type { ExtractedField, ExtractedRateio } from './types';

interface ExtractedFieldsPanelProps {
  campos: ExtractedField[];
  rateio: ExtractedRateio[];
  observacaoRateio: string;
}

// Ícone de status para cada campo
function FieldStatusIcon({ origem, encontrado }: { origem: string; encontrado: boolean }) {
  if (encontrado && origem === 'pdf') {
    return <CheckCircle className="h-4 w-4 text-[#437a22] shrink-0" />;
  }
  if (encontrado && origem === 'inferido') {
    return <Eye className="h-4 w-4 text-[#964219] shrink-0" />;
  }
  return <HelpCircle className="h-4 w-4 text-[#a12c7b] shrink-0" />;
}

// Badge de origem
function OrigemBadge({ origem }: { origem: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pdf: { bg: '#d4dfcc', text: '#437a22', label: 'Encontrado no PDF' },
    inferido: { bg: '#ddcfc6', text: '#964219', label: 'Inferido' },
    nao_encontrado: { bg: '#e0ced7', text: '#a12c7b', label: 'Não encontrado' },
  };
  const c = config[origem] || config.nao_encontrado;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

export default function ExtractedFieldsPanel({ campos, rateio, observacaoRateio }: ExtractedFieldsPanelProps) {
  // Separar campos por grupo
  const camposEncontrados = campos.filter(c => c.encontrado);
  const camposNaoEncontrados = campos.filter(c => !c.encontrado);
  const camposInferidos = campos.filter(c => c.encontrado && c.origem === 'inferido');

  return (
    <div className="space-y-4">
      {/* Resumo rápido */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#d4dfcc] px-3 py-1 text-xs font-semibold text-[#437a22]">
          <CheckCircle className="h-3 w-3" /> {camposEncontrados.length - camposInferidos.length} no PDF
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#ddcfc6] px-3 py-1 text-xs font-semibold text-[#964219]">
          <Eye className="h-3 w-3" /> {camposInferidos.length} inferidos
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e0ced7] px-3 py-1 text-xs font-semibold text-[#a12c7b]">
          <HelpCircle className="h-3 w-3" /> {camposNaoEncontrados.length} não encontrados
        </span>
      </div>

      {/* Legenda */}
      <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3">
        <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Legenda</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 text-[#437a22]" />
            <span className="text-[10px] text-[var(--text)]">Texto exato no PDF</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="h-3 w-3 text-[#964219]" />
            <span className="text-[10px] text-[var(--text)]">Inferido do contexto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3 w-3 text-[#a12c7b]" />
            <span className="text-[10px] text-[var(--text)]">Ausente no PDF</span>
          </div>
        </div>
      </div>

      {/* Lista de campos */}
      <div className="space-y-1.5">
        {campos.map((campo) => (
          <div
            key={campo.campo}
            className={`rounded-lg border p-3 transition-colors duration-180 ${
              !campo.encontrado
                ? 'border-[#a12c7b]/30 bg-[#e0ced7]/20'
                : campo.origem === 'inferido'
                ? 'border-[#964219]/30 bg-[#ddcfc6]/20'
                : 'border-[var(--border)] bg-[var(--surface)]'
            }`}
          >
            <div className="flex items-start gap-2">
              <FieldStatusIcon origem={campo.origem} encontrado={campo.encontrado} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[var(--text)]">{campo.campo}</span>
                  <OrigemBadge origem={campo.origem} />
                </div>
                {campo.encontrado && campo.valor ? (
                  <p className="mt-1 text-sm text-[var(--text)] font-medium">{campo.valor}</p>
                ) : (
                  <p className="mt-1 text-xs text-[#a12c7b] italic">Campo não encontrado no PDF — verificar no CRM</p>
                )}
                {campo.trechoPDF && (
                  <p className="mt-1 text-[10px] text-[var(--muted)] truncate" title={campo.trechoPDF}>
                    📎 &quot;{campo.trechoPDF}&quot;
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rateio */}
      {rateio && rateio.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="text-xs font-semibold text-[var(--text)] mb-3">Rateio</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-2 text-left font-medium text-[var(--muted)]">Conta</th>
                  <th className="pb-2 text-left font-medium text-[var(--muted)]">Tipo</th>
                  <th className="pb-2 text-right font-medium text-[var(--muted)]">Percentual</th>
                </tr>
              </thead>
              <tbody>
                {rateio.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 text-[var(--text)]">{r.conta || '—'}</td>
                    <td className="py-2 text-[var(--text)]">{r.tipoRateio || '—'}</td>
                    <td className="py-2 text-right font-medium text-[var(--text)]">{r.percentual ? `${r.percentual}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {observacaoRateio && (
            <p className="mt-2 text-[10px] text-[var(--muted)]">Obs: {observacaoRateio}</p>
          )}
        </div>
      )}
    </div>
  );
}
