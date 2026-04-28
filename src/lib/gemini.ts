import type { CRMData, ValidationItem, ValidationResult } from '@/components/provalida/types';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

/**
 * Validação local (fallback) — executa todas as 17 regras quando a API Gemini não está disponível.
 */
function generateFallbackValidation(crmData: CRMData, pdfText: string, pdfHasText: boolean): ValidationResult {
  const itens: ValidationItem[] = [];
  const pdfLower = pdfText.toLowerCase();

  // === GRUPO 1: CRM Interno ===

  // Regra 1: Revisão > 1 com Motivo de Reprogramação vazio → error
  if (crmData.revisao > 1 && (!crmData.motivoReprogramacao || crmData.motivoReprogramacao.trim() === '')) {
    itens.push({
      id: 'revisao_sem_motivo',
      nome: 'Motivo da Reprogramação',
      categoria: 'CRM Interno',
      status: 'error',
      valorCRM: `Revisão ${crmData.revisao}, motivo vazio`,
      evidenciaPDF: 'N/A — validação interna',
      mensagem: `A proposta está na revisão ${crmData.revisao}, mas o motivo da reprogramação não foi preenchido.`,
      sugestao: 'Preencha o campo "Motivo da Reprogramação" sempre que a revisão for maior que 1.',
      corrigido: false
    });
  } else {
    itens.push({
      id: 'revisao_sem_motivo',
      nome: 'Motivo da Reprogramação',
      categoria: 'CRM Interno',
      status: 'ok',
      valorCRM: crmData.revisao > 1 ? `Revisão ${crmData.revisao}: "${crmData.motivoReprogramacao}"` : `Revisão ${crmData.revisao}`,
      evidenciaPDF: 'N/A — validação interna',
      mensagem: 'Campo de motivo da reprogramação está correto.',
      sugestao: null,
      corrigido: false
    });
  }

  // Regra 2: Possui Rateio = Sim com percentuais vazios ou soma ≠ 100 → error
  if (crmData.possuiRateio === 'Sim') {
    const percentuais = crmData.contasRateio
      .map(c => parseFloat(c.percentual.replace(',', '.')))
      .filter(v => !isNaN(v));
    const soma = percentuais.reduce((a, b) => a + b, 0);
    const temVazios = crmData.contasRateio.some(c => !c.percentual || c.percentual.trim() === '');

    if (temVazios || percentuais.length < crmData.contasRateio.length) {
      itens.push({
        id: 'rateio_percentual_vazio',
        nome: 'Percentuais do Rateio',
        categoria: 'CRM Interno',
        status: 'error',
        valorCRM: `Rateio com ${crmData.contasRateio.length} conta(s), percentuais incompletos`,
        evidenciaPDF: 'N/A — validação interna',
        mensagem: 'Existem contas de rateio sem percentual preenchido.',
        sugestao: 'Preencha o percentual de todas as contas de rateio.',
        corrigido: false
      });
    } else if (Math.abs(soma - 100) > 0.01) {
      itens.push({
        id: 'rateio_soma_invalida',
        nome: 'Soma dos Percentuais do Rateio',
        categoria: 'CRM Interno',
        status: 'error',
        valorCRM: `Soma: ${soma.toFixed(2)}%`,
        evidenciaPDF: 'N/A — validação interna',
        mensagem: `A soma dos percentuais do rateio é ${soma.toFixed(2)}%, diferente de 100%.`,
        sugestao: 'Ajuste os percentuais para que a soma totalize exatamente 100%.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'rateio_percentual_ok',
        nome: 'Percentuais do Rateio',
        categoria: 'CRM Interno',
        status: 'ok',
        valorCRM: `Soma: ${soma.toFixed(2)}%`,
        evidenciaPDF: 'N/A — validação interna',
        mensagem: 'Os percentuais do rateio estão corretos e totalizam 100%.',
        sugestao: null,
        corrigido: false
      });
    }
  } else {
    itens.push({
      id: 'rateio_nao_aplicavel',
      nome: 'Rateio',
      categoria: 'CRM Interno',
      status: 'ok',
      valorCRM: 'Não possui rateio',
      evidenciaPDF: 'N/A — validação interna',
      mensagem: 'Proposta sem rateio — sem problemas.',
      sugestao: null,
      corrigido: false
    });
  }

  // Regra 3: Layout "Demandas Avulsas" com Escopo "Fechado" em proposta multi-produto → warning
  const isMultiProduto = crmData.codigoProposta.length > 5;
  if (crmData.layout.includes('Demandas Avulsas') && crmData.escopo === 'Fechado' && isMultiProduto) {
    itens.push({
      id: 'layout_escopo_inconsistente',
      nome: 'Layout × Escopo',
      categoria: 'CRM Interno',
      status: 'warning',
      valorCRM: `Layout: "${crmData.layout}", Escopo: "${crmData.escopo}"`,
      evidenciaPDF: 'N/A — validação interna',
      mensagem: 'Layout "Demandas Avulsas" com escopo "Fechado" em proposta multi-produto pode ser inconsistente.',
      sugestao: 'Verifique se o layout e o escopo estão corretos para esta proposta multi-produto.',
      corrigido: false
    });
  } else {
    itens.push({
      id: 'layout_escopo_ok',
      nome: 'Layout × Escopo',
      categoria: 'CRM Interno',
      status: 'ok',
      valorCRM: `Layout: "${crmData.layout}", Escopo: "${crmData.escopo}"`,
      evidenciaPDF: 'N/A — validação interna',
      mensagem: 'Layout e escopo estão consistentes.',
      sugestao: null,
      corrigido: false
    });
  }

  // Regra 4: Carência > 6 meses ou desconto > 50% → warning
  if (crmData.carenciaMeses > 6 || crmData.descontoCarencia > 50) {
    itens.push({
      id: 'carencia_desconto_alto',
      nome: 'Carência / Desconto',
      categoria: 'CRM Interno',
      status: 'warning',
      valorCRM: `Carência: ${crmData.carenciaMeses} meses, Desconto: ${crmData.descontoCarencia}%`,
      evidenciaPDF: 'N/A — validação interna',
      mensagem: `Carência de ${crmData.carenciaMeses} meses e/ou desconto de ${crmData.descontoCarencia}% excedem o padrão (6 meses / 50%).`,
      sugestao: 'Confirme a aprovação destas condições excepcionais com a gestão.',
      corrigido: false
    });
  } else {
    itens.push({
      id: 'carencia_desconto_ok',
      nome: 'Carência / Desconto',
      categoria: 'CRM Interno',
      status: 'ok',
      valorCRM: `Carência: ${crmData.carenciaMeses} meses, Desconto: ${crmData.descontoCarencia}%`,
      evidenciaPDF: 'N/A — validação interna',
      mensagem: 'Carência e desconto dentro dos limites padrão.',
      sugestao: null,
      corrigido: false
    });
  }

  // === GRUPO 2: CRM × PDF ===
  // Se não há texto no PDF, marcar como pulados
  if (!pdfHasText) {
    const skippedRules = [
      { id: 'carencia_pdf', nome: 'Carência no PDF' },
      { id: 'escopo_pdf', nome: 'Escopo no PDF' },
      { id: 'faturamento_pdf', nome: 'Faturamento no PDF' },
      { id: 'btg_pdf', nome: 'Condições BTG no PDF' },
      { id: 'impostos_pdf', nome: 'Impostos no PDF' },
      { id: 'cnpj_pdf', nome: 'CNPJ no PDF' },
      { id: 'valor_total_pdf', nome: 'Valor Total no PDF' },
      { id: 'validade_pdf', nome: 'Validade no PDF' },
      { id: 'prazo_multa_pdf', nome: 'Prazo e Multa no PDF' },
      { id: 'representante_pdf', nome: 'Representante no PDF' },
    ];
    for (const rule of skippedRules) {
      itens.push({
        id: rule.id,
        nome: rule.nome,
        categoria: 'CRM × PDF',
        status: 'info',
        valorCRM: null,
        evidenciaPDF: 'PDF sem texto extraível — validação pulada',
        mensagem: `Não foi possível validar "${rule.nome}" pois o PDF não contém texto extraível.`,
        sugestao: null,
        corrigido: false
      });
    }
  } else {
    // Regra 5: Carência do CRM refletida no PDF
    if (crmData.carenciaMeses > 0) {
      const carenciaRegex = new RegExp(`${crmData.carenciaMeses}\\s*(primeiras\\s*)?parcelas`, 'i');
      const descontoRegex = new RegExp(`${crmData.descontoCarencia}%`, 'i');
      const hasCarencia = carenciaRegex.test(pdfLower) || pdfLower.includes('carência') || pdfLower.includes('carencia');
      const hasDesconto = descontoRegex.test(pdfLower) || pdfLower.includes('desconto');

      if (!hasCarencia && !hasDesconto) {
        itens.push({
          id: 'carencia_pdf',
          nome: 'Carência no PDF',
          categoria: 'CRM × PDF',
          status: 'error',
          valorCRM: `${crmData.carenciaMeses} meses com ${crmData.descontoCarencia}% de desconto`,
          evidenciaPDF: 'Não encontrado',
          mensagem: `O CRM informa carência de ${crmData.carenciaMeses} meses com ${crmData.descontoCarencia}% de desconto, mas isso não está refletido no PDF.`,
          sugestao: `Inclua no PDF: "${crmData.carenciaMeses} primeiras parcelas com ${crmData.descontoCarencia}% de desconto".`,
          corrigido: false
        });
      } else {
        itens.push({
          id: 'carencia_pdf',
          nome: 'Carência no PDF',
          categoria: 'CRM × PDF',
          status: 'ok',
          valorCRM: `${crmData.carenciaMeses} meses com ${crmData.descontoCarencia}% de desconto`,
          evidenciaPDF: hasCarencia ? `Carência encontrada no PDF` : `Desconto ${crmData.descontoCarencia}% encontrado`,
          mensagem: 'Carência e desconto estão refletidos no PDF.',
          sugestao: null,
          corrigido: false
        });
      }
    } else {
      itens.push({
        id: 'carencia_pdf',
        nome: 'Carência no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: 'Sem carência',
        evidenciaPDF: 'Sem carência no CRM',
        mensagem: 'Sem carência configurada — nada a verificar no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 6: Tipo de Escopo declarado no PDF
    const escopoKeywords = crmData.escopo.toLowerCase();
    const hasEscopo = pdfLower.includes('escopo') || pdfLower.includes(escopoKeywords) || pdfLower.includes('fechado') || pdfLower.includes('aberto');
    if (!hasEscopo) {
      itens.push({
        id: 'escopo_pdf',
        nome: 'Escopo no PDF',
        categoria: 'CRM × PDF',
        status: 'error',
        valorCRM: crmData.escopo,
        evidenciaPDF: 'Não encontrado',
        mensagem: `O tipo de escopo "${crmData.escopo}" declarado no CRM não foi encontrado no PDF.`,
        sugestao: `Adicione a declaração de escopo "${crmData.escopo}" no PDF da proposta.`,
        corrigido: false
      });
    } else {
      itens.push({
        id: 'escopo_pdf',
        nome: 'Escopo no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: crmData.escopo,
        evidenciaPDF: `Escopo "${crmData.escopo}" encontrado no PDF`,
        mensagem: 'Tipo de escopo está declarado no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 7: Tipo de Faturamento declarado no PDF
    const faturamentoKeyword = crmData.faturamentoServicos.toLowerCase();
    const hasFaturamento = pdfLower.includes('faturamento') || pdfLower.includes('antecipado') || pdfLower.includes('antecipa') || pdfLower.includes(faturamentoKeyword);
    if (!hasFaturamento) {
      itens.push({
        id: 'faturamento_pdf',
        nome: 'Faturamento no PDF',
        categoria: 'CRM × PDF',
        status: 'error',
        valorCRM: crmData.faturamentoServicos,
        evidenciaPDF: 'Não encontrado',
        mensagem: `O tipo de faturamento "${crmData.faturamentoServicos}" declarado no CRM não foi encontrado no PDF.`,
        sugestao: `Adicione a cláusula de faturamento "${crmData.faturamentoServicos}" no PDF da proposta.`,
        corrigido: false
      });
    } else {
      itens.push({
        id: 'faturamento_pdf',
        nome: 'Faturamento no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: crmData.faturamentoServicos,
        evidenciaPDF: `Faturamento "${crmData.faturamentoServicos}" encontrado no PDF`,
        mensagem: 'Tipo de faturamento está declarado no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 8: BTG no CRM → PDF deve ter "BTG Pactual" + prazo 15 dias + cancelamento automático
    const isBTG = crmData.prazoPagamentoModulos.includes('BTG') || crmData.prazoPagamentoServicos.includes('BTG');
    if (isBTG) {
      const hasBTG = pdfLower.includes('btg pactual') || pdfLower.includes('btg');
      const hasPrazo15 = pdfLower.includes('15 dias');
      const hasCancelamento = pdfLower.includes('cancelamento automático') || pdfLower.includes('cancelamento automatico');

      if (!hasBTG || !hasPrazo15 || !hasCancelamento) {
        const missing: string[] = [];
        if (!hasBTG) missing.push('menção ao "BTG Pactual"');
        if (!hasPrazo15) missing.push('prazo de 15 dias corridos');
        if (!hasCancelamento) missing.push('cláusula de cancelamento automático');

        itens.push({
          id: 'btg_pdf',
          nome: 'Condições BTG no PDF',
          categoria: 'CRM × PDF',
          status: 'error',
          valorCRM: `Financiamento BTG: ${crmData.prazoPagamentoModulos}`,
          evidenciaPDF: missing.length > 0 ? `Ausente: ${missing.join(', ')}` : 'Parcialmente encontrado',
          mensagem: `O CRM indica financiamento BTG, mas o PDF não contém: ${missing.join(', ')}.`,
          sugestao: 'Inclua no PDF: "Financiamento Banco BTG Pactual. Prazo: 15 dias corridos. Cancelamento automático se financiamento não concluído no prazo."',
          corrigido: false
        });
      } else {
        itens.push({
          id: 'btg_pdf',
          nome: 'Condições BTG no PDF',
          categoria: 'CRM × PDF',
          status: 'ok',
          valorCRM: `Financiamento BTG: ${crmData.prazoPagamentoModulos}`,
          evidenciaPDF: 'BTG Pactual, prazo 15 dias e cancelamento automático encontrados',
          mensagem: 'Todas as condições BTG estão presentes no PDF.',
          sugestao: null,
          corrigido: false
        });
      }
    } else {
      itens.push({
        id: 'btg_pdf',
        nome: 'Condições de Financiamento',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: crmData.prazoPagamentoModulos || 'Não definido',
        evidenciaPDF: 'Sem financiamento BTG — não aplicável',
        mensagem: 'Sem financiamento BTG no CRM — nada a verificar.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 9: Tratamento de impostos declarado no PDF
    const hasImpostos = pdfLower.includes('imposto') || pdfLower.includes('tribut');
    if (!hasImpostos) {
      itens.push({
        id: 'impostos_pdf',
        nome: 'Impostos no PDF',
        categoria: 'CRM × PDF',
        status: 'warning',
        valorCRM: crmData.impostos,
        evidenciaPDF: 'Não encontrado',
        mensagem: `O tratamento de impostos "${crmData.impostos}" não está declarado no PDF.`,
        sugestao: 'Adicione no PDF a cláusula sobre tratamento de impostos.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'impostos_pdf',
        nome: 'Impostos no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: crmData.impostos,
        evidenciaPDF: 'Tratamento de impostos encontrado no PDF',
        mensagem: 'Tratamento de impostos está declarado no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 10: CNPJ do cliente no PDF
    const hasCNPJ = pdfLower.includes('cnpj') || /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(pdfLower);
    if (!hasCNPJ) {
      itens.push({
        id: 'cnpj_pdf',
        nome: 'CNPJ do Cliente',
        categoria: 'CRM × PDF',
        status: 'error',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'O CNPJ do cliente não foi encontrado no PDF da proposta.',
        sugestao: 'Inclua o CNPJ do cliente no PDF da proposta comercial.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'cnpj_pdf',
        nome: 'CNPJ do Cliente',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: null,
        evidenciaPDF: 'CNPJ encontrado no PDF',
        mensagem: 'CNPJ do cliente está presente no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 11: Valor total no PDF
    const hasValor = pdfLower.includes('r$') || pdfLower.includes('valor total') || pdfLower.includes('mensalidade');
    if (!hasValor) {
      itens.push({
        id: 'valor_total_pdf',
        nome: 'Valor Total no PDF',
        categoria: 'CRM × PDF',
        status: 'error',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Nenhum valor financeiro foi encontrado no PDF da proposta.',
        sugestao: 'Inclua os valores da proposta (mensalidade, habilitação, serviços) no PDF.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'valor_total_pdf',
        nome: 'Valor Total no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: null,
        evidenciaPDF: 'Valores financeiros encontrados no PDF',
        mensagem: 'Valores financeiros estão presentes no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 12: Prazo de validade da proposta no PDF
    const hasValidade = pdfLower.includes('validade') || pdfLower.includes('dias');
    if (!hasValidade) {
      itens.push({
        id: 'validade_pdf',
        nome: 'Validade da Proposta',
        categoria: 'CRM × PDF',
        status: 'warning',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'O prazo de validade da proposta não foi encontrado no PDF.',
        sugestao: 'Inclua o prazo de validade da proposta no PDF (ex: "Validade: 60 dias").',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'validade_pdf',
        nome: 'Validade da Proposta',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: null,
        evidenciaPDF: 'Prazo de validade encontrado no PDF',
        mensagem: 'Prazo de validade está declarado no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 13: Prazo contratual 36 meses e multa rescisória no PDF
    const hasPrazo36 = pdfLower.includes('36 meses') || pdfLower.includes('36 month');
    const hasMulta = pdfLower.includes('multa rescisóri') || pdfLower.includes('multa');
    if (!hasPrazo36 || !hasMulta) {
      const missing: string[] = [];
      if (!hasPrazo36) missing.push('prazo de 36 meses');
      if (!hasMulta) missing.push('cláusula de multa rescisória');

      itens.push({
        id: 'prazo_multa_pdf',
        nome: 'Prazo e Multa no PDF',
        categoria: 'CRM × PDF',
        status: 'warning',
        valorCRM: null,
        evidenciaPDF: missing.length > 0 ? `Ausente: ${missing.join(', ')}` : 'Parcialmente encontrado',
        mensagem: `O PDF não contém: ${missing.join(', ')}.`,
        sugestao: 'Inclua o prazo contratual mínimo e a cláusula de multa rescisória no PDF.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'prazo_multa_pdf',
        nome: 'Prazo e Multa no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: null,
        evidenciaPDF: 'Prazo 36 meses e multa rescisória encontrados',
        mensagem: 'Prazo contratual e multa rescisória estão declarados no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 14: Representante compatível com localização do cliente
    const representanteLower = crmData.representante.toLowerCase();
    const hasRepresentante = pdfLower.includes('executivo') || pdfLower.includes('representante') || pdfLower.includes('filial');
    let isConsistent = true;
    // Verifica consistência básica: se o representante é de uma filial específica
    if (representanteLower.includes('filial')) {
      const filialMatch = representanteLower.match(/filial\s*(\w+)/);
      if (filialMatch) {
        const estado = filialMatch[1].toUpperCase();
        // Verifica se o estado está presente no endereço do cliente no PDF
        if (!pdfLower.includes(estado.toLowerCase())) {
          isConsistent = false;
        }
      }
    }

    if (!hasRepresentante && !isConsistent) {
      itens.push({
        id: 'representante_pdf',
        nome: 'Representante no PDF',
        categoria: 'CRM × PDF',
        status: 'warning',
        valorCRM: crmData.representante,
        evidenciaPDF: 'Representante inconsistente com localização do cliente',
        mensagem: `O representante "${crmData.representante}" pode ser inconsistente com a localização do cliente.`,
        sugestao: 'Verifique se o representante designado atende a região do cliente.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'representante_pdf',
        nome: 'Representante no PDF',
        categoria: 'CRM × PDF',
        status: 'ok',
        valorCRM: crmData.representante,
        evidenciaPDF: hasRepresentante ? 'Executivo/representante encontrado no PDF' : 'Consistência verificada',
        mensagem: 'Representante compatível com a proposta.',
        sugestao: null,
        corrigido: false
      });
    }
  }

  // === GRUPO 3: Qualidade ===
  if (!pdfHasText) {
    const qualitySkipped = [
      { id: 'assinatura_pdf', nome: 'Campo de Assinatura' },
      { id: 'data_emissao_pdf', nome: 'Data de Emissão' },
      { id: 'endereco_pdf', nome: 'Endereço do Cliente' },
    ];
    for (const rule of qualitySkipped) {
      itens.push({
        id: rule.id,
        nome: rule.nome,
        categoria: 'Qualidade',
        status: 'info',
        valorCRM: null,
        evidenciaPDF: 'PDF sem texto extraível — validação pulada',
        mensagem: `Não foi possível validar "${rule.nome}" pois o PDF não contém texto extraível.`,
        sugestao: null,
        corrigido: false
      });
    }
  } else {
    // Regra 15: Campo de aceite/assinatura no PDF
    const hasAssinatura = pdfLower.includes('assinatura') || pdfLower.includes('aceite') || pdfLower.includes('aprovação') || pdfLower.includes('aprovacao') || pdfLower.includes('____');
    if (!hasAssinatura) {
      itens.push({
        id: 'assinatura_pdf',
        nome: 'Campo de Assinatura',
        categoria: 'Qualidade',
        status: 'warning',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'Não foi encontrado campo de aceite ou assinatura no PDF.',
        sugestao: 'Adicione um campo de assinatura/aceite no PDF da proposta.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'assinatura_pdf',
        nome: 'Campo de Assinatura',
        categoria: 'Qualidade',
        status: 'ok',
        valorCRM: null,
        evidenciaPDF: 'Campo de assinatura/aceite encontrado',
        mensagem: 'Campo de assinatura/aceite está presente no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 16: Data de emissão no PDF
    const hasData = /\d{2}\/\d{2}\/\d{4}/.test(pdfLower) || pdfLower.includes('emissão') || pdfLower.includes('emissao') || pdfLower.includes('data');
    if (!hasData) {
      itens.push({
        id: 'data_emissao_pdf',
        nome: 'Data de Emissão',
        categoria: 'Qualidade',
        status: 'warning',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'A data de emissão da proposta não foi encontrada no PDF.',
        sugestao: 'Inclua a data de emissão no PDF da proposta.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'data_emissao_pdf',
        nome: 'Data de Emissão',
        categoria: 'Qualidade',
        status: 'ok',
        valorCRM: null,
        evidenciaPDF: 'Data de emissão encontrada no PDF',
        mensagem: 'Data de emissão está presente no PDF.',
        sugestao: null,
        corrigido: false
      });
    }

    // Regra 17: Endereço do cliente no PDF
    const hasEndereco = pdfLower.includes('endereço') || pdfLower.includes('endereco') || pdfLower.includes('rod ') || pdfLower.includes('av ') || pdfLower.includes('rua ') || pdfLower.includes('cep');
    if (!hasEndereco) {
      itens.push({
        id: 'endereco_pdf',
        nome: 'Endereço do Cliente',
        categoria: 'Qualidade',
        status: 'info',
        valorCRM: null,
        evidenciaPDF: 'Não encontrado',
        mensagem: 'O endereço do cliente não foi encontrado no PDF da proposta.',
        sugestao: 'Considere incluir o endereço completo do cliente no PDF.',
        corrigido: false
      });
    } else {
      itens.push({
        id: 'endereco_pdf',
        nome: 'Endereço do Cliente',
        categoria: 'Qualidade',
        status: 'ok',
        valorCRM: null,
        evidenciaPDF: 'Endereço do cliente encontrado no PDF',
        mensagem: 'Endereço do cliente está presente no PDF.',
        sugestao: null,
        corrigido: false
      });
    }
  }

  // Calcular score: start at 100, -15 per error, -7 per warning, -3 per info
  let score = 100;
  for (const item of itens) {
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
  const okCount = itens.filter(i => i.status === 'ok').length;

  const resumo = errorCount > 0
    ? `Proposta com ${errorCount} erro(s) e ${warningCount} aviso(s) — necessita revisão antes da aprovação.`
    : warningCount > 0
    ? `Proposta com ${warningCount} aviso(s) — pode ser aprovada com ressalvas.`
    : 'Proposta validada com sucesso — todos os campos estão conformes.';

  return { score, classificacao, resumo, itens };
}

/**
 * Chama a API Gemini para validação ou usa fallback local.
 */
export async function callGemini(crmData: CRMData, pdfText: string, pdfHasText: boolean): Promise<ValidationResult> {
  // Se não há API key, usar validação local
  if (!API_KEY) {
    return generateFallbackValidation(crmData, pdfText, pdfHasText);
  }

  const prompt = `Você é um auditor de propostas comerciais da Senior Sistemas S/A.
Analise os dados abaixo e retorne APENAS o JSON de validação, sem texto adicional.

## DADOS DO CRM:
${JSON.stringify(crmData, null, 2)}

## TEXTO DO PDF:
${pdfText.substring(0, 8000)}

## REGRAS — GRUPO 1 (CRM Interno):
1. Revisão > 1 com Motivo de Reprogramação vazio → error
2. Possui Rateio = Sim com percentuais vazios ou soma ≠ 100% → error
3. Layout "Demandas Avulsas" com Escopo "Fechado" em proposta multi-produto → warning
4. Carência > 6 meses ou desconto > 50% → warning

## REGRAS — GRUPO 2 (CRM × PDF):
5. Carência do CRM refletida no PDF → error se divergir
6. Tipo de Escopo do CRM declarado no PDF → error se ausente
7. Tipo de Faturamento do CRM declarado no PDF → error se ausente
8. BTG no CRM: PDF deve ter "BTG Pactual" + prazo 15 dias + cancelamento automático → error
9. Tratamento de impostos declarado no PDF → warning se ausente
10. CNPJ do cliente no PDF → error se ausente
11. Valor total no PDF → error se ausente
12. Prazo de validade da proposta no PDF → warning se ausente
13. Prazo contratual 36 meses e multa rescisória no PDF → warning se ausente
14. Representante compatível com localização do cliente → warning se inconsistente

## REGRAS — GRUPO 3 (Qualidade):
15. Campo de aceite/assinatura no PDF → warning se ausente
16. Data de emissão no PDF → warning se ausente
17. Endereço do cliente no PDF → info se ausente

## JSON OBRIGATÓRIO:
{
  "score": <0-100>,
  "classificacao": "<Aprovada | Com Ressalvas | Necessita Revisão>",
  "resumo": "<1 frase>",
  "itens": [{
    "id": "<snake_case>",
    "nome": "<nome legível>",
    "categoria": "<CRM Interno | CRM × PDF | Qualidade>",
    "status": "<ok | warning | error | info>",
    "valorCRM": "<string ou null>",
    "evidenciaPDF": "<trecho ou 'Não encontrado'>",
    "mensagem": "<descrição objetiva>",
    "sugestao": "<como corrigir ou null>"
  }]
}
Score: ≥85 = Aprovada | 65-84 = Com Ressalvas | <65 = Necessita Revisão.
Erros penalizam mais que avisos.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        })
      }
    );
    const data = await res.json();
    const text = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(text);
    // Adicionar campo corrigido a cada item
    result.itens = result.itens.map((item: ValidationItem) => ({ ...item, corrigido: false }));
    return result;
  } catch (error) {
    console.error('Gemini API error:', error);
    return generateFallbackValidation(crmData, pdfText, pdfHasText);
  }
}
