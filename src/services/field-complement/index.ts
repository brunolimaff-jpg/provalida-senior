/**
 * Módulo de complementação de campos — ProValida Senior
 * Complementa dados da API com extração local do texto do PDF.
 * Esta função SEMPRE tenta extrair valores do texto para garantir
 * que os campos não fiquem vazios quando a API LLM falha.
 * Sem dependências do React — totalmente testável em isolamento.
 */

import type { ExtractionResult } from '@/components/provalida/types';
import { parseBRL, formatBRL, isBRLValueValid, calcularSemImposto, calcularComImposto, CCI_DEFAULT, validarDiferencaCCI } from '@/services/financial-parsing';
import { extrairInvestimentoDoPDF, extrairCondicoesDoPDF } from '@/services/pdf-extraction';

// ============================================================
// Helper: Buscar padrão em texto
// ============================================================

function findPattern(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1] || match[0];
  }
  return null;
}

// ============================================================
// Complementar dados gerais (cliente, CNPJ, etc.)
// ============================================================

function complementarDadosGerais(result: ExtractionResult, pdfText: string): void {
  if (!result.cliente || result.cliente === 'Não identificado' || result.cliente.trim() === '') {
    result.cliente = findPattern(pdfText, [/Cliente[:\s]+(.+?)(?:\s*[—\-–]\s*|\s+CNPJ)/i]) || result.cliente || '';
  }
  if (!result.cnpj || result.cnpj.trim() === '') {
    result.cnpj = findPattern(pdfText, [/CNPJ[:\s]*([\d./-]+)/i]) || '';
  }
  if (!result.endereco || result.endereco.trim() === '') {
    result.endereco = findPattern(pdfText, [/Endereço[:\s]+(.+?)(?:\s*[—\-–]\s*|\s+CEP)/i]) || '';
  }
  if (!result.executivo || result.executivo.trim() === '') {
    result.executivo = findPattern(pdfText, [/Executivo[^:]*[:\s]+(.+?)(?:\s*[—\-–]\s*|\s*$)/im]) || '';
  }
  if (!result.emailExecutivo || result.emailExecutivo.trim() === '') {
    const emailMatch = pdfText.match(/[\w.]+@senior\.com\.br/i);
    if (emailMatch) result.emailExecutivo = emailMatch[0];
  }
  if (!result.codigoProposta || result.codigoProposta.trim() === '') {
    result.codigoProposta = findPattern(pdfText, [/PR[\w]+/i]) || '';
  }
}

// ============================================================
// Complementar investimentos
// LÓGICA: "sem imposto" é o valor BASE (vem automático do sistema).
// "com imposto" = sem_imposto × 1.105
// ============================================================

function complementarInvestimentos(result: ExtractionResult, pdfText: string): void {
  const investimentosTemValores = result.investimentos && result.investimentos.length > 0 &&
    result.investimentos.some(i => isBRLValueValid(i.valorComImposto) || isBRLValueValid(i.valorSemImposto));

  if (!investimentosTemValores) {
    console.log('[ProValida] Investimentos sem valores, extraindo do PDF...');
    const { mensalidade, habilitacao } = extrairInvestimentoDoPDF(pdfText);
    const cci = result.impostoCCI || CCI_DEFAULT;

    result.investimentos = [
      {
        descricao: 'Mensalidade',
        valorComImposto: mensalidade ? formatBRL(calcularComImposto(calcularSemImposto(mensalidade, cci), cci)) : '—',
        valorSemImposto: mensalidade ? formatBRL(calcularSemImposto(mensalidade, cci)) : '—',
      },
      {
        descricao: 'Habilitação + Serviços',
        valorComImposto: habilitacao ? formatBRL(calcularComImposto(calcularSemImposto(habilitacao, cci), cci)) : '—',
        valorSemImposto: habilitacao ? formatBRL(calcularSemImposto(habilitacao, cci)) : '—',
      },
    ];
  }
}

// ============================================================
// Complementar condições de pagamento
// ============================================================

