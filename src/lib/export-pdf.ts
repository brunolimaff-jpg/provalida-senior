import jsPDF from 'jspdf';
import type { ValidationResult } from '@/components/provalida/types';

/**
 * Gera um relatório PDF com os resultados da validação.
 */
export function exportPDF(resultado: ValidationResult, numeroProposta: string): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // Função auxiliar para adicionar texto com quebra de linha
  const addText = (text: string, x: number, fontSize: number, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - (x - margin));
    // Verificar se precisa nova página
    if (y + lines.length * (fontSize * 0.5) > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, x, y);
    y += lines.length * (fontSize * 0.5) + 2;
  };

  const addSeparator = () => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(212, 209, 202);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // === PÁGINA 1: Cabeçalho ===
  doc.setFillColor(1, 105, 111);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Validação', margin, 18);
  doc.setFontSize(14);
  doc.text('ProValida Senior', margin, 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proposta: ${numeroProposta || 'N/A'}`, margin, 37);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin - 40, 37);

  y = 55;

  // Score e classificação
  doc.setTextColor(40, 37, 29);
  const scoreColor = resultado.score >= 85 ? [67, 122, 34] : resultado.score >= 65 ? [150, 66, 25] : [161, 44, 123];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(margin, y, 50, 30, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${resultado.score}`, margin + 25, y + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('/100', margin + 25, y + 22, { align: 'center' });

  doc.setTextColor(40, 37, 29);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(resultado.classificacao, margin + 58, y + 12);

  const okCount = resultado.itens.filter(i => i.status === 'ok').length;
  const warnCount = resultado.itens.filter(i => i.status === 'warning').length;
  const errCount = resultado.itens.filter(i => i.status === 'error').length;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${okCount} OK  |  ${warnCount} Avisos  |  ${errCount} Críticos`, margin + 58, y + 22);

  y += 38;

  // Resumo
  addText(resultado.resumo, margin, 10);
  y += 4;
  addSeparator();

  // === LISTA DE ITENS ===
  for (const item of resultado.itens) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Status icon color
    const statusColors: Record<string, [number, number, number]> = {
      ok: [67, 122, 34],
      warning: [150, 66, 25],
      error: [161, 44, 123],
      info: [1, 105, 111]
    };
    const statusLabels: Record<string, string> = {
      ok: '✓ OK',
      warning: '⚠ AVISO',
      error: '✗ ERRO',
      info: 'ℹ INFO'
    };

    const color = statusColors[item.status] || [100, 100, 100];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${statusLabels[item.status]} — ${item.nome}  (${item.categoria})`, margin + 4, y + 5.5);

    y += 12;
    doc.setTextColor(60, 57, 45);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    if (item.valorCRM) {
      addText(`Valor CRM: ${item.valorCRM}`, margin + 4, 8);
    }
    addText(`Evidência PDF: ${item.evidenciaPDF}`, margin + 4, 8);
    addText(`Problema: ${item.mensagem}`, margin + 4, 8);
    if (item.sugestao) {
      doc.setTextColor(67, 122, 34);
      addText(`Sugestão: ${item.sugestao}`, margin + 4, 8);
      doc.setTextColor(60, 57, 45);
    }

    y += 4;
    addSeparator();
  }

  // Rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 148, 140);
    doc.text(`ProValida Senior — Página ${i} de ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
  }

  doc.save(`provalida-relatorio-${numeroProposta || 'proposta'}.pdf`);
}
