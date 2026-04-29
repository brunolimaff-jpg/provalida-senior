import type { ExtractionResult, ValidationResult } from '@/components/provalida/types';

/**
 * Gera um arquivo CSV com os resultados da validação.
 * Prefixo BOM para compatibilidade com Excel.
 */
export function exportCSV(resultado: ValidationResult, extraction?: ExtractionResult): void {
  const statusLabels: Record<string, string> = {
    ok: 'OK',
    warning: 'Aviso',
    error: 'Erro',
    info: 'Info'
  };

  const auditRows = extraction ? [
    ['Auditoria', 'Cliente', '', '', extraction.cliente || '', '', ''],
    ['Auditoria', 'Código da Proposta', '', '', extraction.codigoProposta || '', '', ''],
    ['Auditoria', 'Mensalidade contratual', '', '', extraction.investimentos.find(item => item.descricao === 'Mensalidade')?.valorComImposto || '', extraction.evidencias?.mensalidade?.trecho || '', ''],
    ['Auditoria', 'Habilitação + Serviços', '', '', extraction.investimentos.find(item => item.descricao === 'Habilitação + Serviços')?.valorComImposto || '', extraction.evidencias?.habilitacaoServicos?.trecho || '', ''],
    ['Auditoria', 'Condição Mensalidade', '', '', extraction.condicoesPagamento?.mensalidade.observacao || '', extraction.condicoesPagamento?.mensalidade.evidenciaCampo || '', ''],
    ['Auditoria', 'Financiamento', '', '', extraction.financiamento || '', extraction.condicoesPagamento?.habilitacaoServicos.evidenciaCampo || '', ''],
    ['Auditoria', 'Faturamento', '', '', extraction.faturamentoServicos || '', extraction.condicoesPagamento?.faturamento?.evidenciaCampo || '', ''],
    ...(extraction.condicoesPagamento?.pacote?.etapas.map(stage => [
      'Auditoria',
      `Faturamento por pacote - ${stage.etapa}`,
      '',
      '',
      `mínimo ${stage.percentualMinimo}: ${stage.marcos.map(marco => `${marco.descricao}${marco.percentual ? ` (${marco.percentual})` : ''}`).join(' | ')}`,
      extraction.condicoesPagamento?.pacote?.evidenciaCampo || '',
      '',
    ]) || []),
  ] : [];

  // Cabeçalho
  const headers = ['Status', 'Campo', 'Categoria', 'Valor CRM', 'Evidência PDF', 'Problema', 'Sugestão'];
  const rows = resultado.itens.map(item => [
    statusLabels[item.status] || item.status,
    item.nome,
    item.categoria,
    item.valorCRM || '',
    item.evidenciaPDF,
    item.mensagem,
    item.sugestao || ''
  ]);

  // Escapar campos CSV
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...auditRows.map(row => row.map(escapeCSV).join(',')),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  // Adicionar BOM para Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `provalida-checklist-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
