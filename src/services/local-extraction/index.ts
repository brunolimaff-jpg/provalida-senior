import type {
  CamposAusentes,
  CondicoesPagamentoDetalhadas,
  ExtractedField,
  ExtractionResult,
  ExtractedRateio,
  ParsedEvidence,
  ProposalAuditSummary,
} from '@/components/provalida/types';
import { CCI_DEFAULT, calcularSemImposto, formatBRL } from '@/services/financial-parsing';
import { extrairCondicoesDoPDF, extrairInvestimentoDoPDF, normalizeExtractedPdfText } from '@/services/pdf-extraction';

function findPattern(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1] ?? match?.[0];
    if (value) return value.trim();
  }
  return '';
}

function compact(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function buildEvidence(trecho: string, secao: string, confianca: ParsedEvidence['confianca'] = 'alta', origem: ParsedEvidence['origem'] = 'pdf'): ParsedEvidence {
  const normalized = compact(trecho);
  return {
    trecho: normalized.length > 260 ? `${normalized.slice(0, 259).trim()}…` : normalized,
    origem,
    confianca,
    secao,
  };
}

function findClienteCNPJ(pdfText: string): { cliente: string; cnpj: string; evidencia: string } {
  const approvalBlock = pdfText.match(/(?:Raz[aã]o Social|Dados do cliente):\s*([^\n]+)[\s\S]{0,260}?CNPJ:\s*([\d./-]+)/i);
  if (approvalBlock?.[1] && approvalBlock?.[2] && !approvalBlock[2].startsWith('80.')) {
    return {
      cliente: approvalBlock[1].trim(),
      cnpj: approvalBlock[2].trim(),
      evidencia: approvalBlock[0],
    };
  }

  const explicit = pdfText.match(/Cliente:\s*(.+?)(?:\s*[—\-–]\s*CNPJ[:\s]*([\d./-]+)|\n)/i);
  if (explicit?.[1]) {
    return {
      cliente: explicit[1].trim(),
      cnpj: explicit[2]?.trim() || '',
      evidencia: explicit[0],
    };
  }

  const cnpjs = [...pdfText.matchAll(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g)].map(match => ({
    value: match[0],
    index: match.index ?? 0,
  }));
  const clienteCnpj = cnpjs.find(item => !item.value.startsWith('80.')) || cnpjs[0];
  if (!clienteCnpj) return { cliente: '', cnpj: '', evidencia: '' };

  const windowStart = Math.max(0, clienteCnpj.index - 700);
  const windowEnd = Math.min(pdfText.length, clienteCnpj.index + 200);
  const nearby = pdfText.slice(windowStart, windowEnd);
  const lines = nearby.split('\n').map(line => line.trim()).filter(Boolean);
  const cnpjLineIndex = lines.findIndex(line => line.includes(clienteCnpj.value));
  const beforeLines = lines.slice(Math.max(0, cnpjLineIndex - 8), cnpjLineIndex);
  const labeledName = nearby.match(/(?:Raz[aã]o Social|Cliente|Contratante|Dados do cliente):\s*([^\n]+)/i)?.[1]?.trim();
  const candidate = labeledName || [...beforeLines].reverse().find(line =>
    /LTDA|S\/A|S\.A\.|EIRELI|AGRO|COM[ÉE]RCIO|IND[ÚU]STRIA/i.test(line) &&
    !/senior sistemas|senior solution|cnpj|proposta|declara|representado/i.test(line)
  );

  return {
    cliente: candidate?.replace(/^\d+\s*/, '').trim() || '',
    cnpj: clienteCnpj.value,
    evidencia: nearby,
  };
}

function findEndereco(pdfText: string, clienteCnpj: string): { endereco: string; evidencia: string } {
  const approvalBlock = pdfText.match(/Raz[aã]o Social:\s*([^\n]+)\s+Endere[cç]o:\s*([^\n]+)\s+CEP:\s*([^\n]+)\s+CNPJ:\s*([\d./-]+)/i);
  if (approvalBlock?.[2]) {
    return { endereco: approvalBlock[2].trim(), evidencia: approvalBlock[0] };
  }

  const explicit = findPattern(pdfText, [/Endere[cç]o:\s*(.+?)(?:\n|$)/i]);
  if (explicit && !/^https?:\/\//i.test(explicit)) {
    return { endereco: explicit, evidencia: explicit };
  }

  const cnpjIndex = clienteCnpj ? pdfText.indexOf(clienteCnpj) : -1;
  if (cnpjIndex < 0) return { endereco: '', evidencia: '' };
  const nearby = pdfText.slice(cnpjIndex, Math.min(pdfText.length, cnpjIndex + 700));
  const clientOnlyNearby = nearby.split(/Senior Sistemas S\/A|CNPJ\/MF:\s*80\./i)[0];
  const lines = clientOnlyNearby.split('\n').map(line => line.trim()).filter(Boolean);
  const candidate = lines.find(line =>
    /(?:Rua|Avenida|Av\.|Rod\.?|Rodovia|Estrada|Km|S\/N|CEP|MT|SP|SC|PR|GO|MS|RS)\b/i.test(line) &&
    !/^CEP[:\s\d.-]+$/i.test(line) &&
    !/https?:\/\//i.test(line) &&
    !/senior|cnpj/i.test(line)
  );

  return { endereco: candidate || '', evidencia: clientOnlyNearby };
}

function findExecutivo(pdfText: string): { nome: string; email: string; cargo: string; evidencia: string } {
  const email = findPattern(pdfText, [/([\w.+-]+@senior\.com\.br)/i, /([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/]);
  const emailIndex = email ? pdfText.indexOf(email) : -1;
  const nearby = emailIndex >= 0 ? pdfText.slice(Math.max(0, emailIndex - 300), Math.min(pdfText.length, emailIndex + 120)) : '';
  const lines = nearby.split('\n').map(line => line.trim()).filter(Boolean);
  const cargoLineIndex = lines.findIndex(line => /Executivo de Contas|Gerente Comercial|Consultor Comercial/i.test(line));
  const nome = (cargoLineIndex > 0 ? lines[cargoLineIndex - 1] : '') ||
    findPattern(nearby, [/Executivo(?: de Contas)?:\s*([^\n]+)/i]) ||
    [...lines].reverse().find(line =>
      /^[A-ZÁ-Ú][A-Za-zÀ-ú]+(?:\s+[A-ZÁ-Ú][A-Za-zÀ-ú]+){1,5}$/.test(line) &&
      !/senior|executivo|email|telefone|@|:/i.test(line)
    ) || '';
  const cargo = findPattern(nearby || pdfText, [/(Executivo de Contas|Gerente Comercial|Consultor Comercial)/i]);

  return { nome, email, cargo, evidencia: nearby };
}

function buildCamposAusentes(impostos: string): CamposAusentes {
  return {
    revisao: '',
    tipoAliquota: '',
    impostos,
    motivoReprogramacao: '',
    responsavelSuporte: '',
    layout: '',
    cobrancaDespesas: '',
    possuiRateio: '',
  };
}

function buildRateio(pdfText: string): ExtractedRateio[] {
  const linhas = pdfText.split('\n');
  const rateios: ExtractedRateio[] = [];

  for (const linha of linhas) {
    const match = linha.match(/(.+?)\s+(Licen[cç]as|Servi[çc]os)\s+(\d{1,3}(?:[.,]\d{1,2})?)\s*%/i);
    if (!match) continue;
    rateios.push({
      conta: match[1].trim(),
      tipoRateio: match[2].trim(),
      percentual: match[3].replace(',', '.'),
    });
  }

  return rateios;
}

function inferRepresentante(endereco: string, executivo: string, emailExecutivo: string): string {
  if (/[-\s]MT\b|\bMT\b/i.test(endereco)) return 'Senior Filial MT';
  if (/[-\s]SC\b|\bSC\b/i.test(endereco)) return 'Senior Matriz SC';
  if (emailExecutivo || executivo) return 'Equipe Senior';
  return '';
}

function hasValue(value: string): boolean {
  const normalized = value.trim();
  return normalized !== '' && normalized !== '—' && normalized.toLowerCase() !== 'não informado';
}

function buildField(campo: string, valor: string, trechoPDF: string, origem: ExtractedField['origem']): ExtractedField {
  const found = hasValue(valor);
  return {
    campo,
    valor,
    encontrado: found,
    origem: found ? origem : 'nao_encontrado',
    trechoPDF: found ? trechoPDF || undefined : undefined,
  };
}

function buildFlatFields(result: ExtractionResult): ExtractedField[] {
  const mensalidade = result.investimentos.find(item => item.descricao === 'Mensalidade');
  const habilitacao = result.investimentos.find(item => item.descricao === 'Habilitação + Serviços');
  const carenciaMeses = result.condicoesPagamento?.mensalidade.parcelasComDesconto ||
    findPattern(result.textoBruto, [/(\d+)\s*primeiras?\s*parcelas?/i]);
  const descontoCarencia = result.condicoesPagamento?.mensalidade.descontoPercentual?.replace('%', '') ||
    findPattern(result.textoBruto, [/primeiras?\s*parcelas?.*?(\d+)\s*%\s*de\s*desconto/i]);
  const representante = inferRepresentante(result.endereco, result.executivo, result.emailExecutivo || '');
  const escopo = result.escopos.length > 0 ? 'Fechado' : '';
  const prazoPagamentoBTG = result.financiamento ? 'BTG - Taxa de Juros: 0,00%' : '';
  const assinaturaTrecho = result.campoAssinatura ? 'Aprovação / assinatura identificada no PDF' : '';

  return [
    buildField('Número da Proposta', result.numeroProposta, result.numeroProposta, 'pdf'),
    buildField('Código da Proposta', result.codigoProposta, result.codigoProposta, 'pdf'),
    buildField('Revisão', '', '', 'nao_encontrado'),
    buildField('Motivo da Reprogramação', '', '', 'nao_encontrado'),
    buildField('Layout', '', '', 'nao_encontrado'),
    buildField('Prazo Pagamento Módulos', prazoPagamentoBTG, result.financiamento || '', prazoPagamentoBTG ? 'inferido' : 'nao_encontrado'),
    buildField('Prazo Pagamento Serviços', prazoPagamentoBTG, result.financiamento || '', prazoPagamentoBTG ? 'inferido' : 'nao_encontrado'),
    buildField('Carência (meses)', carenciaMeses, carenciaMeses ? `${carenciaMeses} primeiras parcelas` : '', carenciaMeses ? 'pdf' : 'nao_encontrado'),
    buildField('Desconto de Carência (%)', descontoCarencia, descontoCarencia ? `${descontoCarencia}% de desconto` : '', descontoCarencia ? 'pdf' : 'nao_encontrado'),
    buildField('Cobrança de Despesas', '', '', 'nao_encontrado'),
    buildField('Representante', representante, representante, representante ? 'inferido' : 'nao_encontrado'),
    buildField('Escopo', escopo, result.escopos.map(item => item.id).join(', '), escopo ? 'inferido' : 'nao_encontrado'),
    buildField('Faturamento de Serviços', result.faturamentoServicos || '', result.faturamentoServicos || '', (result.faturamentoServicos || '') ? 'pdf' : 'nao_encontrado'),
    buildField('Tipo Alíquota', '', '', 'nao_encontrado'),
    buildField(
      'Imposto CCI (%)',
      result.impostoCCI != null ? result.impostoCCI.toFixed(2).replace('.', ',') : '',
      result.impostoCCI != null ? `${result.impostoCCI}%` : '',
      result.impostoCCI != null ? 'inferido' : 'nao_encontrado'
    ),
    buildField('Impostos', result.camposAusentes.impostos, result.camposAusentes.impostos, result.camposAusentes.impostos ? 'inferido' : 'nao_encontrado'),
    buildField('Responsável pelo Suporte', '', '', 'nao_encontrado'),
    buildField('Possui Rateio', result.rateio.length > 0 ? 'Sim' : '', result.rateio.length > 0 ? 'Rateio identificado no PDF' : '', result.rateio.length > 0 ? 'inferido' : 'nao_encontrado'),
    buildField('Cliente', result.cliente, result.cliente, 'pdf'),
    buildField('CNPJ', result.cnpj, result.cnpj, 'pdf'),
    buildField('Endereço', result.endereco, result.endereco, 'pdf'),
    buildField('Executivo', result.executivo, result.executivo, 'pdf'),
    (() => {
      const solucao = result.modulos.length > 0
        ? result.modulos.map(item => item.bloco).filter((value, index, list) => list.indexOf(value) === index).join(' / ')
        : '';
      return buildField('Solução', solucao, solucao, solucao ? 'inferido' : 'nao_encontrado');
    })(),
    buildField('Valor Mensalidade', mensalidade?.valorComImposto || '', mensalidade?.valorComImposto || '', mensalidade?.valorComImposto ? 'pdf' : 'nao_encontrado'),
    buildField('Valor Habilitação + Serviços', habilitacao?.valorComImposto || '', habilitacao?.valorComImposto || '', habilitacao?.valorComImposto ? 'pdf' : 'nao_encontrado'),
    buildField('Prazo Contratual', result.prazoContratual, result.prazoContratual, result.prazoContratual ? 'pdf' : 'nao_encontrado'),
    buildField('Validade da Proposta', result.validadeProposta, result.validadeProposta, result.validadeProposta ? 'pdf' : 'nao_encontrado'),
    buildField('Multa Rescisória', result.multaRescisoria, result.multaRescisoria, result.multaRescisoria ? 'pdf' : 'nao_encontrado'),
    buildField('Condições de Financiamento', result.financiamento || '', result.financiamento || '', (result.financiamento || '') ? 'pdf' : 'nao_encontrado'),
    buildField('Campo de Assinatura', result.campoAssinatura, assinaturaTrecho, result.campoAssinatura ? 'pdf' : 'nao_encontrado'),
  ];
}

function buildResumoAuditoria(result: ExtractionResult): ProposalAuditSummary {
  const riscos: string[] = [];
  const mensalidade = result.investimentos.find(item => item.descricao === 'Mensalidade');
  const habilitacao = result.investimentos.find(item => item.descricao === 'Habilitação + Serviços');
  const habilitacaoPagamento = result.condicoesPagamento?.habilitacaoServicos;

  if (!mensalidade?.valorComImposto || mensalidade.valorComImposto === '—') riscos.push('Mensalidade não encontrada no PDF');
  if (!habilitacao?.valorComImposto || habilitacao.valorComImposto === '—') riscos.push('Habilitação + Serviços não encontrada no PDF');
  if (!result.condicoesPagamento?.mensalidade.valorComDesconto) riscos.push('Desconto/carência de mensalidade precisa de revisão');
  if (!result.financiamento && !habilitacaoPagamento?.observacao && !habilitacaoPagamento?.formaPagamento) {
    riscos.push('Condição de pagamento de habilitação/serviços precisa de revisão');
  }

  return {
    cliente: result.cliente,
    codigoProposta: result.codigoProposta,
    status: riscos.length === 0 ? 'confirmado' : 'revisar',
    riscos,
    valoresCriticos: {
      investimentos: result.investimentos,
      condicoesPagamento: result.condicoesPagamento,
    },
  };
}

export function extractFieldsLocally(pdfText: string): ExtractionResult {
  pdfText = normalizeExtractedPdfText(pdfText);
  const lower = pdfText.toLowerCase();
  const investimento = extrairInvestimentoDoPDF(pdfText);
  const condicoes = extrairCondicoesDoPDF(pdfText);
  const clienteCnpj = findClienteCNPJ(pdfText);
  const endereco = findEndereco(pdfText, clienteCnpj.cnpj);
  const executivo = findExecutivo(pdfText);
  const impostoCCIText = findPattern(pdfText, [/([\d.,]+)\s*%\s*\(?CCI\)?/i, /(?:CCI|imposto).*?([\d.,]+)\s*%/i]);
  const impostoCCI = impostoCCIText ? parseFloat(impostoCCIText.replace(',', '.')) : CCI_DEFAULT;
  const impostosInclusos = /(impostos?\s+j[áa]\s+inclusos|cont[eê]m\s+impostos|incluem\s+impostos)/i.test(pdfText);
  const impostos = impostosInclusos ? 'Impostos já inclusos' : '';
  const mensalidade = investimento.mensalidade;
  const habilitacao = investimento.habilitacao;
  const mensalidadeSemImposto = investimento.mensalidadeSemImposto;
  const habilitacaoSemImposto = investimento.habilitacaoSemImposto;
  const rateio = buildRateio(pdfText);
  const evidencias: Record<string, ParsedEvidence> = {
    cliente: buildEvidence(clienteCnpj.evidencia || clienteCnpj.cliente, 'Dados gerais', clienteCnpj.cliente ? 'media' : 'baixa'),
    cnpj: buildEvidence(clienteCnpj.evidencia || clienteCnpj.cnpj, 'Dados gerais', clienteCnpj.cnpj ? 'media' : 'baixa'),
    endereco: buildEvidence(endereco.evidencia || endereco.endereco, 'Dados gerais', endereco.endereco ? 'media' : 'baixa'),
    executivo: buildEvidence(executivo.evidencia || executivo.nome, 'Dados gerais', executivo.nome ? 'media' : 'baixa'),
    mensalidade: investimento.evidencias?.mensalidade || buildEvidence('', '3. INVESTIMENTO', 'baixa'),
    habilitacaoServicos: investimento.evidencias?.habilitacao || buildEvidence('', '3. INVESTIMENTO', 'baixa'),
    ...(condicoes.evidencias || {}),
  };
  const condicoesPagamento: CondicoesPagamentoDetalhadas = condicoes.detalhes || {
    mensalidade: {},
    habilitacaoServicos: {},
  };

  const result: ExtractionResult = {
    cliente: clienteCnpj.cliente,
    cnpj: clienteCnpj.cnpj,
    endereco: endereco.endereco,
    executivo: executivo.nome,
    emailExecutivo: executivo.email,
    cargoExecutivo: executivo.cargo,
    numeroProposta: findPattern(pdfText, [/(?:n[uú]mero|numero)\s+da?\s+proposta[:\s#-]*(\d{3,})/i, /(?:proposta\s+n[ºo°.]?\s*)(\d{3,})/i]),
    codigoProposta: findPattern(pdfText, [/\b(PR[A-Z0-9]*\d[A-Z0-9]*)\b/i]),
    versaoModelo: findPattern(pdfText, [/Modelo de Documento:\s*(.+)/i, /(Vers[aã]o\s+\d+[^\n]*)/i]),
    modulos: [],
    escopos: [...pdfText.matchAll(/ESCOPO_SINTETICO[^\s]*/gi)].map(match => ({ id: match[0] })),
    investimentos: [
      {
        descricao: 'Mensalidade',
        valorComImposto: mensalidade ? formatBRL(mensalidade) : '—',
        valorSemImposto: mensalidadeSemImposto ? formatBRL(mensalidadeSemImposto) : mensalidade ? formatBRL(calcularSemImposto(mensalidade, impostoCCI)) : '—',
        origem: 'pdf',
        confianca: mensalidade ? 'alta' : 'baixa',
        evidenciaCampo: evidencias.mensalidade.trecho,
      },
      {
        descricao: 'Habilitação + Serviços',
        valorComImposto: habilitacao ? formatBRL(habilitacao) : '—',
        valorSemImposto: habilitacaoSemImposto ? formatBRL(habilitacaoSemImposto) : habilitacao ? formatBRL(calcularSemImposto(habilitacao, impostoCCI)) : '—',
        origem: 'pdf',
        confianca: habilitacao ? 'alta' : 'baixa',
        evidenciaCampo: evidencias.habilitacaoServicos.trecho,
      },
    ],
    impostoCCI,
    impostosInclusos,
    condicoes: [
      {
        tipo: 'Mensalidade',
        condicao: condicoes.condicaoMensalidade,
        descontoHabilitacao: condicoes.descontoHabilitacao,
        descontoServicos: condicoes.descontoServicos,
      },
      {
        tipo: 'Habilitação + Serviços',
        condicao: condicoes.condicaoHabilitacao,
        descontoHabilitacao: condicoes.descontoHabilitacao,
        descontoServicos: condicoes.descontoServicos,
      },
    ],
    condicoesPagamento: {
      ...condicoesPagamento,
      mensalidade: {
        ...condicoesPagamento.mensalidade,
        valorCheio: mensalidade ? formatBRL(mensalidade) : condicoesPagamento.mensalidade.valorCheio,
      },
    },
    prazoContratual: condicoes.prazoContratual,
    validadeProposta: condicoes.validadeProposta,
    multaRescisoria: condicoes.multaRescisoria,
    faturamentoServicos: condicoes.faturamentoServicos,
    financiamento: condicoes.financiamento,
    camposAusentes: buildCamposAusentes(impostos),
    rateio,
    observacaoRateio: rateio.length > 0 ? 'Rateio identificado localmente no PDF.' : '',
    campoAssinatura: /(assinatura|aprova[cç][aã]o[:\s]|aceite)/i.test(lower) ? 'Presente' : '',
    campos: [],
    evidencias,
    textoBruto: pdfText,
  };

  result.campos = buildFlatFields(result);
  result.resumoAuditoria = buildResumoAuditoria(result);
  return result;
}
