/**
 * Módulo de parsing financeiro — ProValida Senior
 * Funções puras para parsing e formatação de valores monetários brasileiros.
 * Sem dependências do React — totalmente testável em isolamento.
 */

// ============================================================
// Parsers de valores monetários
// ============================================================

/**
 * Converte string BRL (ex: "R$ 15.240,80") para number.
 * Retorna null se inválido.
 */
export function parseBRL(s: string): number | null {
  if (!s) return null;
  const clean = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

/**
 * Formata number para string BRL (ex: 15240.80 → "R$ 15.240,80").
 */
export function formatBRL(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Verifica se uma string BRL tem valor válido (não é "—", "", "R$ 0,00").
 */
export function isBRLValueValid(s: string | undefined | null): boolean {
  if (!s) return false;
  if (s === '—' || s.trim() === '') return false;
  const num = parseBRL(s);
  return num !== null && num > 0;
}

// ============================================================
// Regex patterns para valores monetários
// ============================================================

/**
 * Regex que captura valores no formato brasileiro com R$.
 * Suporta: R$ 15.240,80 | R$ 15240,80 | R$ 15.240
 */
export const BRL_CURRENCY_REGEX = /R\$\s*([\d.]+,\d{2})|R\$\s*([\d.]+,\d)|R\$\s*([\d,]+)\b/g;

/**
 * Regex para valores sem R$ mas com vírgula decimal (em contexto financeiro).
 */
export const BRL_VALUE_NO_PREFIX_REGEX = /(?:^|\s)([\d.]+,\d{2})(?:\s|$)/g;

// ============================================================
// Cálculos de imposto CCI
// ============================================================

/** Fator de multiplicação padrão para imposto CCI de 10.50% */
export const CCI_DEFAULT = 10.50;

/**
 * Calcula valor "com imposto" a partir do valor "sem imposto".
 * LÓGICA: sem_imposto é o valor BASE (vem automático do sistema).
 * com_imposto = sem_imposto × (1 + cci/100)
 */
export function calcularComImposto(valorSemImposto: number, cci: number = CCI_DEFAULT): number {
  return valorSemImposto * (1 + cci / 100);
}

/**
 * Calcula valor "sem imposto" a partir do valor "com imposto".
 * Usado apenas quando o PDF só traz o valor com imposto.
 * sem_imposto = com_imposto / (1 + cci/100)
 */
export function calcularSemImposto(valorComImposto: number, cci: number = CCI_DEFAULT): number {
  return valorComImposto / (1 + cci / 100);
}

/**
 * Valida se a diferença entre "com imposto" e "sem imposto" é ~CCI%.
 * Retorna true se a diferença percentual está dentro da tolerância.
 */
export function validarDiferencaCCI(
  valorComImposto: number,
  valorSemImposto: number,
  cci: number = CCI_DEFAULT,
  tolerancia: number = 1.0
): { ok: boolean; diferencaPercentual: number } {
  if (valorSemImposto <= 0) return { ok: false, diferencaPercentual: 0 };
  const diferencaPercentual = ((valorComImposto - valorSemImposto) / valorSemImposto) * 100;
  return {
    ok: Math.abs(diferencaPercentual - cci) < tolerancia,
    diferencaPercentual,
  };
}