function complementarCondicoes(result: ExtractionResult, pdfText: string): void {
  const condicoesTemValores = result.condicoes && result.condicoes.length > 0 &&
    result.condicoes.some(c => c.condicao && c.condicao.trim() !== '');

  if (!condicoesTemValores) {
    console.log('[ProValida] Condições sem valores, extraindo do PDF...');
    const condicoesExtraidas = extrairCondicoesDoPDF(pdfText);

    result.condicoes = [
      {
        tipo: 'Mensalidade',
        condicao: condicoesExtraidas.condicaoMensalidade,
        descontoHabilitacao: condicoesExtraidas.descontoHabilitacao,
        descontoServicos: condicoesExtraidas.descontoServicos,
      },
      {
        tipo: 'Habilitação + Serviços',
        condicao: condicoesExtraidas.condicaoHabilitacao,
        descontoHabilitacao: condicoesExtraidas.descontoHabilitacao,
        descontoServicos: condicoesExtraidas.descontoServicos,
      },
    ];
  } else {
    // Mesmo tendo condições, complementar descontos se estiverem vazios
    const condicoesExtraidas = extrairCondicoesDoPDF(pdfText);
    for (const cond of result.condicoes) {
      if (!cond.descontoHabilitacao || cond.descontoHabilitacao.trim() === '' || cond.descontoHabilitacao === 'Não informado') {
        cond.descontoHabilitacao = condicoesExtraidas.descontoHabilitacao;
      }
      if (!cond.descontoServicos || cond.descontoServicos.trim() === '' || cond.descontoServicos === 'Não informado') {
        cond.descontoServicos = condicoesExtraidas.descontoServicos;
      }
      // Se cond.condicao está vazio mas temos extração local, preencher
      if ((!cond.condicao || cond.condicao.trim() === '') && cond.tipo === 'Mensalidade') {
        cond.condicao = condicoesExtraidas.condicaoMensalidade;
      }
      if ((!cond.condicao || cond.condicao.trim() === '') && cond.tipo === 'Habilitação + Serviços') {
        cond.condicao = condicoesExtraidas.condicaoHabilitacao;
      }
    }
  }
}

// ============================================================
// Complementar campos auxiliares
// ============================================================

function complementarCamposAuxiliares(result: ExtractionResult, pdfText: string): void {
  const lower = pdfText.toLowerCase();

  // Escopos
  if (!result.escopos || result.escopos.length === 0) {
    const escopoMatches = [...pdfText.matchAll(/ESCOPO_SINTETICO[\w_[\]]+/gi)];
    if (escopoMatches.length > 0) {
      result.escopos = escopoMatches.map(m => ({ id: m[0] }));
    }
  }

  // Prazo, validade, multa
  if (!result.prazoContratual || result.prazoContratual.trim() === '') {
    const match = pdfText.match(/(\d+)\s*meses/i);
    if (match) result.prazoContratual = `${match[1]} meses`;
  }
  if (!result.validadeProposta || result.validadeProposta.trim() === '') {
    const match = pdfText.match(/[Vv]alidade[:\s]*(\d+)\s*dias/i);
    if (match) result.validadeProposta = `${match[1]} dias`;
  }
  if (!result.multaRescisoria || result.multaRescisoria.trim() === '') {
    const match = pdfText.match(/[Mm]ulta\s+rescis[oó]ria[:\s]*([^\n]+)/i);
    if (match) result.multaRescisoria = match[1].trim();
  }
  if (!result.faturamentoServicos || result.faturamentoServicos.trim() === '') {
    result.faturamentoServicos = lower.includes('antecipado') ? 'Antecipado' : lower.includes('pós-entrega') ? 'Pós-entrega' : '';
  }
  if (!result.financiamento || result.financiamento.trim() === '') {
    if (lower.includes('btg')) {
      result.financiamento = 'Financiamento Banco BTG Pactual — Prazo: 15 dias — Cancelamento automático';
    }
  }

  // Impostos
  if (!result.camposAusentes.impostos || result.camposAusentes.impostos.trim() === '') {
    if (lower.includes('impostos já inclusos') || lower.includes('contêm impostos') || lower.includes('incluem impostos') || lower.includes('contém impostos')) {
      result.camposAusentes.impostos = 'Impostos já inclusos';
    }
  }

  // Detectar impostoCCI
  if (!result.impostoCCI || result.impostoCCI === 0) {
    const impostoMatch = findPattern(pdfText, [/([\d,]+)\s*%\s*.*(?:CCI|imposto)/i]) ||
                         findPattern(pdfText, [/(?:CCI|imposto).*?([\d,]+)\s*%/i]);
    if (impostoMatch) {
      result.impostoCCI = parseFloat(impostoMatch.replace(',', '.'));
    } else {
      result.impostoCCI = CCI_DEFAULT;
    }
  }

  // Detectar impostosInclusos
  if (result.impostosInclusos === undefined || result.impostosInclusos === null) {
    result.impostosInclusos = lower.includes('impostos') && (lower.includes('inclusos') || lower.includes('contêm') || lower.includes('incluem') || lower.includes('contém'));
  }
}

