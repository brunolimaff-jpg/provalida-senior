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
import { extractFieldsLocally } from '@/services/local-extraction';

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
  const { mensalidade, habilitacao, mensalidadeSemImposto, habilitacaoSemImposto, evidencias } = extrairInvestimentoDoPDF(pdfText);

  if (mensalidade || habilitacao) {
    console.log('[ProValida] Investimentos críticos definidos pelo parser local do PDF.');

    result.investimentos = [
      {
        descricao: 'Mensalidade',
        valorComImposto: mensalidade ? formatBRL(mensalidade) : '—',
        valorSemImposto: mensalidadeSemImposto ? formatBRL(mensalidadeSemImposto) : mensalidade ? formatBRL(calcularSemImposto(mensalidade, result.impostoCCI || CCI_DEFAULT)) : '—',
        origem: 'pdf',
        confianca: mensalidade ? 'alta' : 'baixa',
        evidenciaCampo: evidencias?.mensalidade?.trecho,
      },
      {
        descricao: 'Habilitação + Serviços',
        valorComImposto: habilitacao ? formatBRL(habilitacao) : '—',
        valorSemImposto: habilitacaoSemImposto ? formatBRL(habilitacaoSemImposto) : habilitacao ? formatBRL(calcularSemImposto(habilitacao, result.impostoCCI || CCI_DEFAULT)) : '—',
        origem: 'pdf',
        confianca: habilitacao ? 'alta' : 'baixa',
        evidenciaCampo: evidencias?.habilitacao?.trecho,
      },
    ];
  }
}

// ============================================================
// Complementar condições de pagamento
// ============================================================

function isPlaceholderCondicao(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase();
  // Detectar texto placeholder que a API LLM retorna quando não encontra o valor real
  return lower.includes('descreva as condições') ||
         lower.includes('descreva as condicoes') ||
         lower.includes('não informado ou o valor') ||
         lower.includes('nao informado ou o valor') ||
         lower.trim() === '';
}

function complementarCondicoes(result: ExtractionResult, pdfText: string): void {
  // SEMPRE extrair condições do PDF para ter dados reais
  const condicoesExtraidas = extrairCondicoesDoPDF(pdfText);
  result.condicoesPagamento = {
    ...(result.condicoesPagamento || { mensalidade: {}, habilitacaoServicos: {} }),
    ...(condicoesExtraidas.detalhes || {}),
  };
  result.evidencias = {
    ...(result.evidencias || {}),
    ...(condicoesExtraidas.evidencias || {}),
  };
  result.financiamento = condicoesExtraidas.financiamento;
  if (condicoesExtraidas.faturamentoServicos) {
    result.faturamentoServicos = condicoesExtraidas.faturamentoServicos;
  }

  const condicoesTemValoresReais = result.condicoes && result.condicoes.length > 0 &&
    result.condicoes.some(c => c.condicao && !isPlaceholderCondicao(c.condicao));

  if (!condicoesTemValoresReais) {
    console.log('[ProValida] Condições sem valores reais, usando extração do PDF...');
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
    // Complementar campos vazios ou placeholder com dados do PDF
    for (const cond of result.condicoes) {
      // Sobrescrever se for placeholder
      if (isPlaceholderCondicao(cond.condicao)) {
        if (cond.tipo === 'Mensalidade') {
          cond.condicao = condicoesExtraidas.condicaoMensalidade;
        } else if (cond.tipo === 'Habilitação + Serviços') {
          cond.condicao = condicoesExtraidas.condicaoHabilitacao;
        }
      }
      if (!cond.descontoHabilitacao || cond.descontoHabilitacao.trim() === '' || cond.descontoHabilitacao === 'Não informado') {
        cond.descontoHabilitacao = condicoesExtraidas.descontoHabilitacao;
      }
      if (!cond.descontoServicos || cond.descontoServicos.trim() === '' || cond.descontoServicos === 'Não informado') {
        cond.descontoServicos = condicoesExtraidas.descontoServicos;
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
    result.faturamentoServicos = lower.includes('por pacote') || lower.includes('evolução') || lower.includes('evolucao')
      ? 'Por pacote'
      : lower.includes('antecipado')
        ? 'Antecipado'
        : lower.includes('pós-entrega')
          ? 'Pós-entrega'
          : '';
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
  const local = extractFieldsLocally(pdfText);
  complementarDadosGerais(result, pdfText);
  complementarInvestimentos(result, pdfText);
  complementarCondicoes(result, pdfText);
  complementarCamposAuxiliares(result, pdfText);
  result.cliente = local.cliente || result.cliente;
  result.cnpj = local.cnpj || result.cnpj;
  result.endereco = local.endereco || result.endereco;
  result.executivo = local.executivo || result.executivo;
  result.emailExecutivo = local.emailExecutivo || result.emailExecutivo;
  result.cargoExecutivo = local.cargoExecutivo || result.cargoExecutivo;
  result.condicoesPagamento = local.condicoesPagamento || result.condicoesPagamento;
  result.financiamento = local.financiamento;
  result.faturamentoServicos = local.faturamentoServicos || result.faturamentoServicos;
  result.evidencias = { ...(result.evidencias || {}), ...(local.evidencias || {}) };
  result.resumoAuditoria = local.resumoAuditoria;
  result.campos = local.campos;
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
  const {
    mensalidade: pdfMensalidade,
    habilitacao: pdfHabilitacao,
    mensalidadeSemImposto: pdfMensalidadeSemImposto,
    habilitacaoSemImposto: pdfHabilitacaoSemImposto,
  } = extrairInvestimentoDoPDF(pdfText);

  const pdfValues: Record<string, number | null> = {
    'Mensalidade': pdfMensalidade,
    'Habilitação + Serviços': pdfHabilitacao,
  };
  const pdfBaseValues: Record<string, number | null | undefined> = {
    'Mensalidade': pdfMensalidadeSemImposto,
    'Habilitação + Serviços': pdfHabilitacaoSemImposto,
  };

  // Recalcular cada investimento
  return investimentos.map(item => {
    const pdfValorCom = pdfValues[item.descricao] ?? null;
    const pdfValorSem = pdfBaseValues[item.descricao] ?? null;

    if (pdfValorCom && pdfValorSem) {
      return {
        ...item,
        valorComImposto: formatBRL(pdfValorCom),
        valorSemImposto: formatBRL(pdfValorSem),
      };
    }

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
