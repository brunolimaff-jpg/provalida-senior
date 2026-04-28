'use client';

import { Building2, User, Package, FileSearch, DollarSign, CreditCard, AlertTriangle, ChevronRight, Shield } from 'lucide-react';
import type { ExtractionResult, ValidationItem, ValidationResult, ModuloItem, EscopoItem, InvestimentoItem, CondicaoPagamento, CamposAusentes } from './types';
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
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-0.5 w-20 shrink-0">Endereço</span>
            <span className="text-sm text-[var(--text)]">{extraction.endereco}</span>
          </div>
        )}

        {/* Executivo */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-[#01696f]" />
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Executivo</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-[var(--muted)]">Nome</p>
              <p className="text-sm font-medium text-[var(--text)]">{extraction.executivo}</p>
            </div>
            {extraction.cargoExecutivo && (
              <div>
                <p className="text-[10px] text-[var(--muted)]">Cargo</p>
                <p className="text-sm text-[var(--text)]">{extraction.cargoExecutivo}</p>
              </div>
            )}
            {extraction.emailExecutivo && (
              <div>
                <p className="text-[10px] text-[var(--muted)]">E-mail</p>
                <p className="text-sm text-[#01696f] break-all">{extraction.emailExecutivo}</p>
              </div>
            )}
          </div>
        </div>

        {/* Proposta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Proposta</p>
            <p className="text-sm font-semibold text-[var(--text)]">{extraction.numeroProposta || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Código</p>
            <p className="text-sm font-semibold text-[#01696f]">{extraction.codigoProposta || '—'}</p>
          </div>
          {extraction.versaoModelo && (
            <div className="col-span-2">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Versão do Modelo</p>
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
        <span className="ml-auto text-[10px] text-[var(--muted)]">{modulos.length} módulos</span>
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
                    <th className="py-2 px-4 text-left font-semibold text-[var(--muted)] uppercase tracking-wider">Módulo</th>
                    <th className="py-2 px-4 text-right font-semibold text-[var(--muted)] uppercase tracking-wider">Qtd</th>
                    <th className="py-2 px-4 text-left font-semibold text-[var(--muted)] uppercase tracking-wider">Modalidade</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((mod, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
                      <td className="py-2.5 px-4 text-[var(--text)] font-medium">{mod.modulo}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-[#01696f]">{mod.quantidade}</td>
                      <td className="py-2.5 px-4 text-[var(--muted)]">{mod.unidade}</td>
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

  const impostoConfirmado = impostoCCI === 10.50 || impostoCCI === 10.5;

  // Validar se a diferença entre com e sem imposto é ~10.50%
  const parseBRL = (s: string): number | null => {
    const clean = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  };

  const validacoes = investimentos.map(item => {
    const com = parseBRL(item.valorComImposto);
    const sem = parseBRL(item.valorSemImposto);
    if (com && sem && sem > 0) {
      const diferenca = ((com - sem) / sem) * 100;
      const ok = Math.abs(diferenca - impostoCCI) < 1.0;
      return { ok, diferenca: diferenca.toFixed(2) };
    }
    return { ok: true, diferenca: '—' };
  });

  const todasValidacoesOk = validacoes.every(v => v.ok);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)]">
        <DollarSign className="h-4 w-4 text-[#01696f]" />
        <h3 className="text-sm font-bold text-[var(--text)]">3. INVESTIMENTO</h3>

        {/* Badges */}
        <div className="ml-auto flex items-center gap-1.5">
          {impostoConfirmado ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#d4dfcc] px-2.5 py-0.5 text-[10px] font-semibold text-[#437a22]">
              <Shield className="h-3 w-3" /> CCI {impostoCCI}% confirmado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ddcfc6] px-2.5 py-0.5 text-[10px] font-semibold text-[#964219]">
              <AlertTriangle className="h-3 w-3" /> CCI {impostoCCI}% — verificar
            </span>
          )}
          {todasValidacoesOk ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#d4dfcc] px-2.5 py-0.5 text-[10px] font-semibold text-[#437a22]">
              <Shield className="h-3 w-3" /> Diferença validada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e0ced7] px-2.5 py-0.5 text-[10px] font-semibold text-[#a12c7b]">
              <AlertTriangle className="h-3 w-3" /> Diferença inconsistente
            </span>
          )}
        </div>
      </div>

      {/* Info sobre impostos */}
      <div className="px-5 py-2.5 border-b border-[var(--border)] bg-[#cedcd8]/20">
        <p className="text-[10px] text-[var(--text)]">
          {impostosInclusos
            ? `Valores JÁ INCLUEM ${impostoCCI}% de imposto CCI. O valor "sem imposto" é o base, calculado dividindo por ${(1 + impostoCCI / 100).toFixed(3)}. A diferença entre "com imposto" e "sem imposto" deve ser de ~${impostoCCI}%.`
            : `Valores NÃO INCLUEM ${impostoCCI}% de imposto CCI. O valor "com imposto" = sem imposto × ${(1 + impostoCCI / 100).toFixed(3)}. A diferença deve ser de ~${impostoCCI}%.`
          }
        </p>
      </div>

      {/* Tabela de valores */}
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                <th className="pb-3 text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Item</th>
                <th className="pb-3 text-right text-[10px] font-semibold text-[#437a22] uppercase tracking-wider">Com Imposto</th>
                <th className="pb-3 text-right text-[10px] font-semibold text-[#964219] uppercase tracking-wider">Sem Imposto</th>
                <th className="pb-3 text-right text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {investimentos.map((item, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 text-sm font-medium text-[var(--text)]">{item.descricao}</td>
                  <td className="py-3 text-right text-sm font-bold text-[#437a22]">{item.valorComImposto}</td>
                  <td className="py-3 text-right text-sm font-semibold text-[#964219]">{item.valorSemImposto}</td>
                  <td className="py-3 text-right text-xs">
                    {validacoes[i]?.ok ? (
                      <span className="text-[#437a22] font-medium">{validacoes[i].diferenca}%</span>
                    ) : (
                      <span className="text-[#a12c7b] font-semibold">{validacoes[i].diferenca}% ⚠</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Seção: 5. CONDIÇÕES DE PAGAMENTO
// ============================================================
function PaymentSection({ condicoes, prazoContratual, validadeProposta, multaRescisoria, faturamentoServicos, financiamento }: {
  condicoes: CondicaoPagamento[];
  prazoContratual: string;
  validadeProposta: string;
  multaRescisoria: string;
  faturamentoServicos?: string;
  financiamento?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)]">
        <CreditCard className="h-4 w-4 text-[#01696f]" />
        <h3 className="text-sm font-bold text-[var(--text)]">5. CONDIÇÕES DE PAGAMENTO</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Condições por tipo */}
        {condicoes.map((cond, i) => (
          <div key={i} className="rounded-lg border border-[var(--border)] overflow-hidden">
            {/* Tipo header */}
            <div className="bg-[#cedcd8]/30 px-4 py-2 border-b border-[var(--border)]">
              <p className="text-xs font-bold text-[#01696f]">{cond.tipo}</p>
            </div>

            <div className="p-4 space-y-3">
              {/* Condição principal */}
              {cond.condicao && (
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Condição</p>
                  {cond.condicao.split('\n').map((line, j) => (
                    <p key={j} className="text-sm text-[var(--text)]">{line}</p>
                  ))}
                </div>
              )}

              {/* Descontos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-[var(--background)] border border-[var(--border)] p-2.5">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Desc. Habilitação</p>
                  <p className="text-sm font-medium text-[var(--text)] mt-0.5">
                    {cond.descontoHabilitacao || 'Não informado'}
                  </p>
                </div>
                <div className="rounded-md bg-[var(--background)] border border-[var(--border)] p-2.5">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Desc. Serviços</p>
                  <p className="text-sm font-medium text-[var(--text)] mt-0.5">
                    {cond.descontoServicos || 'Não informado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Informações adicionais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {prazoContratual && (
            <div className="rounded-md bg-[var(--background)] border border-[var(--border)] p-2.5">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Prazo Contratual</p>
              <p className="text-sm font-semibold text-[var(--text)] mt-0.5">{prazoContratual}</p>
            </div>
          )}
          {validadeProposta && (
            <div className="rounded-md bg-[var(--background)] border border-[var(--border)] p-2.5">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Validade</p>
              <p className="text-sm font-semibold text-[var(--text)] mt-0.5">{validadeProposta}</p>
            </div>
          )}
          {multaRescisoria && (
            <div className="rounded-md bg-[var(--background)] border border-[var(--border)] p-2.5">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Multa Rescisória</p>
              <p className="text-sm font-semibold text-[var(--text)] mt-0.5">{multaRescisoria}</p>
            </div>
          )}
          {faturamentoServicos && (
            <div className="rounded-md bg-[var(--background)] border border-[var(--border)] p-2.5">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Faturamento</p>
              <p className="text-sm font-semibold text-[var(--text)] mt-0.5">{faturamentoServicos}</p>
            </div>
          )}
        </div>

        {/* Financiamento */}
        {financiamento && (
          <div className="rounded-md bg-[#cedcd8]/30 border border-[#01696f]/20 p-3">
            <p className="text-[10px] text-[#01696f] font-semibold uppercase tracking-wider mb-1">Financiamento</p>
            <p className="text-sm text-[var(--text)]">{financiamento}</p>
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

        <p className="text-[10px] text-[var(--muted)] mt-2">
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
                <p className="mt-2 text-[10px] text-[var(--muted)]">
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
