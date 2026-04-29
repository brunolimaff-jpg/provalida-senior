'use client';

import { AlertTriangle, Building2, CalendarClock, CheckCircle2, ChevronRight, CreditCard, DollarSign, FileSearch, Landmark, Package, User } from 'lucide-react';
import type { ExtractionResult, ValidationItem, ValidationResult, ModuloItem, EscopoItem, InvestimentoItem, CondicaoPagamento, CamposAusentes } from './types';
import { formatBRL, parseBRL } from '@/services/financial-parsing';
import ScoreCard from './ScoreCard';
import FilterChips from './FilterChips';
import ValidationList from './ValidationList';
import ExportPanel from './ExportPanel';

interface ResultsViewProps {
  extraction: ExtractionResult;
  resultado: ValidationResult;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onApplyCorrection: (item: ValidationItem) => void;
  onCopySuggestion: (suggestion: string) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onReset: () => void;
  numeroProposta: string;
}

function SourceChip({ label = 'PDF', tone = 'ok' }: { label?: string; tone?: 'ok' | 'warn' | 'neutral' }) {
  const toneClass = tone === 'ok'
    ? 'bg-[#d4dfcc] text-[#437a22]'
    : tone === 'warn'
      ? 'bg-[#ddcfc6] text-[#964219]'
      : 'bg-[var(--background)] text-[var(--muted-foreground)]';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${toneClass}`}>
      {tone === 'ok' ? <CheckCircle2 className="h-3 w-3" /> : tone === 'warn' ? <AlertTriangle className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}

function EvidenceLine({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="mt-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
      {text}
    </p>
  );
}

function hasDisplayValue(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '—' && normalized !== 'não encontrado' && normalized !== 'não encontrado no pdf';
}

function AuditHero({ extraction, resultado }: { extraction: ExtractionResult; resultado: ValidationResult }) {
  const risks = extraction.resumoAuditoria?.riscos || [];
  const errorCount = resultado.itens.filter(item => item.status === 'error').length;
  const warnCount = resultado.itens.filter(item => item.status === 'warning').length;
  const statusOk = risks.length === 0 && errorCount === 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SourceChip label={statusOk ? 'Confirmado' : 'Revisar'} tone={statusOk ? 'ok' : 'warn'} />
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">{extraction.codigoProposta || 'Código não encontrado'}</span>
          </div>
          <h1 className="mt-2 text-xl font-bold text-[var(--text)] sm:text-2xl">{extraction.cliente || 'Cliente não encontrado no PDF'}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{extraction.cnpj || 'CNPJ não encontrado'}{extraction.endereco ? ` · ${extraction.endereco}` : ''}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Score</p>
            <p className="text-xl font-bold text-[#01696f]">{resultado.score}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Críticos</p>
            <p className="text-xl font-bold text-[#a12c7b]">{errorCount}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Avisos</p>
            <p className="text-xl font-bold text-[#964219]">{warnCount}</p>
          </div>
        </div>
      </div>

      {risks.length > 0 && (
        <div className="border-t border-[#964219]/20 bg-[#ddcfc6]/20 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {risks.map(risk => (
              <span key={risk} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-[#964219]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {risk}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Seção: Informações Gerais (Empresa + Executivo)
// ============================================================
function GeneralInfoSection({ extraction }: { extraction: ExtractionResult }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#01696f] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{extraction.cliente}</h2>
            <p className="text-xs text-white/80">CNPJ: {extraction.cnpj}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Endereço */}
        {extraction.endereco && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mt-0.5 w-20 shrink-0">Endereço</span>
            <span className="text-sm text-[var(--text)]">{extraction.endereco}</span>
          </div>
        )}

        {/* Executivo */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-[#01696f]" />
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Executivo</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-[var(--muted-foreground)]">Nome</p>
              <p className="text-sm font-medium text-[var(--text)]">{extraction.executivo}</p>
            </div>
            {extraction.cargoExecutivo && (
              <div>
                <p className="text-[10px] text-[var(--muted-foreground)]">Cargo</p>
                <p className="text-sm text-[var(--text)]">{extraction.cargoExecutivo}</p>
              </div>
            )}
            {extraction.emailExecutivo && (
              <div>
                <p className="text-[10px] text-[var(--muted-foreground)]">E-mail</p>
                <p className="text-sm text-[#01696f] break-all">{extraction.emailExecutivo}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Código</p>
            <p className="text-sm font-semibold text-[#01696f]">{extraction.codigoProposta || '—'}</p>
          </div>
          {extraction.versaoModelo && (
            <div className="col-span-2">
              <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Versão do Modelo</p>
              <p className="text-sm text-[var(--text)]">{extraction.versaoModelo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Seção: 1.1 MÓDULOS
// ============================================================
function ModulesSection({ modulos }: { modulos: ModuloItem[] }) {
  if (!modulos || modulos.length === 0) return null;

  // Agrupar por bloco
  const blocos = modulos.reduce<Record<string, ModuloItem[]>>((acc, mod) => {
    const key = mod.bloco || 'Outros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(mod);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)]">
        <Package className="h-4 w-4 text-[#01696f]" />
        <h3 className="text-sm font-bold text-[var(--text)]">1.1 MÓDULOS</h3>
        <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">{modulos.length} módulos</span>
      </div>

      {/* Blocos */}
      <div className="p-4 space-y-4">
        {Object.entries(blocos).map(([blocoNome, items]) => (
          <div key={blocoNome} className="rounded-lg border border-[var(--border)] overflow-hidden">
            {/* Bloco header */}
            <div className="bg-[#cedcd8]/40 px-4 py-2 border-b border-[var(--border)]">
              <p className="text-xs font-bold text-[#01696f]">{blocoNome}</p>
            </div>

            {/* Módulos table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    <th className="py-2 px-4 text-left font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Módulo</th>
                    <th className="py-2 px-4 text-right font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Qtd</th>
                    <th className="py-2 px-4 text-left font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Modalidade</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((mod, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
                      <td className="py-2.5 px-4 text-[var(--text)] font-medium">{mod.modulo}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-[#01696f]">{mod.quantidade}</td>
                      <td className="py-2.5 px-4 text-[var(--muted-foreground)]">{mod.unidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Seção: 2. ESCOPO DE SERVIÇOS CONTEMPLADOS
// ============================================================
function ScopeSection({ escopos }: { escopos: EscopoItem[] }) {
  if (!escopos || escopos.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)]">
        <FileSearch className="h-4 w-4 text-[#01696f]" />
        <h3 className="text-sm font-bold text-[var(--text)]">2. ESCOPO DE SERVIÇOS CONTEMPLADOS</h3>
      </div>

      {/* IDs */}
      <div className="p-4 space-y-2">
        {escopos.map((escopo, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--background)] border border-[var(--border)] px-4 py-2.5">
            <ChevronRight className="h-3.5 w-3.5 text-[#01696f] shrink-0" />
            <code className="text-xs font-mono text-[var(--text)] break-all">{escopo.id}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Seção: 3. INVESTIMENTO
// ============================================================
function InvestmentSection({ investimentos, impostoCCI, impostosInclusos }: { investimentos: InvestimentoItem[]; impostoCCI: number; impostosInclusos: boolean }) {
  if (!investimentos || investimentos.length === 0) return null;
  const mensalidade = investimentos.find(item => item.descricao === 'Mensalidade');
  const habilitacao = investimentos.find(item => item.descricao === 'Habilitação + Serviços');
  const totalGlobal = [mensalidade?.valorComImposto, habilitacao?.valorComImposto]
    .map(value => parseBRL(value || ''))
    .filter((value): value is number => value !== null)
    .reduce((sum, value) => sum + value, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-white">
        <DollarSign className="h-4 w-4 text-[#01696f]" />
        <h3 className="text-sm font-bold text-[var(--text)]">Valores Contratuais</h3>
        <div className="ml-auto hidden items-center gap-1.5 sm:flex">
          <SourceChip label={impostosInclusos ? 'Impostos inclusos' : 'Impostos a revisar'} tone={impostosInclusos ? 'ok' : 'warn'} />
          <SourceChip label={`CCI ${impostoCCI}%`} tone="neutral" />
        </div>
      </div>

      {totalGlobal > 0 && (
        <div className="border-b border-[var(--border)] bg-white px-5 py-4">
          <p className="text-xs font-bold uppercase text-[#01696f]">Valor global</p>
          <p className="mt-1 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl">{formatBRL(totalGlobal)}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Soma de 1 mensalidade cheia + habilitação e serviços.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        {investimentos.map((item) => (
          <div key={item.descricao} className="rounded-lg border border-[var(--border)] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-[#01696f]">{item.descricao}</p>
                <p className="mt-2 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl">{item.valorComImposto || 'Não encontrado no PDF'}</p>
              </div>
              <SourceChip label={item.confianca === 'alta' ? 'PDF' : 'Revisar'} tone={item.confianca === 'alta' ? 'ok' : 'warn'} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-[var(--border)] bg-white p-2">
                <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Sem impostos</p>
                <p className="text-sm font-semibold text-[#964219]">{item.valorSemImposto || 'Não encontrado'}</p>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-white p-2">
                <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Estado</p>
                <p className="text-sm font-semibold text-[#437a22]">{item.confianca === 'alta' ? 'Confirmado' : 'Revisar'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Seção: 5. CONDIÇÕES DE PAGAMENTO
// ============================================================
function PaymentSection({ condicoes, condicoesPagamento, prazoContratual, validadeProposta, multaRescisoria, faturamentoServicos, financiamento }: {
  condicoes: CondicaoPagamento[];
  condicoesPagamento?: ExtractionResult['condicoesPagamento'];
  prazoContratual: string;
  validadeProposta: string;
  multaRescisoria: string;
  faturamentoServicos?: string;
  financiamento?: string;
}) {
  const mensalidade = condicoesPagamento?.mensalidade;
  const habilitacao = condicoesPagamento?.habilitacaoServicos;
  const oldHabilitacao = condicoes.find(cond => cond.tipo === 'Habilitação + Serviços')?.condicao;
  const hasDiscount = hasDisplayValue(mensalidade?.parcelasComDesconto) &&
    hasDisplayValue(mensalidade?.descontoPercentual) &&
    hasDisplayValue(mensalidade?.valorComDesconto);
  const hasScale = !!mensalidade?.escala && mensalidade.escala.length > 0;
  const hasFinanciamento = hasDisplayValue(financiamento);
  const hasHabilitacaoBanco = hasDisplayValue(habilitacao?.banco);
  const hasHabilitacaoPrazo = hasDisplayValue(habilitacao?.prazoAprovacao);
  const hasHabilitacao = hasDisplayValue(habilitacao?.formaPagamento) ||
    hasHabilitacaoBanco ||
    hasHabilitacaoPrazo ||
    !!habilitacao?.cancelamentoAutomatico ||
    hasDisplayValue(habilitacao?.observacao) ||
    hasDisplayValue(oldHabilitacao);
  const faturamentoValue = faturamentoServicos || condicoesPagamento?.faturamento?.valor || '';
  const discountDescription = hasDiscount
    ? `${mensalidade?.descontoPercentual} durante ${mensalidade?.parcelasComDesconto} meses`
    : '';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-white">
        <CreditCard className="h-4 w-4 text-[#01696f]" />
        <h3 className="text-sm font-bold text-[var(--text)]">Condições de Pagamento</h3>
      </div>

      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[#01696f]" />
                <p className="text-xs font-bold uppercase text-[#01696f]">Mensalidade</p>
              </div>
              <SourceChip label={mensalidade?.evidenciaCampo ? 'PDF' : 'Revisar'} tone={mensalidade?.evidenciaCampo ? 'ok' : 'warn'} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-[var(--border)] bg-white p-2">
                <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Vencimento</p>
                <p className="text-sm font-semibold text-[var(--text)]">{mensalidade?.vencimento || 'Não encontrado no PDF'}</p>
              </div>
              {hasDiscount && (
                <>
                  <div className="rounded-md border border-[var(--border)] bg-white p-2">
                    <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Carência</p>
                    <p className="text-sm font-semibold text-[var(--text)]">{discountDescription}</p>
                  </div>
                  <div className="rounded-md border border-[var(--border)] bg-white p-2">
                    <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Valor no período</p>
                    <p className="text-sm font-semibold text-[#964219]">{mensalidade?.valorComDesconto}</p>
                  </div>
                </>
              )}
              <div className="rounded-md border border-[var(--border)] bg-white p-2">
                <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Valor cheio</p>
                <p className="text-sm font-semibold text-[#437a22]">{mensalidade?.valorCheio || 'Não encontrado'}</p>
              </div>
            </div>
        </div>

        {hasHabilitacao && (
          <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-[#01696f]" />
                <p className="text-xs font-bold uppercase text-[#01696f]">Habilitação</p>
              </div>
              <SourceChip label={habilitacao?.evidenciaCampo ? 'PDF' : 'Revisar'} tone={habilitacao?.evidenciaCampo ? 'ok' : 'warn'} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {hasDisplayValue(habilitacao?.formaPagamento) && (
                <div className="rounded-md border border-[var(--border)] bg-white p-2">
                  <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Forma</p>
                  <p className="text-sm font-semibold text-[var(--text)]">{habilitacao?.formaPagamento}</p>
                </div>
              )}
              {hasHabilitacaoBanco && (
                <div className="rounded-md border border-[var(--border)] bg-white p-2">
                  <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Banco</p>
                  <p className="text-sm font-semibold text-[var(--text)]">{habilitacao?.banco}</p>
                </div>
              )}
              {hasHabilitacaoPrazo && (
                <div className="rounded-md border border-[var(--border)] bg-white p-2">
                  <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Prazo</p>
                  <p className="text-sm font-semibold text-[var(--text)]">{habilitacao?.prazoAprovacao}</p>
                </div>
              )}
              {habilitacao?.cancelamentoAutomatico && (
                <div className="rounded-md border border-[var(--border)] bg-white p-2">
                  <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Cancelamento</p>
                  <p className="text-sm font-semibold text-[var(--text)]">Automático</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-[var(--text)]">{habilitacao?.observacao || oldHabilitacao}</p>
          </div>
        )}

        {hasScale && (
          <div className="rounded-lg border border-[#01696f]/25 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase text-[#01696f]">Escala da mensalidade</p>
                <p className="mt-1 text-sm text-[var(--text)]">Valores por faixa de mês.</p>
              </div>
              <SourceChip label="PDF" tone="ok" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {mensalidade?.escala?.map((item, index) => (
                <div key={`${item.periodo}-${item.valor}`} className="rounded-md border border-[var(--border)] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--text)]">{item.periodo}</p>
                    <span className="rounded-full bg-[#01696f] px-2 py-0.5 text-[10px] font-bold text-white">faixa {index + 1}</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold leading-tight text-[#01696f]">{item.valor}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-[#01696f]/25 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#01696f]" />
              <p className="text-xs font-bold uppercase text-[#01696f]">Serviços</p>
            </div>
            <SourceChip label={condicoesPagamento?.faturamento?.evidenciaCampo || condicoesPagamento?.pacote?.evidenciaCampo ? 'PDF' : 'Revisar'} tone={condicoesPagamento?.faturamento?.evidenciaCampo || condicoesPagamento?.pacote?.evidenciaCampo ? 'ok' : 'warn'} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-[var(--border)] bg-white p-2">
              <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">Faturamento</p>
              <p className="text-sm font-semibold text-[var(--text)]">{faturamentoValue || 'Não encontrado no PDF'}</p>
            </div>
          </div>

          {condicoesPagamento?.pacote && (
            <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase text-[#01696f]">Faturamento por pacote</p>
                <p className="mt-1 text-sm text-[var(--text)]">Marcos e percentuais mínimos de faturamento.</p>
              </div>
              <SourceChip label="PDF" tone="ok" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {condicoesPagamento.pacote.etapas.map((stage) => (
                <div key={stage.etapa} className="rounded-md border border-[var(--border)] bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--text)]">{stage.etapa}</p>
                    <span className="rounded-full bg-[#01696f] px-2 py-0.5 text-[10px] font-bold text-white">mín. {stage.percentualMinimo}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {stage.marcos.map((marco) => (
                      <li key={`${stage.etapa}-${marco.descricao}-${marco.percentual || ''}`} className="flex gap-1.5 text-[11px] leading-snug text-[var(--muted-foreground)]">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#01696f]" />
                        <span>
                          {marco.descricao}
                          {marco.percentual ? <strong className="ml-1 text-[#01696f]">{marco.percentual}</strong> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md bg-white border border-[var(--border)] p-2.5">
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Prazo Contratual</p>
            <p className="text-sm font-semibold text-[var(--text)] mt-0.5">{prazoContratual || 'Verificar no CRM'}</p>
          </div>
          <div className="rounded-md bg-white border border-[var(--border)] p-2.5">
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Validade</p>
            <p className="text-sm font-semibold text-[var(--text)] mt-0.5">{validadeProposta || 'Não encontrado no PDF'}</p>
          </div>
        </div>

        {(hasFinanciamento || multaRescisoria) && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {hasFinanciamento && (
              <div className="rounded-md bg-[#cedcd8]/30 border border-[#01696f]/20 p-3">
                <p className="text-[10px] text-[#01696f] font-semibold uppercase tracking-wider mb-1">Financiamento</p>
                <p className="text-sm text-[var(--text)]">{financiamento}</p>
              </div>
            )}
            {multaRescisoria && (
              <div className="rounded-md bg-[var(--background)] border border-[var(--border)] p-3">
                <p className="text-[10px] text-[var(--muted-foreground)] font-semibold uppercase tracking-wider mb-1">Multa Rescisória</p>
                <p className="text-sm text-[var(--text)]">{multaRescisoria}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Seção: Campos Ausentes (não estão na proposta)
// ============================================================
function MissingFieldsSection({ camposAusentes }: { camposAusentes: CamposAusentes }) {
  const ausentes = Object.entries(camposAusentes)
    .filter(([, valor]) => !valor || valor.trim() === '')
    .map(([key]) => key);

  const preenchidos = Object.entries(camposAusentes)
    .filter(([, valor]) => valor && valor.trim() !== '');

  if (ausentes.length === 0 && preenchidos.length === 0) return null;

  // Formatar nome do campo
  const formatFieldName = (key: string) => {
    const map: Record<string, string> = {
      revisao: 'Revisão',
      tipoAliquota: 'Tipo Alíquota',
      impostos: 'Impostos',
      motivoReprogramacao: 'Motivo da Reprogramação',
      responsavelSuporte: 'Responsável pelo Suporte',
      layout: 'Layout',
      cobrancaDespesas: 'Cobrança de Despesas',
      possuiRateio: 'Possui Rateio',
    };
    return map[key] || key;
  };

  return (
    <div className="rounded-xl border border-[#964219]/30 bg-[#ddcfc6]/20 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#964219]/20">
        <AlertTriangle className="h-4 w-4 text-[#964219]" />
        <h3 className="text-sm font-bold text-[#964219]">Campos que podem não estar na proposta</h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Campos preenchidos */}
        {preenchidos.length > 0 && (
          <div className="space-y-1.5">
            {preenchidos.map(([key, valor]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#437a22] shrink-0" />
                <span className="text-xs font-medium text-[var(--text)]">{formatFieldName(key)}:</span>
                <span className="text-xs text-[#01696f] font-semibold">{valor}</span>
              </div>
            ))}
          </div>
        )}

        {/* Campos ausentes */}
        {ausentes.length > 0 && (
          <div className="space-y-1.5">
            {ausentes.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a12c7b] shrink-0" />
                <span className="text-xs font-medium text-[var(--text)]">{formatFieldName(key)}:</span>
                <span className="text-xs text-[#a12c7b] italic">Não encontrado — verificar no CRM</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
          Estes campos podem existir apenas no sistema CRM. Verifique manualmente quando necessário.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// ResultsView principal
// ============================================================
export default function ResultsView({
  extraction,
  resultado,
  activeFilter,
  onFilterChange,
  onApplyCorrection,
  onCopySuggestion,
  onExportPDF,
  onExportCSV,
  onReset,
  numeroProposta,
}: ResultsViewProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-5">
      <AuditHero extraction={extraction} resultado={resultado} />

      {/* Seção 1: Informações Gerais (Empresa + Executivo) */}
      <GeneralInfoSection extraction={extraction} />

      {/* Seção 2: 1.1 MÓDULOS */}
      <ModulesSection modulos={extraction.modulos} />

      {/* Seção 3: 2. ESCOPO DE SERVIÇOS CONTEMPLADOS */}
      <ScopeSection escopos={extraction.escopos} />

      {/* Seção 4: 3. INVESTIMENTO */}
      <InvestmentSection
        investimentos={extraction.investimentos}
        impostoCCI={extraction.impostoCCI}
        impostosInclusos={extraction.impostosInclusos}
      />

      {/* Seção 5: 5. CONDIÇÕES DE PAGAMENTO */}
      <PaymentSection
        condicoes={extraction.condicoes}
        condicoesPagamento={extraction.condicoesPagamento}
        prazoContratual={extraction.prazoContratual}
        validadeProposta={extraction.validadeProposta}
        multaRescisoria={extraction.multaRescisoria}
        faturamentoServicos={extraction.faturamentoServicos}
        financiamento={extraction.financiamento}
      />

      {/* Seção 6: Campos Ausentes */}
      <MissingFieldsSection camposAusentes={extraction.camposAusentes} />

      {/* Seção 7: Validação */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">Validação</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Score + filtros — 1/3 */}
          <div className="space-y-4">
            <ScoreCard resultado={resultado} />

            {resultado.camposCRMNaoEncontrados && resultado.camposCRMNaoEncontrados.length > 0 && (
              <div className="rounded-xl border border-[#a12c7b]/30 bg-[#e0ced7]/30 p-4">
                <p className="text-xs font-semibold text-[#a12c7b] mb-2">Campos exclusivos do CRM (não estão no PDF)</p>
                <ul className="space-y-1">
                  {resultado.camposCRMNaoEncontrados.map((campo) => (
                    <li key={campo} className="text-xs text-[var(--text)] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#a12c7b] shrink-0" />
                      {campo}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
                  Verifique esses campos diretamente no sistema CRM.
                </p>
              </div>
            )}

            <FilterChips
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
              categories={[...new Set(resultado.itens.map(i => i.categoria))]}
            />
          </div>

          {/* Lista de validação — 2/3 */}
          <div className="lg:col-span-2">
            <ValidationList
              itens={activeFilter === 'Todos'
                ? resultado.itens
                : resultado.itens.filter(i => i.categoria === activeFilter)
              }
              onApplyCorrection={onApplyCorrection}
              onCopySuggestion={onCopySuggestion}
            />
          </div>
        </div>
      </div>

      {/* Exportação */}
      <ExportPanel
        resultado={resultado}
        numeroProposta={numeroProposta}
        onExportPDF={onExportPDF}
        onExportCSV={onExportCSV}
        onReset={onReset}
      />
    </div>
  );
}
