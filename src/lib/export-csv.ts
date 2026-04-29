import type { ValidationResult } from '@/components/provalida/types';

/**
 * Gera um arquivo CSV com os resultados da validação.
 * Prefixo BOM para compatibilidade com Excel.
 */
export function exportCSV(resultado: ValidationResult): void {
  const statusLabels: Record<string, string> = {
    ok: 'OK',
    warning: 'Aviso',
    error: 'Erro',
    info: 'Info'
  };

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
