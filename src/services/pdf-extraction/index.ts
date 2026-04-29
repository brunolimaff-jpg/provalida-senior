/**
 * Módulo de extração de dados de PDF — ProValida Senior
 * Funções puras para extrair valores monetários, investimentos e condições
 * de pagamento do texto extraído de PDFs de propostas comerciais.
 * Sem dependências do React — totalmente testável em isolamento.
 */

import type { ParsedEvidence, ParsedInvestment, ParsedPaymentTerms } from '@/components/provalida/types';
import { parseBRL, BRL_CURRENCY_REGEX, BRL_VALUE_NO_PREFIX_REGEX } from '@/services/financial-parsing';

// Valor mínimo (R$) para um item ser considerado um candidato a investimento
// no fallback por maior valor — descarta ruídos como KM rodado, taxas mínimas,
// fatura excedente, etc.
const MIN_INVESTIMENTO_FALLBACK_BRL = 100;

// ============================================================
// Tipos de retorno
// ============================================================

export interface ValorMonetarioExtraido {
  valor: number;
  texto: string;
  linha: string;
}

export interface InvestimentoExtraido {
  mensalidade: number | null;
  habilitacao: number | null;
  mensalidadeSemImposto?: number | null;
  habilitacaoSemImposto?: number | null;
  evidencias?: {
    mensalidade?: ParsedEvidence;
    habilitacao?: ParsedEvidence;
  };
}

export interface CondicoesExtraidas {
  condicaoMensalidade: string;
  condicaoHabilitacao: string;
  descontoHabilitacao: string;
  descontoServicos: string;
  prazoContratual: string;
  validadeProposta: string;
  multaRescisoria: string;
  faturamentoServicos: string;
  financiamento: string;
  detalhes?: ParsedPaymentTerms['condicoes'];
  evidencias?: Record<string, ParsedEvidence>;
}

// ============================================================
// Extração de valores monetários genérica
// ============================================================

/**
 * Extrai TODOS os valores monetários (R$) do texto do PDF.
 * Retorna array de { valor, texto, linha }
 */
export function extrairValoresMonetarios(pdfText: string): ValorMonetarioExtraido[] {
  const resultados: ValorMonetarioExtraido[] = [];
  const linhas = pdfText.split('\n');

  // Passada 1: Valores com prefixo R$
  for (const linha of linhas) {
    let match;
    const regex = new RegExp(BRL_CURRENCY_REGEX.source, 'g');
    while ((match = regex.exec(linha)) !== null) {
      const texto = match[1] || match[2] || match[3];
      if (texto) {
        const valor = parseBRL(texto);
        if (valor !== null && valor > 0) {
          resultados.push({ valor, texto, linha: linha.trim() });
        }
      }
    }
  }

  // Passada 2: Valores sem R$ em contexto financeiro
  const contextKeywords = ['mensalidade', 'habilita', 'investimento', 'serviço', 'servico', 'desconto', 'parcela', 'pagamento'];
  for (const linha of linhas) {
    const lower = linha.toLowerCase();
    const hasContext = contextKeywords.some(kw => lower.includes(kw));
    if (!hasContext) continue;

    let match;
    const regex = new RegExp(BRL_VALUE_NO_PREFIX_REGEX.source, 'g');
    while ((match = regex.exec(linha)) !== null) {
      const texto = match[1];
      const valor = parseBRL(texto);
      if (valor !== null && valor > 100) {
        // Evitar duplicatas
        if (!resultados.some(r => r.linha === linha.trim() && Math.abs(r.valor - valor) < 0.01)) {
          resultados.push({ valor, texto, linha: linha.trim() });
        }
      }
    }
  }

  console.log('[ProValida] Valores monetários encontrados:', resultados.length);
  return resultados;
}

// ============================================================
// Extração de seção do PDF
// ============================================================

/**
 * Extrai uma seção do PDF entre um marcador de início e os próximos marcadores de fim.
 */
function extrairSecao(pdfText: string, inicioPattern: string | RegExp, fimPatterns: (string | RegExp)[]): string {
  const lower = pdfText.toLowerCase();
  const inicioIdx = typeof inicioPattern === 'string'
    ? lower.indexOf(inicioPattern.toLowerCase())
    : (() => { const m = pdfText.match(inicioPattern); return m ? m.index ?? -1 : -1; })();

  if (inicioIdx < 0) return '';

  let fimIdx = Infinity;
  for (const pattern of fimPatterns) {
    const searchStart = inicioIdx + 20; // Pular o próprio marcador de início
    if (typeof pattern === 'string') {
      const idx = lower.indexOf(pattern.toLowerCase(), searchStart);
      if (idx > 0) fimIdx = Math.min(fimIdx, idx);
    } else {
      const remaining = pdfText.substring(searchStart);
      const m = remaining.match(pattern);
      if (m && m.index !== undefined) fimIdx = Math.min(fimIdx, searchStart + m.index);
    }
  }

  return pdfText.substring(inicioIdx, fimIdx === Infinity ? inicioIdx + 3000 : fimIdx);
}

function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeExtractedPdfText(text: string): string {
  return text
    .replace(/\bR\s*\$\s*/g, 'R$ ')
    .replace(/(R\$\s*)([\d.\s]+,\s*\d{2})/g, (_match, prefix: string, value: string) => {
      return `${prefix}${value.replace(/\s+/g, '')}`;
    })
    .replace(/\b(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})\s*-\s*(\d{2})\b/g, '$1.$2.$3/$4-$5')
    .replace(/\b(Dados do cliente|Raz[aã]o Social|Cliente|Contratante|Endere[cç]o|CNPJ)\s+:/gi, '$1:');
}

/**
 * Extrai seção numerada exata, evitando colisões com palavras soltas no corpo.
 */
export function extrairSecaoNumerada(pdfText: string, numero: number, titulo: string): string {
  pdfText = normalizeExtractedPdfText(pdfText);
  const normalized = normalizeForSearch(pdfText);
  const normalizedTitle = normalizeForSearch(titulo);
  const titlePattern = normalizedTitle
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegex)
    .join('\\s+');
  const startRegex = new RegExp(`(?:^|\\n)\\s*${numero}\\.?\\s+${titlePattern}\\b`, 'i');
  const startMatch = normalized.match(startRegex);

  if (!startMatch || startMatch.index === undefined) return '';

  const startIdx = startMatch.index + (startMatch[0].startsWith('\n') ? 1 : 0);
  const nextRegex = new RegExp(`\\n\\s*${numero + 1}\\.?\\s+`, 'i');
  const remaining = normalized.slice(startIdx + 1);
  const nextMatch = remaining.match(nextRegex);
  const endIdx = nextMatch && nextMatch.index !== undefined
    ? startIdx + 1 + nextMatch.index
    : Math.min(pdfText.length, startIdx + 5000);

  return pdfText.slice(startIdx, endIdx).trim();
}