// ============================================================
// Função principal: Complementar dados da API com extração local
// ============================================================

export function complementarComExtracaoLocal(result: ExtractionResult, pdfText: string): ExtractionResult {
  complementarDadosGerais(result, pdfText);
  complementarInvestimentos(result, pdfText);
  complementarCondicoes(result, pdfText);
  complementarCamposAuxiliares(result, pdfText);
  return result;
}

// ============================================================
// Validar e recalcular investimentos
// LÓGICA CORRETA:
// - O valor "sem imposto" é o BASE (vem automaticamente do sistema).
// - O valor "com imposto" = sem_imposto × 1.105
// - Há mais chance do valor "com imposto" estar errado.
// - Validamos se a diferença entre "com" e "sem" é ~10.50%.
// - Se inconsistente, usamos "sem imposto" como base e recalcularmos "com imposto".
// ============================================================

export function validarERecalcularInvestimentos(
  investimentos: { descricao: string; valorComImposto: string; valorSemImposto: string }[],
  impostoCCI: number,
  impostosInclusos: boolean,
  pdfText: string
): { descricao: string; valorComImposto: string; valorSemImposto: string }[] {
  // Se investimentos está vazio, extrair do PDF
  if (!investimentos || investimentos.length === 0 ||
      investimentos.every(i => !isBRLValueValid(i.valorComImposto) && !isBRLValueValid(i.valorSemImposto))) {
    console.log('[ProValida] validação: investimentos vazios, extraindo do PDF...');
    const { mensalidade, habilitacao } = extrairInvestimentoDoPDF(pdfText);

    return [
      {
        descricao: 'Mensalidade',
        valorSemImposto: mensalidade ? formatBRL(calcularSemImposto(mensalidade, impostoCCI)) : '—',
        valorComImposto: mensalidade ? formatBRL(mensalidade) : '—',
      },
      {
        descricao: 'Habilitação + Serviços',
        valorSemImposto: habilitacao ? formatBRL(calcularSemImposto(habilitacao, impostoCCI)) : '—',
        valorComImposto: habilitacao ? formatBRL(habilitacao) : '—',
      },
    ];
  }

  // Cross-validação com o PDF
  const { mensalidade: pdfMensalidade, habilitacao: pdfHabilitacao } = extrairInvestimentoDoPDF(pdfText);

  const pdfValues: Record<string, number | null> = {
    'Mensalidade': pdfMensalidade,
    'Habilitação + Serviços': pdfHabilitacao,
  };

  // Recalcular cada investimento
  return investimentos.map(item => {
    const pdfValorCom = pdfValues[item.descricao] ?? null;
    const valorComOriginal = parseBRL(item.valorComImposto);
    const valorSemOriginal = parseBRL(item.valorSemImposto);

    // Se temos o valor "com imposto" do PDF, usar como referência
    const valorComRef = pdfValorCom ?? valorComOriginal;
    const valorSemRef = valorSemOriginal;

    // Se temos ambos os valores, validar a diferença
    if (valorComRef && valorSemRef) {
      const validacao = validarDiferencaCCI(valorComRef, valorSemRef, impostoCCI);

      if (validacao.ok) {
        // Valores consistentes — usar sem imposto como base e recalcular com imposto
        return {
          ...item,
          valorSemImposto: formatBRL(valorSemRef),
          valorComImposto: formatBRL(calcularComImposto(valorSemRef, impostoCCI)),
        };
      } else {
        // Diferença inconsistente — confiar no "sem imposto" (BASE) e recalcular "com imposto"
        console.log(`[ProValida] Diferença inconsistente para ${item.descricao}: ${validacao.diferencaPercentual.toFixed(2)}% (esperado ${impostoCCI}%). Usando sem imposto como base.`);
        return {
          ...item,
          valorSemImposto: formatBRL(valorSemRef),
          valorComImposto: formatBRL(calcularComImposto(valorSemRef, impostoCCI)),
        };
      }
    }

    // Só temos valor "com imposto" — calcular "sem imposto"
    if (valorComRef && !valorSemRef) {
      return {
        ...item,
        valorComImposto: formatBRL(valorComRef),
        valorSemImposto: formatBRL(calcularSemImposto(valorComRef, impostoCCI)),
      };
    }

    // Só temos valor "sem imposto" — calcular "com imposto"
    if (valorSemRef && !valorComRef) {
      return {
        ...item,
        valorSemImposto: formatBRL(valorSemRef),
        valorComImposto: formatBRL(calcularComImposto(valorSemRef, impostoCCI)),
      };
    }

    return item;
  });
}
