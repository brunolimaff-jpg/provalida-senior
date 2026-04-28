import type { ExtractedField, ValidationItem, ValidationResult } from '@/components/provalida/types';

/**
 * Validação local (fallback) — executa regras de validação sobre campos extraídos.
 * Funciona com a nova abordagem PDF-first.
 */
export function generateFallbackValidation(
  campos: ExtractedField[],
  pdfText: string,
  pdfHasText: boolean
): ValidationResult {
  const itens: ValidationItem[] = [];
  const pdfLower = pdfText.toLowerCase();

  // Função auxiliar para buscar campo
  const getCampo = (nome: string): ExtractedField | undefined =>
    campos.find(c => c.campo === nome);

  // === GRUPO: Campos Exclusivos CRM (não estão no PDF) ===
  const camposApenasCRM = [
    'Revisão', 'Tipo Alíquota', 'Imposto CCI (%)',
    'Motivo da Reprogramação', 'Responsável pelo Suporte',
    'Layout', 'Cobrança de Despesas', 'Possui Rateio'
  ];

  const camposCRMNaoEncontrados: string[] = [];

  for (const nomeCampo of camposApenasCRM) {
    const campo = getCampo(nomeCampo);
    if (!campo || !campo.encontrado) {
      camposCRMNaoEncontrados.push(nomeCampo);
      itens.push({
        id: `crm_exclusivo_${nomeCampo.toLowerCase().replace(/\s+/g, '_')}`,
        nome: nomeCampo,
        categoria: 'Campo Exclusivo CRM',
        status: 'info',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado no PDF',
        mensagem: `O campo "${nomeCampo}" não foi encontrado na proposta. Verifique diretamente no CRM.`,
        sugestao: `Confira o valor de "${nomeCampo}" no sistema CRM e atualize se necessário.`,
        corrigido: false
      });
    } else {
      itens.push({
        id: `crm_exclusivo_${nomeCampo.toLowerCase().replace(/\s+/g, '_')}`,
        nome: nomeCampo,
        categoria: 'Campo Exclusivo CRM',
        status: 'ok',
        valorCRM: campo.valor,
        evidenciaPDF: campo.origem === 'inferido' ? `Inferido: "${campo.trechoPDF}"` : `Encontrado: "${campo.trechoPDF}"`,
        mensagem: `Campo "${nomeCampo}" identificado com valor "${campo.valor}".`,
        sugestao: null,
        corrigido: false
      });
    }
  }

  // === GRUPO 1: CRM Interno ===

  // Regra 1: Revisão > 1 sem Motivo da Reprogramação
  const revisao = getCampo('Revisão');
  const motivo = getCampo('Motivo da Reprogramação');
  const revisaoNum = revisao?.valor ? parseInt(revisao.valor) : 1;
  if (revisaoNum > 1 && (!motivo?.valor || motivo.valor.trim() === '')) {
    itens.push({
      id: 'revisao_sem_motivo',
      nome: 'Motivo da Reprogramação',
      categoria: 'CRM Interno',
      status: 'error',
      valorCRM: `Revisão ${revisaoNum}, motivo vazio`,
      evidenciaPDF: 'N/A — campo exclusivo do CRM',
      mensagem: `A proposta está na revisão ${revisaoNum}, mas o motivo da reprogramação não foi preenchido.`,
      sugestao: 'Preencha o campo "Motivo da Reprogramação" no CRM sempre que a revisão for maior que 1.',
      corrigido: false
    });
  }

  // Regra 2: Possui Rateio = Sim com percentuais vazios
  const rateio = getCampo('Possui Rateio');
  if (rateio?.valor === 'Sim') {
    itens.push({
      id: 'rateio_verificar',
      nome: 'Rateio',
      categoria: 'CRM Interno',
      status: 'warning',
      valorCRM: 'Possui Rateio = Sim',
      evidenciaPDF: 'Verificar no CRM',
      mensagem: 'Proposta possui rateio — verifique se os percentuais totalizam 100% no CRM.',
      sugestao: 'Confira as contas de rateio no CRM e garanta que a soma seja 100%.',
      corrigido: false
    });
  }

  // Regra 3: Layout × Escopo
  const layout = getCampo('Layout');
  const escopo = getCampo('Escopo');
  if (layout?.valor?.includes('Demandas Avulsas') && escopo?.valor === 'Fechado') {
    itens.push({
      id: 'layout_escopo_inconsistente',
      nome: 'Layout × Escopo',
      categoria: 'CRM Interno',
      status: 'warning',
      valorCRM: `Layout: "${layout.valor}", Escopo: "${escopo.valor}"`,
      evidenciaPDF: 'N/A — campos do CRM',
      mensagem: 'Layout "Demandas Avulsas" com escopo "Fechado" em proposta pode ser inconsistente.',
      sugestao: 'Verifique se o layout e o escopo estão corretos.',
      corrigido: false
    });
  }

  // Regra 4: Carência > 6 meses ou desconto > 50%
  const carencia = getCampo('Carência (meses)');
  const desconto = getCampo('Desconto de Carência (%)');
  const carenciaNum = carencia?.valor ? parseInt(carencia.valor) : 0;
  const descontoNum = desconto?.valor ? parseFloat(desconto.valor.replace(',', '.')) : 0;
  if (carenciaNum > 6 || descontoNum > 50) {
    itens.push({
      id: 'carencia_desconto_alto',
      nome: 'Carência / Desconto',
      categoria: 'CRM Interno',
      status: 'warning',
      valorCRM: `Carência: ${carenciaNum} meses, Desconto: ${descontoNum}%`,
      evidenciaPDF: carencia?.trechoPDF || desconto?.trechoPDF || 'Verificar',
      mensagem: `Carência de ${carenciaNum} meses e/ou desconto de ${descontoNum}% excedem o padrão (6 meses / 50%).`,
      sugestao: 'Confirme a aprovação destas condições excepcionais com a gestão.',
      corrigido: false
    });
  }

  // === GRUPO 2: CRM × PDF ===
  if (pdfHasText) {
    // Regra 5: Carência refletida no PDF
    if (carenciaNum > 0 && carencia?.encontrado) {
      itens.push({
        id: 'carencia_pdf',
        nome: 'Carência no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: `${carenciaNum} meses com ${descontoNum}% de desconto`,
        evidenciaPDF: carencia.trechoPDF || 'Encontrado no PDF',
        mensagem: 'Carência e desconto identificados na proposta.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 6: Escopo no PDF
    if (escopo?.encontrado) {
      itens.push({
        id: 'escopo_pdf',
        nome: 'Escopo no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: escopo.valor,
        evidenciaPDF: escopo.trechoPDF || 'Encontrado no PDF',
        mensagem: 'Tipo de escopo identificado na proposta.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 7: Faturamento no PDF
    const faturamento = getCampo('Faturamento de Serviços');
    if (faturamento?.encontrado) {
      itens.push({
        id: 'faturamento_pdf',
        nome: 'Faturamento no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: faturamento.valor,
        evidenciaPDF: faturamento.trechoPDF || 'Encontrado no PDF',
        mensagem: 'Tipo de faturamento identificado na proposta.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 8: Condições BTG
    const financiamento = getCampo('Condições de Financiamento');
    const prazoModulos = getCampo('Prazo Pagamento Módulos');
    if (prazoModulos?.valor?.includes('BTG')) {
      const hasBTG = pdfLower.includes('btg pactual') || pdfLower.includes('btg');
      const hasPrazo15 = pdfLower.includes('15 dias');
      const hasCancelamento = pdfLower.includes('cancelamento');

      if (!hasBTG || !hasPrazo15 || !hasCancelamento) {
        const missing: string[] = [];
        if (!hasBTG) missing.push('menção ao "BTG Pactual"');
        if (!hasPrazo15) missing.push('prazo de 15 dias');
        if (!hasCancelamento) missing.push('cancelamento automático');

        itens.push({
          id: 'btg_pdf',
          nome: 'Condições BTG no PDF',
          categoria: 'CRM × PDF',
          status: 'error',
          valorCRM: `Financiamento BTG: ${prazoModulos.valor}`,
          evidenciaPDF: `Ausente: ${missing.join(', ')}`,
          mensagem: `O CRM indica financiamento BTG, mas o PDF não contém: ${missing.join(', ')}.`,
          sugestao: 'Inclua no PDF: "Financiamento Banco BTG Pactual. Prazo: 15 dias. Cancelamento automático."',
          corrigido: false
        });
      } else {
        itens.push({
          id: 'btg_pdf',
          nome: 'Condições BTG no PDF',
          categoria: 'CRM × PDF',
          status: 'ok',
          valorCRM: `Financiamento BTG`,
          evidenciaPDF: 'BTG Pactual, prazo 15 dias e cancelamento encontrados',
          mensagem: 'Todas as condições BTG estão presentes no PDF.',
          sugestao: null,
          corrigido: false
        });
      }
    }

    // Regra 9: Impostos no PDF
    const impostos = getCampo('Impostos');
    if (!impostos?.encontrado && !pdfLower.includes('imposto')) {
      itens.push({
        id: 'impostos_pdf',
        nome: 'Impostos no PDF',
        categoria: 'CRM × PDF',
        status: 'warning',
        valorCRM: impostos?.valor || 'Não informado',
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Tratamento de impostos não declarado no PDF.',
        sugestao: 'Adicione a cláusula sobre impostos no PDF.',
        corrigido: false
      });
    }

    // Regra 10: CNPJ
    const cnpj = getCampo('CNPJ');
    if (!cnpj?.encontrado) {
      itens.push({
        id: 'cnpj_pdf',
        nome: 'CNPJ do Cliente',
        categoria: 'CRM × PDF',
        status: 'error',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'CNPJ do cliente não encontrado no PDF.',
        sugestao: 'Inclua o CNPJ do cliente no PDF.',
        corrigido: false
      });
    }

    // Regra 11: Valor total
    const valorMensal = getCampo('Valor Mensalidade');
    if (!valorMensal?.encontrado) {
      itens.push({
        id: 'valor_total_pdf',
        nome: 'Valores Financeiros',
        categoria: 'CRM × PDF',
        status: 'error',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Valores financeiros não encontrados no PDF.',
        sugestao: 'Inclua os valores da proposta no PDF.',
        corrigido: false
      });
    }

    // Regra 12: Validade
    const validade = getCampo('Validade da Proposta');
    if (!validade?.encontrado) {
      itens.push({
        id: 'validade_pdf',
        nome: 'Validade da Proposta',
        categoria: 'CRM × PDF',
        status: 'warning',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Prazo de validade não encontrado no PDF.',
        sugestao: 'Inclua o prazo de validade no PDF.',
        corrigido: false
      });
    }

    // Regra 13: Prazo 36 meses e multa
    const prazo = getCampo('Prazo Contratual');
    const multa = getCampo('Multa Rescisória');
    if (!prazo?.encontrado) {
      itens.push({
        id: 'prazo_multa_pdf',
        nome: 'Prazo e Multa',
        categoria: 'CRM × PDF',
        status: 'warning',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Prazo contratual e/ou multa rescisória não encontrados no PDF.',
        sugestao: 'Inclua prazo mínimo e multa rescisória no PDF.',
        corrigido: false
      });
    }

    // Regra 14: Representante
    const representante = getCampo('Representante');
    const endereco = getCampo('Endereço');
    if (representante?.valor?.includes('Filial') && endereco?.valor) {
      // Verificar consistência básica
      itens.push({
        id: 'representante_pdf',
        nome: 'Representante',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: representante.valor,
        evidenciaPDF: representante.trechoPDF || 'Verificado',
        mensagem: 'Representante identificado na proposta.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 15: Assinatura
    const assinatura = getCampo('Campo de Assinatura');
    if (!assinatura?.encontrado) {
      itens.push({
        id: 'assinatura_pdf',
        nome: 'Campo de Assinatura',
        categoria: 'Qualidade',
        status: 'warning',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Campo de assinatura/aceite não encontrado no PDF.',
        sugestao: 'Adicione campo de assinatura no PDF.',
        corrigido: false
      });
    }

    // Regra 16: Data de emissão
    const hasData = /\d{2}\/\d{2}\/\d{4}/.test(pdfLower);
    if (!hasData) {
      itens.push({
        id: 'data_emissao_pdf',
        nome: 'Data de Emissão',
        categoria: 'Qualidade',
        status: 'warning',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Data de emissão não encontrada no PDF.',
        sugestao: 'Inclua a data de emissão no PDF.',
        corrigido: false
      });
    }

    // Regra 17: Endereço
    if (!endereco?.encontrado) {
      itens.push({
        id: 'endereco_pdf',
        nome: 'Endereço do Cliente',
        categoria: 'Qualidade',
        status: 'info',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Endereço do cliente não encontrado no PDF.',
        sugestao: 'Considere incluir o endereço no PDF.',
        corrigido: false
      });
    }
  }

  // Calcular score
  let score = 100;
  for (const item of itens) {
    if (item.categoria === 'Campo Exclusivo CRM') continue; // Não penaliza
    if (item.status === 'error') score -= 15;
    else if (item.status === 'warning') score -= 7;
    else if (item.status === 'info') score -= 3;
  }
  score = Math.max(0, Math.min(100, score));

  let classificacao: string;
  if (score >= 85) classificacao = 'Aprovada';
  else if (score >= 65) classificacao = 'Com Ressalvas';
  else classificacao = 'Necessita Revisão';

  const errorCount = itens.filter(i => i.status === 'error').length;
  const warningCount = itens.filter(i => i.status === 'warning').length;

  const resumo = errorCount > 0
    ? `Proposta com ${errorCount} erro(s) e ${warningCount} aviso(s). ${camposCRMNaoEncontrados.length} campo(s) exclusivos do CRM precisam de verificação manual.`
    : warningCount > 0
    ? `Proposta com ${warningCount} aviso(s). ${camposCRMNaoEncontrados.length} campo(s) do CRM para verificação manual.`
    : `Proposta validada. ${camposCRMNaoEncontrados.length} campo(s) do CRM para verificação manual.`;

  return { score, classificacao, resumo, camposCRMNaoEncontrados, itens };
}

// Manter compatibilidade — esta função não é mais o caminho principal
export async function callGemini(
  crmDataOrCampos: any,
  pdfText: string,
  pdfHasText: boolean
): Promise<ValidationResult> {
  // Se recebeu campos extraídos (novo fluxo)
  if (Array.isArray(crmDataOrCampos)) {
    return generateFallbackValidation(crmDataOrCampos, pdfText, pdfHasText);
  }
  // Fallback genérico
  return generateFallbackValidation([], pdfText, pdfHasText);
}