export function extrairSecaoPorTitulo(pdfText: string, titulo: string): string {
  pdfText = normalizeExtractedPdfText(pdfText);
  const normalized = normalizeForSearch(pdfText);
  const normalizedTitle = normalizeForSearch(titulo);
  const titlePattern = normalizedTitle
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegex)
    .join('\\s+');
  const startRegex = new RegExp(`(?:^|\\n)\\s*(\\d+)?\\.?\\s*${titlePattern}\\b`, 'i');
  const startMatch = normalized.match(startRegex);

  if (!startMatch || startMatch.index === undefined) return '';

  const startIdx = startMatch.index + (startMatch[0].startsWith('\n') ? 1 : 0);
  const startNumber = startMatch[1] ? Number(startMatch[1]) : null;
  const remaining = normalized.slice(startIdx + 1);
  const sectionTitles = '(?:regras|condicoes|condicao|aprovacao|assinatura|escopo|consideracoes|anexos|modulos|investimento|fatura)';
  const nextSectionRegex = startNumber
    ? new RegExp(`\\n\\s*(?:${startNumber + 1}|${startNumber + 2}|${startNumber + 3}|${startNumber + 4})\\.?\\s+${sectionTitles}\\b`, 'i')
    : new RegExp(`\\n\\s*\\d+\\.?\\s+${sectionTitles}\\b`, 'i');
  const nextMatch = remaining.match(nextSectionRegex);
  const endIdx = nextMatch && nextMatch.index !== undefined
    ? startIdx + 1 + nextMatch.index
    : Math.min(pdfText.length, startIdx + 6000);

  return pdfText.slice(startIdx, endIdx).trim();
}

