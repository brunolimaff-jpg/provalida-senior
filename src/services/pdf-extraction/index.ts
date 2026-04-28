/**
 * Módulo de extração de dados de PDF — ProValida Senior
 * Funções puras para extrair valores monetários, investimentos e condições
 * de pagamento do texto extraído de PDFs de propostas comerciais.
 * Sem dependências do React — totalmente testável em isolamento.
 */

import { parseBRL, formatBRL, BRL_CURRENCY_REGEX, BRL_VALUE_NO_PREFIX_REGEX, calcularSemImposto } from '@/services/financial-parsing';

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

// ============================================================
// Extração de investimento
// ============================================================

/**
 * Encontra valores de investimento (Mensalidade e Habilitação) no texto do PDF.
 * Usa múltiplas estratégias para máxima compatibilidade.
 */
export function extrairInvestimentoDoPDF(pdfText: string): InvestimentoExtraido {
  const linhas = pdfText.split('\n');

  // Determinar a seção de INVESTIMENTO
  const secaoInvestimento = extrairSecao(pdfText, 'investimento', ['\n4.', '\n5.', 'condi']);
  const textoBusca = secaoInvestimento || pdfText;

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
    const valores = extrairValoresMonetarios(textoBusca);
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
  const lower = pdfText.toLowerCase();
  const linhas = pdfText.split('\n');

  // Determinar a seção de CONDIÇÕES
  const secaoCondicoes = extrairSecao(
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
  if (matchValidade) validadeProposta = `${matchValidade[1]} dias`;

  let multaRescisoria = '';
  const matchMulta = pdfText.match(/[Mm]ulta\s+rescis[oó]ria[:\s]*([^\n]+)/i);
  if (matchMulta) multaRescisoria = matchMulta[1].trim();

  let faturamentoServicos = '';
  if (lower.includes('antecipado')) faturamentoServicos = 'Antecipado';
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
  };
}