function compactLines(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function shortEvidence(text: string, maxLength = 260): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}…`;
}

function evidence(trecho: string, secao: string, confianca: ParsedEvidence['confianca'] = 'alta'): ParsedEvidence {
  return {
    trecho: shortEvidence(trecho),
    origem: 'pdf',
    confianca,
    secao,
  };
}

function findTotalPairs(text: string): { sem: number; com: number; trecho: string }[] {
  const lines = compactLines(text);
  const pairs: { sem: number; com: number; trecho: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!/total\s*\(sem impostos?\).*total\s*\(com impostos?\)/i.test(lines[i])) continue;

    const lookAhead = lines.slice(i + 1, i + 5).join(' ');
    const values = [...lookAhead.matchAll(/R\$\s*([\d.]+,\d{2})/g)]
      .map(match => ({ raw: match[0], value: parseBRL(match[1]) }))
      .filter((item): item is { raw: string; value: number } => item.value !== null);

    if (values.length >= 2) {
      pairs.push({
        sem: values[0].value,
        com: values[1].value,
        trecho: `Total (com impostos) ${values[1].raw}`,
      });
    }
  }

  return pairs;
}

function sumLastCurrencyFromRows(text: string, mode: 'mensalidade' | 'habilitacao'): { value: number; trecho: string } | null {
  const rows = compactLines(text)
    .filter(line => /R\$\s*[\d.]+,\d{2}/.test(line))
    .filter(line => !/total\s*\(|modelo de documento|desconto|percentual|km\s*rodado/i.test(line));

  const values = rows.flatMap(line => {
    const currencies = [...line.matchAll(/R\$\s*([\d.]+,\d{2})/g)]
      .map(match => ({ raw: match[0], value: parseBRL(match[1]) }))
      .filter((item): item is { raw: string; value: number } => item.value !== null && item.value > 100);

    if (currencies.length === 0) return [];
    if (mode === 'mensalidade') return [currencies[currencies.length - 1]];
    return currencies.length >= 2 ? [currencies[currencies.length - 1]] : [];
  });

  if (values.length === 0) return null;

  const total = values.reduce((sum, item) => sum + item.value, 0);
  return {
    value: total,
    trecho: `${rows.slice(0, 3).join(' ')}${rows.length > 3 ? ' ...' : ''}`,
  };
}

function sliceBetween(text: string, startPattern: RegExp, endPattern?: RegExp): string {
  const match = text.match(startPattern);
  if (!match || match.index === undefined) return '';
  const start = match.index;
  const afterStart = text.slice(start + match[0].length);
  const endMatch = endPattern ? afterStart.match(endPattern) : null;
  const end = endMatch && endMatch.index !== undefined ? start + match[0].length + endMatch.index : text.length;
  return text.slice(start, end).trim();
}

function buildDefaultPackageStages() {
  return [
    {
      etapa: 'Início' as const,
      percentualMinimo: '20%',
      marcos: [
        { descricao: 'Aceite da proposta' },
        { descricao: 'Realização do Kickoff' },
        { descricao: 'Aprovação do planejamento/cronograma inicial' },
      ],
    },
    {
      etapa: 'Execução' as const,
      percentualMinimo: '50%',
      marcos: [
        { descricao: 'Aprovação de DPS ou documento equivalente' },
        { descricao: 'Aprovação de CTS ou documento equivalente' },
        { descricao: 'Conclusão da fase de Planejamento' },
        { descricao: 'Entrega para Homologação' },
        { descricao: 'Aprovação da Homologação' },
        { descricao: 'Aprovação do PEP ou documento equivalente' },
      ],
    },
    {
      etapa: 'Finalização' as const,
      percentualMinimo: '30%',
      marcos: [
        { descricao: 'Aprovação do DOSP ou documento equivalente' },
        { descricao: 'Realização do GO LIVE' },
        { descricao: 'Encerramento do projeto' },
      ],
    },
  ];
}

function inferPackageStage(description: string): 'Início' | 'Execução' | 'Finalização' {
  const lower = normalizeForSearch(description);
  if (/aceite|kickoff|planejamento|cronograma inicial/.test(lower)) return 'Início';
  if (/dosp|go live|encerramento|oficializacao|producao/.test(lower)) return 'Finalização';
  return 'Execução';
}

function sanitizePackageText(text: string): string {
  const packageStart = text.search(/(?:%\s*Percentual\s+FASES|FASES\s+M[ií]nimo|Etapa\s+Marco\/Pacote|01\s*[–-]\s*Aceite|In[ií]cio\s+Aceite)/i);
  if (packageStart >= 0) {
    text = text.slice(packageStart);
  }

  const stopPattern = /(?:até o\s*12|do\s*13|do\s*25|valor hora|profissionais senior|sofrer[áa]\s+um adicional|acrescido|multa|rescis[ãa]o|reajuste)/i;
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    if (stopPattern.test(line)) break;
    result.push(line);
  }

  return result.join('\n');
}

function cleanPackageMarcoDescription(description: string): string {
  return description
    .replace(/^\d+\s*(?:\d+\s*)?[–-]\s*/i, '')
    .replace(/^(?:Início|Inicio|Execução|Execucao|Finalização|Finalizacao)\s+/i, '')
    .replace(/^»\s*/, '')
    .replace(/^(?:MENSALIDADE|SaaS|SERVI[ÇC]OS|Escopo Fechado)\s+/i, '')
    .replace(/^\(?no\s+1[º°]\s+ciclo\s+se\s+existir\)?\s*/i, 'Aprovação do planejamento/cronograma inicial')
    .replace(/^equivalente(?:\s+a)?$/i, 'Aprovação de documento equivalente')
    .replace(/^documento equivalente$/i, 'Aprovação de documento equivalente')
    .trim();
}

function isPackageMarcoValid(description: string): boolean {
  return !/(?:percentual|mínimo|minimo|faturamento|serviços|servicos|escopo fechado|mensalidade|até o\s*12|do\s*13|do\s*25|valor hora|profissionais senior|adicional|acrescido|multa|rescis[ãa]o|parcelas vincendas|saas\s*»)/i.test(description);
}

function cleanPaymentSentence(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+)\s+HABILITA[ÇC][AÃ]O\s+dias\b/gi, '$1 dias')
    .replace(/\b(\d+)\s+MENSALIDADE\s+dias\b/gi, '$1 dias')
    .replace(/\bHABILITA[ÇC][AÃ]O\s+O pagamento/gi, 'O pagamento')
    .replace(/\bMENSALIDADE\s+O vencimento/gi, 'O vencimento')
    .trim();
}

function normalizeScaleValue(value: string): string {
  return `R$ ${value.replace(/\s+/g, '').replace(/^R\$?/, '')}`;
}

function parseMonthlyPaymentScale(text: string): Array<{ periodo: string; valor: string }> {
  const normalized = text.replace(/\s+/g, ' ');
  const moneyPattern = String.raw`(?:R\s*\$\s*)?([\d.\s]+,\s*\d{2})`;
  const patterns: Array<{ regex: RegExp; label: (match: RegExpMatchArray) => string; valueIndex: number }> = [
    {
      regex: new RegExp(String.raw`(?:\bde\s+|\bdo\s+)?(\d+)(?:[º°])?\s+(?:a|ao)\s+(\d+)(?:[º°])?\s+m(?:e|ê)s(?:es)?\b.{0,120}?${moneyPattern}`, 'gi'),
      label: match => `${match[1]} a ${match[2]} meses`,
      valueIndex: 3,
    },
    {
      regex: new RegExp(String.raw`ap[óo]s\s+o\s+m[eê]s\s+(\d+)(?:[º°])?\b.{0,120}?${moneyPattern}`, 'gi'),
      label: match => `Após o mês ${match[1]}`,
      valueIndex: 2,
    },
  ];

  const steps: Array<{ index: number; periodo: string; valor: string }> = [];

  for (const { regex, label, valueIndex } of patterns) {
    for (const match of normalized.matchAll(regex)) {
      steps.push({
        index: match.index ?? 0,
        periodo: label(match),
        valor: normalizeScaleValue(match[valueIndex]),
      });
    }
  }

  return steps
    .sort((a, b) => a.index - b.index)
    .filter((item, index, list) => list.findIndex(candidate => candidate.periodo === item.periodo) === index)
    .map(({ periodo, valor }) => ({ periodo, valor }));
}

function parsePackageStages(text: string) {
  const defaults = buildDefaultPackageStages();
  const packageText = sanitizePackageText(text);
  const matches = [...packageText.matchAll(/(?:\b\d{1,2}\s*[–-]\s*)?([^%\n.]{8,140}?)\s+(\d{1,3})\s*%/g)]
    .map(match => ({
      descricao: cleanPackageMarcoDescription(match[1].replace(/\s+/g, ' ').trim()),
      percentual: `${match[2]}%`,
    }))
    .filter(item =>
      item.descricao.length >= 4 &&
      isPackageMarcoValid(item.descricao) &&
      Number(item.percentual.replace('%', '')) > 0
    );

  if (matches.length === 0) return defaults;

  return defaults.map(stage => {
    const marcos = matches
      .filter(item => inferPackageStage(item.descricao) === stage.etapa)
      .map(item => ({ descricao: item.descricao, percentual: item.percentual }));

    return {
      ...stage,
      marcos: marcos.length > 0 ? marcos : stage.marcos,
    };
  });
}

export function extrairInvestimentosDetalhadosDoPDF(pdfText: string): ParsedInvestment[] {
  pdfText = normalizeExtractedPdfText(pdfText);
  const secaoInvestimento = extrairSecaoPorTitulo(pdfText, 'INVESTIMENTO') ||
    extrairSecaoNumerada(pdfText, 3, 'INVESTIMENTO') ||
    extrairSecao(pdfText, 'investimento', ['\n4.', '\n5.']);

  if (!secaoInvestimento) {
    return [
      {
        descricao: 'Mensalidade',
        valorSemImposto: null,
        valorComImposto: null,
        evidencia: evidence('', 'INVESTIMENTO', 'baixa'),
      },
      {
        descricao: 'Habilitação + Serviços',
        valorSemImposto: null,
        valorComImposto: null,
        evidencia: evidence('', 'INVESTIMENTO', 'baixa'),
      },
    ];
  }

  const textoBusca = secaoInvestimento;
  const mensalidadeBlock = sliceBetween(
    textoBusca,
    /mensalidade\b/i,
    /habilita[çc][aã]o\s*e\s*servi[çc]os/i
  );
  const habilitacaoBlock = sliceBetween(
    textoBusca,
    /habilita[çc][aã]o\s*e\s*servi[çc]os/i
  );

  const mensalidadeTotals = findTotalPairs(mensalidadeBlock);
  const habilitacaoTotals = findTotalPairs(habilitacaoBlock);
  const allTotals = findTotalPairs(textoBusca);

  const mensalidade = mensalidadeTotals[0] || allTotals[0];
  const habilitacao = habilitacaoTotals[habilitacaoTotals.length - 1] || allTotals[allTotals.length - 1];
  const mensalidadeTabela = mensalidade ? null : sumLastCurrencyFromRows(mensalidadeBlock, 'mensalidade');
  const habilitacaoTabela = habilitacao ? null : sumLastCurrencyFromRows(habilitacaoBlock, 'habilitacao');

  return [
    {
      descricao: 'Mensalidade',
      valorSemImposto: mensalidade?.sem ?? null,
      valorComImposto: mensalidade?.com ?? mensalidadeTabela?.value ?? null,
      evidencia: evidence(
        mensalidade?.trecho || mensalidadeTabela?.trecho || mensalidadeBlock || textoBusca,
        'INVESTIMENTO',
        mensalidade || mensalidadeTabela ? 'alta' : 'baixa'
      ),
    },
    {
      descricao: 'Habilitação + Serviços',
      valorSemImposto: habilitacao?.sem ?? null,
      valorComImposto: habilitacao?.com ?? habilitacaoTabela?.value ?? null,
      evidencia: evidence(
        habilitacao?.trecho || habilitacaoTabela?.trecho || habilitacaoBlock || textoBusca,
        'INVESTIMENTO',
        habilitacao || habilitacaoTabela ? 'alta' : 'baixa'
      ),
    },
  ];
}

// ============================================================
// Extração de investimento
// ============================================================

/**
 * Encontra valores de investimento (Mensalidade e Habilitação) no texto do PDF.
 * Usa múltiplas estratégias para máxima compatibilidade.
 */
export function extrairInvestimentoDoPDF(pdfText: string): InvestimentoExtraido {
  pdfText = normalizeExtractedPdfText(pdfText);
  const detalhados = extrairInvestimentosDetalhadosDoPDF(pdfText);
  const mensalidadeDetalhada = detalhados.find(item => item.descricao === 'Mensalidade');
  const habilitacaoDetalhada = detalhados.find(item => item.descricao === 'Habilitação + Serviços');

  if (mensalidadeDetalhada?.valorComImposto || habilitacaoDetalhada?.valorComImposto) {
    return {
      mensalidade: mensalidadeDetalhada?.valorComImposto ?? null,
      habilitacao: habilitacaoDetalhada?.valorComImposto ?? null,
      mensalidadeSemImposto: mensalidadeDetalhada?.valorSemImposto ?? null,
      habilitacaoSemImposto: habilitacaoDetalhada?.valorSemImposto ?? null,
      evidencias: {
        mensalidade: mensalidadeDetalhada?.evidencia,
        habilitacao: habilitacaoDetalhada?.evidencia,
      },
    };
  }

  const linhas = pdfText.split('\n');

  // Determinar a seção de INVESTIMENTO
  const secaoInvestimento = extrairSecaoPorTitulo(pdfText, 'INVESTIMENTO') ||
    extrairSecao(pdfText, 'investimento', ['\n4.', '\n5.', 'condi']);
  if (!secaoInvestimento) {
    console.log('[ProValida] Seção investimento não encontrada, evitando inferência financeira crítica no texto completo.');
    return { mensalidade: null, habilitacao: null };
  }
  const textoBusca = secaoInvestimento;

  if (secaoInvestimento) {
    console.log('[ProValida] Seção investimento encontrada:', secaoInvestimento.substring(0, 300));
  }

  let mensalidadeNum: number | null = null;
  let habilitacaoNum: number | null = null;

  // ============================================================
  // Estratégia 1: Regex direto com múltiplos padrões
  // ============================================================
  const padroesMensalidade = [
    /[Mm]ensalidade\s*\([^)]*imposto[^)]*\)\s*[:\s]*R\$\s*([\d.,]+)/i,
    /[Mm]ensalidade\s*[:\s]+R\$\s*([\d.,]+)/i,
    /[Mm]ensalidade\s+R\$\s*([\d.,]+)/i,
    /[Mm]ensalidade.{0,40}?R\$\s*([\d.,]+)/i,
    /[Mm]ensalidade.{0,20}?\n.{0,20}?R\$\s*([\d.,]+)/i,
    /[Mm]ensalidade.{0,30}?([\d.]+,\d{2})/i,
  ];

  const padroesHabilitacao = [
    /[Hh]abilita[çc][aã]o\s*[\+]?\s*[Ss]ervi[çc]os?\s*\([^)]*imposto[^)]*\)\s*[:\s]*R\$\s*([\d.,]+)/i,
    /[Hh]abilita[çc][aã]o\s*[\+]?\s*[Ss]ervi[çc]os?\s*[:\s]+R\$\s*([\d.,]+)/i,
    /[Hh]abilita[çc][aã]o\s*[:\s]+R\$\s*([\d.,]+)/i,
    /[Hh]abilita[çc][aã]o\s+R\$\s*([\d.,]+)/i,
    /[Hh]abilita[çc][aã]o.{0,50}?R\$\s*([\d.,]+)/i,
    /[Hh]abilita[çc][aã]o\s*[\+]?\s*[Ss]ervi[çc]os?.{0,20}?\n.{0,20}?R\$\s*([\d.,]+)/i,
    /[Hh]abilita[çc][aã]o.{0,40}?([\d.]+,\d{2})/i,
  ];

  for (const padrao of padroesMensalidade) {
    const match = textoBusca.match(padrao);
    if (match) {
      const val = parseBRL(match[1]);
      if (val !== null && val > 0) {
        mensalidadeNum = val;
        console.log(`[ProValida] Mensalidade encontrada (regex): R$ ${val}`);
        break;
      }
    }
  }

  for (const padrao of padroesHabilitacao) {
    const match = textoBusca.match(padrao);
    if (match) {
      const val = parseBRL(match[1]);
      if (val !== null && val > 0) {
        habilitacaoNum = val;
        console.log(`[ProValida] Habilitação encontrada (regex): R$ ${val}`);
        break;
      }
    }
  }

  // ============================================================
  // Estratégia 2: Buscar valor na linha da keyword
  // ============================================================
  if (!mensalidadeNum || !habilitacaoNum) {
    const valores = extrairValoresMonetarios(textoBusca);

    if (!mensalidadeNum) {
      const mensalLinha = valores.find(v =>
        v.linha.toLowerCase().includes('mensalidade') && !v.linha.toLowerCase().includes('habilita')
      );
      if (mensalLinha) {
        mensalidadeNum = mensalLinha.valor;
        console.log('[ProValida] Mensalidade encontrada (linha):', mensalLinha.valor);
      }
    }

    if (!habilitacaoNum) {
      const habLinha = valores.find(v => v.linha.toLowerCase().includes('habilita'));
      if (habLinha) {
        habilitacaoNum = habLinha.valor;
        console.log('[ProValida] Habilitação encontrada (linha):', habLinha.valor);
      }
    }
  }

  // ============================================================
  // Estratégia 3: Buscar contexto de linhas adjacentes
  // ============================================================
  if (!mensalidadeNum || !habilitacaoNum) {
    for (let idx = 0; idx < linhas.length; idx++) {
      const lowerLinha = linhas[idx].toLowerCase();

      if (!mensalidadeNum && lowerLinha.includes('mensalidade') && !lowerLinha.includes('habilita')) {
        const contexto = linhas.slice(idx, idx + 3).join(' ');
        const matchR = contexto.match(/R\$\s*([\d.,]+)/);
        if (matchR) {
          const val = parseBRL(matchR[1]);
          if (val !== null && val > 0) {
            mensalidadeNum = val;
            console.log('[ProValida] Mensalidade encontrada (contexto):', val);
          }
        }
      }

      if (!habilitacaoNum && lowerLinha.includes('habilita')) {
        const contexto = linhas.slice(idx, idx + 3).join(' ');
        const matchR = contexto.match(/R\$\s*([\d.,]+)/);
        if (matchR) {
          const val = parseBRL(matchR[1]);
          if (val !== null && val > 0) {
            habilitacaoNum = val;
            console.log('[ProValida] Habilitação encontrada (contexto):', val);
          }
        }
      }
    }
  }

  // ============================================================
  // Estratégia 4: Maiores valores na seção (fallback)
  // ============================================================
  if (!mensalidadeNum || !habilitacaoNum) {
    const valores = extrairValoresMonetarios(textoBusca)
      .filter(item => item.valor > MIN_INVESTIMENTO_FALLBACK_BRL && !/fatura excedente|km rodado|excedente/i.test(item.linha));
    if (valores.length >= 2) {
      const ordenados = [...valores].sort((a, b) => a.valor - b.valor);
      if (!mensalidadeNum && !ordenados[0].linha.toLowerCase().includes('desconto')) {
        mensalidadeNum = ordenados[0].valor;
        console.log('[ProValida] Mensalidade inferida (fallback):', mensalidadeNum);
      }
      if (!habilitacaoNum) {
        habilitacaoNum = ordenados[ordenados.length - 1].valor;
        console.log('[ProValida] Habilitação inferida (fallback):', habilitacaoNum);
      }
    }
  }

  console.log('[ProValida] Resultado investimento - Mensalidade:', mensalidadeNum, 'Habilitação:', habilitacaoNum);
  return { mensalidade: mensalidadeNum, habilitacao: habilitacaoNum };
}

// ============================================================
// Extração de condições de pagamento
// ============================================================

/**
 * Extrai condições de pagamento do texto do PDF.
 * Busca pela seção "5. CONDIÇÕES DE PAGAMENTO" e extrai detalhes.
 * ROBUSTO: Múltiplas estratégias para funcionar com diferentes formatos de PDF.
 */
export function extrairCondicoesDoPDF(pdfText: string): CondicoesExtraidas {
  pdfText = normalizeExtractedPdfText(pdfText);
  const secaoPagamento = extrairSecaoPorTitulo(pdfText, 'CONDIÇÕES DE PAGAMENTO') ||
    extrairSecaoNumerada(pdfText, 5, 'CONDIÇÕES DE PAGAMENTO');
  if (secaoPagamento) {
    const normalizedSection = secaoPagamento.replace(/\s+/g, ' ');
    const normalizedFull = pdfText.replace(/\s+/g, ' ');
    const mensalidadeBlock = sliceBetween(
      secaoPagamento,
      /mensalidade\b/i,
      /despesas?\s+de\s+viagem|^\s*6\.|\n\s*6\./i
    ) || secaoPagamento;
    const isBTG = /btg\s+pactual/i.test(normalizedSection);
    const habilitacaoIntroRaw = normalizedSection.match(/O pagamento dos valores referentes à Habilitação e Serviços.*?(?:15\s*\(quinze\)\s*dias corridos|15\s*dias).*?(?:Cancelamento automático|automaticamente)/i)?.[0] ||
      normalizedSection.match(/O pagamento dos valores referentes à Habilitação e Serviços.*?BTG Pactual.*?\./i)?.[0] ||
      normalizedSection.match(/O pagamento (?:dos valores referentes à |da |de )?(?:licen[çc]a de uso e )?habilita[çc][aã]o.*?(?:parcelas?|boletos?|dias).*?\./i)?.[0] ||
      '';
    const habilitacaoIntro = cleanPaymentSentence(habilitacaoIntroRaw);
    const discountMatch = normalizedSection.match(/(?:com\s*)?0?(\d+)\s*\([^)]*\)\s*primeiras parcelas com\s*(\d+(?:,\d+)?)%\s*de desconto no valor\s*de\s*R\$\s*([\d.]+,\d{2})/i) ||
      normalizedSection.match(/(\d+)\s+primeiras parcelas com\s*(\d+(?:,\d+)?)%\s*de desconto.*?R\$\s*([\d.]+,\d{2})/i);
    const carenciaMatch = normalizedSection.match(/(?:com\s*)?(\d+(?:,\d+)?)%\s+de\s+car[êe]ncia\s+nos\s+primeiros\s+(\d+)\s+meses?.*?R\$\s*([\d.]+,\d{2})/i) ||
      normalizedSection.match(/car[êe]ncia\s+de\s+(\d+(?:,\d+)?)%\s+(?:nos\s+)?primeiros\s+(\d+)\s+meses?.*?R\$\s*([\d.]+,\d{2})/i);
    const vencimentoMatch = normalizedSection.match(/vencimento será mensal,\s*no dia\s*(\d{1,2})\s*de cada mês/i);
    const prazoBTGMatch = normalizedSection.match(/até\s*(\d+)\s*\([^)]*\)\s*dias corridos/i) ||
      normalizedSection.match(/prazo[^.]{0,80}?(\d+)\s*dias/i);
    const packageBillingMatch = normalizedSection.match(/faturamento será feito de forma\s+POR\s+PACOTE\s*\/\s*EVOLU[ÇC][AÃ]O.*?(?:pagamento da\(s\) NF\(s\).*?30 dias|DESPESAS DE VIAGEM|5\.1)/i);
    const faturamentoMatch = packageBillingMatch || normalizedSection.match(/faturamento será feito de forma\s+([A-ZÀ-Ú]+)/i);
    const despesasMatch = normalizedSection.match(/despesas serão pagas\s*(\d+)\s*dias\s*após\s*o\s*RDV/i);
    const prazoContratualMatch = normalizedFull.match(/prazo\s+(?:mínimo|contratual)[^0-9]{0,40}(\d+)\s*meses/i) ||
      normalizedFull.match(/\b(\d+)\s*meses\b/i);
    const validadeMatch = normalizedFull.match(/(?:validade|v[áa]lid[ao]s?\s+por)[^0-9]{0,80}(\d+)\s*dias/i);
    const multaMatch = normalizedFull.match(/multa\s+rescisória[:\s]*([^.\n]+)/i);
    const multaEscalonada = /35\s*%.*?12[º°]?\s*m[eê]s.*?30\s*%.*?24[º°]?\s*m[eê]s.*?25\s*%.*?36[º°]?\s*m[eê]s/i.test(normalizedFull);

    const parcelasDesconto = discountMatch?.[1]
      ? String(Number(discountMatch[1]))
      : carenciaMatch?.[2]
        ? String(Number(carenciaMatch[2]))
        : '';
    const descontoPercentual = discountMatch?.[2] || carenciaMatch?.[1] || '';
    const valorDesconto = discountMatch?.[3]
      ? `R$ ${discountMatch[3]}`
      : carenciaMatch?.[3]
        ? `R$ ${carenciaMatch[3]}`
        : '';
    const escalaMensalidade = parseMonthlyPaymentScale(normalizedSection);
    const vencimento = vencimentoMatch?.[1] ? `Dia ${vencimentoMatch[1]}` : '';
    const prazoBTG = isBTG && prazoBTGMatch?.[1] ? `${prazoBTGMatch[1]} dias` : '';
    const isPackageBilling = !!packageBillingMatch || /por pacote\s*\/\s*evolu[çc][aã]o/i.test(normalizedSection);
    const faturamentoServicos = isPackageBilling
      ? 'Por pacote'
      : faturamentoMatch?.[1]
        ? `${faturamentoMatch[1][0].toUpperCase()}${faturamentoMatch[1].slice(1).toLowerCase()}`
        : '';

    const condicaoMensalidadeParts = [
      vencimento ? `Vencimento mensal no ${vencimento.toLowerCase()}.` : '',
      escalaMensalidade.length > 0
        ? `Escala de mensalidade: ${escalaMensalidade.map(item => `${item.periodo}: ${item.valor}`).join('; ')}.`
        : '',
      parcelasDesconto && descontoPercentual && valorDesconto
        ? carenciaMatch
          ? `${parcelasDesconto} primeiros meses com ${descontoPercentual}% de carência no valor de ${valorDesconto}.`
          : `${parcelasDesconto} primeiras parcelas com ${descontoPercentual}% de desconto no valor de ${valorDesconto}.`
        : '',
    ].filter(Boolean);
    const mensalidadeEvidenceText = cleanPaymentSentence([
      vencimentoMatch?.[0] || '',
      escalaMensalidade.length > 0 ? escalaMensalidade.map(item => `${item.periodo} ${item.valor}`).join(' ') : '',
      discountMatch?.[0] || carenciaMatch?.[0] || '',
    ].filter(Boolean).join(' '));

    const condicaoHabilitacaoParts = isBTG
      ? [
          'Pagamento à vista ou financiado via BTG Pactual.',
          prazoBTG ? `Prazo de aprovação: ${prazoBTG}.` : '',
          /cancelamento automático|cancelada automaticamente|automaticamente cancelada/i.test(normalizedSection) ? 'Cancelamento automático se o financiamento não for concluído.' : '',
        ].filter(Boolean)
      : [
          habilitacaoIntro || '',
        ].filter(Boolean);

    const evidencias: Record<string, ParsedEvidence> = {
      condicoesPagamento: evidence(secaoPagamento, 'CONDIÇÕES DE PAGAMENTO', 'alta'),
    };

    if (discountMatch?.[0]) {
      evidencias.descontoMensalidade = evidence(discountMatch[0], '5. CONDIÇÕES DE PAGAMENTO', 'alta');
    } else if (carenciaMatch?.[0]) {
      evidencias.descontoMensalidade = evidence(carenciaMatch[0], '5. CONDIÇÕES DE PAGAMENTO', 'alta');
    }
    if (habilitacaoIntro) {
      evidencias.financiamento = evidence(habilitacaoIntro, '5. CONDIÇÕES DE PAGAMENTO', 'alta');
    }
    if (faturamentoMatch?.[0]) {
      evidencias.faturamento = evidence(faturamentoMatch[0], '5. CONDIÇÕES DE PAGAMENTO', 'alta');
    }

    return {
      condicaoMensalidade: condicaoMensalidadeParts.join(' '),
      condicaoHabilitacao: condicaoHabilitacaoParts.join(' '),
      descontoHabilitacao: 'Não informado',
      descontoServicos: 'Não informado',
      prazoContratual: prazoContratualMatch?.[1] ? `${prazoContratualMatch[1]} meses` : '',
      validadeProposta: validadeMatch?.[1] ? `${validadeMatch[1]} dias` : '',
      multaRescisoria: multaEscalonada
        ? '35% até 12º mês; 30% do 13º ao 24º mês; 25% do 25º ao 36º mês sobre parcelas vincendas'
        : multaMatch?.[1]?.trim() || '',
      faturamentoServicos,
      financiamento: isBTG && prazoBTG
        ? `Financiamento Banco BTG Pactual — Prazo: ${prazoBTG} — Cancelamento automático`
        : isBTG
          ? 'Financiamento Banco BTG Pactual — Cancelamento automático'
          : '',
      detalhes: {
        mensalidade: {
          valorComDesconto: valorDesconto,
          descontoPercentual: descontoPercentual ? `${descontoPercentual}%` : '',
          parcelasComDesconto: parcelasDesconto || '',
          escala: escalaMensalidade,
          vencimento,
          observacao: condicaoMensalidadeParts.join(' '),
          evidenciaCampo: mensalidadeEvidenceText || undefined,
        },
        habilitacaoServicos: {
          formaPagamento: isBTG ? 'À vista ou financiado' : (habilitacaoIntro ? 'Parcelado' : ''),
          banco: isBTG ? 'BTG Pactual' : '',
          prazoAprovacao: prazoBTG,
          cancelamentoAutomatico: /cancelamento automático|cancelada automaticamente|automaticamente cancelada/i.test(normalizedSection),
          observacao: condicaoHabilitacaoParts.join(' '),
          evidenciaCampo: evidencias.financiamento?.trecho || evidencias.condicoesPagamento.trecho,
        },
        financiamento: {
          descricao: 'Financiamento',
          valor: isBTG ? 'BTG Pactual' : '',
          observacao: prazoBTG ? `Prazo de aprovação: ${prazoBTG}` : '',
          status: isBTG ? 'confirmado' : 'revisar',
          evidenciaCampo: evidencias.financiamento?.trecho,
        },
        faturamento: {
          descricao: 'Faturamento de Serviços',
          valor: faturamentoServicos,
          status: faturamentoServicos ? 'confirmado' : 'revisar',
          evidenciaCampo: evidencias.faturamento?.trecho,
        },
        pacote: isPackageBilling
          ? {
              modalidade: 'Por pacote',
              observacao: 'Faturamento por pacote/evolução com percentual mínimo por etapa. O valor de cada etapa pode ser quebrado entre os marcos internos.',
              etapas: parsePackageStages(secaoPagamento),
              evidenciaCampo: evidencias.faturamento?.trecho,
            }
          : undefined,
        despesas: {
          descricao: 'Despesas de Viagem',
          valor: despesasMatch?.[1] ? `${despesasMatch[1]} dias após RDV` : '',
          status: despesasMatch?.[1] ? 'confirmado' : 'revisar',
          evidenciaCampo: despesasMatch?.[0] ? evidence(despesasMatch[0], '5. CONDIÇÕES DE PAGAMENTO', 'alta').trecho : undefined,
        },
      },
      evidencias,
    };
  }

  const lower = pdfText.toLowerCase();
  const linhas = pdfText.split('\n');

  // Determinar a seção de CONDIÇÕES
  const secaoCondicoes = extrairSecaoPorTitulo(pdfText, 'CONDIÇÕES DE PAGAMENTO') || extrairSecao(
    pdfText,
    'condi',
    ['\n6.', 'aprova', 'assinatura']
  );
  const textoBusca = secaoCondicoes || pdfText;

  if (secaoCondicoes) {
    console.log('[ProValida] Seção condições encontrada:', secaoCondicoes.substring(0, 500));
  } else {
    console.log('[ProValida] Seção condições NÃO encontrada, usando texto completo');
  }

  // ============================================================
  // Estratégia 1: Parsing estruturado por seções
  // ============================================================
  let condicaoMensalidade = '';
  let condicaoHabilitacao = '';

  const linhasCond = textoBusca.split('\n');
  let secaoAtual = '';
  const linhasMensalidade: string[] = [];
  const linhasHabilitacao: string[] = [];

  for (const linha of linhasCond) {
    const l = linha.trim();
    if (!l) continue;
    const ll = l.toLowerCase();

    // Detectar header de mensalidade
    if ((ll.includes('mensalidade') || ll.includes('mensal')) && !ll.includes('habilita')) {
      secaoAtual = 'mensalidade';
      // Se a linha tem conteúdo além do header, incluir
      const conteudo = l.replace(/^mensalidade\s*[:\s]*/i, '').trim();
      if (conteudo && !conteudo.toLowerCase().match(/^(mensalidade)$/)) {
        linhasMensalidade.push(conteudo);
      }
      continue;
    }

    // Detectar header de habilitação
    if (ll.includes('habilita') && (ll.includes('serviço') || ll.includes('servico') || ll.includes('servicos') || ll.includes('+'))) {
      secaoAtual = 'habilitacao';
      const conteudo = l.replace(/^habilita[çc][aã]o\s*[\+]?\s*servi[çc]os?\s*[:\s]*/i, '').trim();
      if (conteudo) linhasHabilitacao.push(conteudo);
      continue;
    }

    if (ll.includes('habilita') && !ll.includes('desconto')) {
      secaoAtual = 'habilitacao';
      continue;
    }

    // Parar de coletar se chegou em outra seção
    if (ll.match(/^\d+\.\s/) || ll.includes('faturamento') || ll.includes('prazo') || ll.includes('validade') || ll.includes('multa')) {
      if (secaoAtual !== '') secaoAtual = 'geral';
    }

    if (secaoAtual === 'mensalidade') {
      linhasMensalidade.push(l);
    } else if (secaoAtual === 'habilitacao') {
      linhasHabilitacao.push(l);
    }
  }

  condicaoMensalidade = linhasMensalidade.join('\n').trim();
  condicaoHabilitacao = linhasHabilitacao.join('\n').trim();

  // ============================================================
  // Estratégia 2: Regex para padrões comuns (fallback)
  // ============================================================
  if (!condicaoMensalidade) {
    // Padrão: "N primeiras parcelas com X% de desconto"
    const matchCarencia = pdfText.match(/(\d+)\s*primeiras?\s*parcelas?\s*(?:com)?\s*(\d+)?\s*%?\s*de\s*desconto/i);
    const matchValorCarencia = pdfText.match(/desconto\s*[—\-–]\s*R\$\s*([\d.,]+)/i);

    if (matchCarencia) {
      condicaoMensalidade = `${matchCarencia[1]} primeiras parcelas com ${matchCarencia[2] || ''}% de desconto`;
      if (matchValorCarencia) condicaoMensalidade += ` — R$ ${matchValorCarencia[1]}`;
    }

    // Padrão: "parcelas de R$ X,XX" ou "R$ X,XX mensais"
    if (!condicaoMensalidade) {
      const matchParcela = pdfText.match(/parcelas?\s*(?:subsequentes|seguintes)?\s*(?:de|no\s*valor\s*de)?\s*R\$\s*([\d.,]+)/i);
      if (matchParcela) {
        condicaoMensalidade = `Parcelas de R$ ${matchParcela[1]}`;
      }
    }
  }

  if (!condicaoHabilitacao) {
    // Padrão: "pagamento à vista" ou "financiado via BTG"
    if (lower.includes('btg') && lower.includes('habilita')) {
      condicaoHabilitacao = 'Pagamento à vista ou financiado via BTG Pactual.';
    } else if (lower.includes('à vista') && (lower.includes('habilita') || lower.includes('serviço') || lower.includes('servico'))) {
      condicaoHabilitacao = 'Pagamento à vista.';
    }

    // Padrão: "Habilitação + Serviços" seguido de condições na mesma/next linha
    if (!condicaoHabilitacao) {
      const habIdx = lower.indexOf('habilita');
      if (habIdx >= 0) {
        // Pegar as 3 linhas seguintes
        const afterHab = pdfText.substring(habIdx, habIdx + 300);
        const afterLines = afterHab.split('\n').slice(1, 4).map(l => l.trim()).filter(l => l);
        if (afterLines.length > 0) {
          condicaoHabilitacao = afterLines.join('. ');
        }
      }
    }
  }

  // ============================================================
  // Estratégia 3: Seção completa como fallback
  // Se ainda não temos condições, usar toda a seção como texto
  // ============================================================
  if (!condicaoMensalidade && !condicaoHabilitacao && secaoCondicoes) {
    // Dividir a seção em duas partes: antes e depois de "habilitação"
    const habIdx = secaoCondicoes.toLowerCase().indexOf('habilita');
    if (habIdx > 0) {
      const parteMensalidade = secaoCondicoes.substring(0, habIdx);
      const parteHabilitacao = secaoCondicoes.substring(habIdx);

      // Limpar headers de seção
      condicaoMensalidade = parteMensalidade
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.toLowerCase().match(/^5\.?\s*condi/i) && !l.toLowerCase().match(/^condições\s+de\s+pagamento/i))
        .join('\n')
        .trim();

      condicaoHabilitacao = parteHabilitacao
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.toLowerCase().match(/^habilita/i))
        .join('\n')
        .trim();
    } else {
      // Sem "habilitação" — tudo é mensalidade
      condicaoMensalidade = secaoCondicoes
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.toLowerCase().match(/^5\.?\s*condi/i) && !l.toLowerCase().match(/^condições\s+de\s+pagamento/i))
        .join('\n')
        .trim();
    }
  }

  // ============================================================
  // Desconto de habilitação e serviços
  // ============================================================
  let descontoHabilitacao = 'Não informado';
  let descontoServicos = 'Não informado';

  for (const linha of linhas) {
    const ll = linha.toLowerCase();
    if (ll.includes('desconto') && ll.includes('habilita')) {
      const cleaned = linha.replace(/[Dd]esconto\s+(de\s+)?habilita[çc][aã]o\s*[:\s]*/i, '').trim();
      if (cleaned) descontoHabilitacao = cleaned;
    }
    if (ll.includes('desconto') && (ll.includes('serviço') || ll.includes('servico') || ll.includes('servicos'))) {
      const cleaned = linha.replace(/[Dd]esconto\s+(de\s+)?servi[çc]os?\s*[:\s]*/i, '').trim();
      if (cleaned) descontoServicos = cleaned;
    }
  }

  // ============================================================
  // Campos adicionais
  // ============================================================
  let prazoContratual = '';
  const matchPrazo = pdfText.match(/(?:prazo\s+(?:m[íi]nimo|contratual))?\s*[:\s]*(\d+)\s*meses/i);
  if (matchPrazo) prazoContratual = `${matchPrazo[1]} meses`;

  let validadeProposta = '';
  const matchValidade = pdfText.match(/[Vv]alidade[:\s]*(\d+)\s*dias/i);
  const matchValidadeAte = pdfText.match(/condi[çc][õo]es expressas[^.]{0,120}v[áa]lidas?\s+at[ée]\s+([^.\n]+)/i);
  if (matchValidade) validadeProposta = `${matchValidade[1]} dias`;
  else if (matchValidadeAte?.[1]) validadeProposta = `Até ${matchValidadeAte[1].trim()}`;

  let multaRescisoria = '';
  const matchMulta = pdfText.match(/[Mm]ulta\s+rescis[oó]ria[:\s]*([^\n]+)/i);
  const matchMultaEscalonada = /35\s*%.*?12[º°]?\s*m[eê]s.*?30\s*%.*?24[º°]?\s*m[eê]s.*?25\s*%.*?36[º°]?\s*m[eê]s/i.test(pdfText.replace(/\s+/g, ' '));
  if (matchMultaEscalonada) multaRescisoria = '35% até 12º mês; 30% do 13º ao 24º mês; 25% do 25º ao 36º mês sobre parcelas vincendas';
  else if (matchMulta) multaRescisoria = matchMulta[1].trim();

  let faturamentoServicos = '';
  if (lower.includes('por pacote') || lower.includes('evolução') || lower.includes('evolucao')) faturamentoServicos = 'Por pacote';
  else if (lower.includes('antecipado')) faturamentoServicos = 'Antecipado';
  else if (lower.includes('parcelada')) faturamentoServicos = 'Parcelada';
  else if (lower.includes('pós-entrega') || lower.includes('pos-entrega')) faturamentoServicos = 'Pós-entrega';

  let financiamento = '';
  if (lower.includes('btg')) {
    const matchPrazoBTG = pdfText.match(/prazo[:\s]*(\d+)\s*dias/i);
    financiamento = `Financiamento Banco BTG Pactual — Prazo: ${matchPrazoBTG ? matchPrazoBTG[1] : '15'} dias — Cancelamento automático`;
  }

  console.log('[ProValida] Condições extraídas:', {
    condicaoMensalidade: condicaoMensalidade?.substring(0, 100),
    condicaoHabilitacao: condicaoHabilitacao?.substring(0, 100),
    descontoHabilitacao,
    descontoServicos,
  });

  return {
    condicaoMensalidade,
    condicaoHabilitacao,
    descontoHabilitacao,
    descontoServicos,
    prazoContratual,
    validadeProposta,
    multaRescisoria,
    faturamentoServicos,
    financiamento,
    detalhes: {
      mensalidade: {
        observacao: condicaoMensalidade,
      },
      habilitacaoServicos: {
        formaPagamento: condicaoHabilitacao ? 'Parcelado' : '',
        observacao: condicaoHabilitacao,
      },
      faturamento: {
        descricao: 'Faturamento de Serviços',
        valor: faturamentoServicos,
        status: faturamentoServicos ? 'confirmado' : 'revisar',
      },
      pacote: faturamentoServicos === 'Por pacote'
        ? {
            modalidade: 'Por pacote',
            observacao: 'Faturamento por pacote/evolução com percentual mínimo por etapa. O valor de cada etapa pode ser quebrado entre os marcos internos.',
            etapas: parsePackageStages(textoBusca),
          }
        : undefined,
    },
  };
}
