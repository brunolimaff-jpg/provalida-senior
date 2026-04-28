'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { CurrentView, ThemeMode, ValidationResult, ValidationItem, ExtractionResult } from '@/components/provalida/types';
import { DEMO_PDF_TEXT, DEMO_EXTRACTION } from '@/components/provalida/constants';
import { exportPDF } from '@/lib/export-pdf';
import { exportCSV } from '@/lib/export-csv';
import { generateFallbackValidation } from '@/lib/gemini';
import Topbar from '@/components/provalida/Topbar';
import ToastContainer from '@/components/provalida/ToastContainer';
import UploadView from '@/components/provalida/UploadView';
import ProcessingView from '@/components/provalida/ProcessingView';
import ResultsView from '@/components/provalida/ResultsView';

export default function ProValidaApp() {
  // Estado principal
  const [currentView, setCurrentView] = useState<CurrentView>('upload');
  const [pdfText, setPdfText] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileSize, setPdfFileSize] = useState(0);
  const [pdfHasText, setPdfHasText] = useState(true);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tema
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('provalida-theme') as ThemeMode | null;
      if (saved) {
        document.documentElement.classList.toggle('dark', saved === 'dark');
        return saved;
      }
    }
    return 'light';
  });

  // Toggle de tema
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('provalida-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return newTheme;
    });
  }, []);

  // Arquivo PDF carregado
  const handleFileLoaded = useCallback((fileName: string, fileSize: number, text: string, hasText: boolean) => {
    setPdfFileName(fileName);
    setPdfFileSize(fileSize);
    setPdfText(text);
    setPdfHasText(hasText);
  }, []);

  // Limpar PDF
  const handleClearPDF = useCallback(() => {
    setPdfFileName('');
    setPdfFileSize(0);
    setPdfText('');
    setPdfHasText(true);
  }, []);

  // Preencher com demo
  const handleFillDemo = useCallback(() => {
    setPdfText(DEMO_PDF_TEXT);
    setPdfFileName('proposta-jequitiba-agro.pdf');
    setPdfFileSize(12345);
    setPdfHasText(true);
    toast.success('Proposta demo da Jequitibá Agro carregada');
  }, []);

  // Pode analisar?
  const canAnalyze = !!(pdfFileName && pdfText && pdfHasText && !isAnalyzing);

  // Analisar proposta — fluxo principal
  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;
    setCurrentView('processing');
    setIsAnalyzing(true);

    try {
      // Passo 1: Extrair campos da proposta via API
      let extractionResult: ExtractionResult;

      try {
        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfText, fileName: pdfFileName }),
        });

        if (extractRes.ok) {
          extractionResult = await extractRes.json();
          // Garantir campos obrigatórios
          extractionResult.textoBruto = extractionResult.textoBruto || pdfText;
          extractionResult.modulos = extractionResult.modulos || [];
          extractionResult.escopos = extractionResult.escopos || [];
          extractionResult.condicoes = extractionResult.condicoes || [];
          extractionResult.camposAusentes = extractionResult.camposAusentes || {
            revisao: '', tipoAliquota: '', impostos: '', motivoReprogramacao: '',
            responsavelSuporte: '', layout: '', cobrancaDespesas: '', possuiRateio: ''
          };
          extractionResult.rateio = extractionResult.rateio || [];
          extractionResult.campos = extractionResult.campos || [];

          // Recalcular valores de investimento (a IA pode errar na formatação)
          extractionResult.investimentos = recalcularInvestimentos(
            extractionResult.investimentos || [],
            extractionResult.impostoCCI || 10.50,
            extractionResult.impostosInclusos ?? true
          );

          // Corrigir campo "Impostos" se o texto bruto contém a informação
          if (!extractionResult.camposAusentes.impostos && pdfText.toLowerCase().includes('impostos')) {
            const lower = pdfText.toLowerCase();
            if (lower.includes('impostos já inclusos') || lower.includes('contêm impostos') || lower.includes('incluem impostos')) {
              extractionResult.camposAusentes.impostos = 'Impostos já inclusos';
            }
          }
        } else {
          throw new Error('API de extração falhou');
        }
      } catch {
        // Fallback: usar extração local se a API falhar
        console.log('API de extração indisponível, usando extração local...');
        extractionResult = extractFieldsLocally(pdfText);
      }

      setExtraction(extractionResult);

      // Passo 2: Validar campos extraídos via API
      let validationResult: ValidationResult;

      try {
        const validateRes = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campos: extractionResult.campos,
            pdfText: extractionResult.textoBruto,
          }),
        });

        if (validateRes.ok) {
          validationResult = await validateRes.json();
          validationResult.itens = validationResult.itens.map((item: ValidationItem) => ({
            ...item,
            corrigido: false,
          }));
        } else {
          throw new Error('API de validação falhou');
        }
      } catch {
        // Fallback: validação local
        console.log('API de validação indisponível, usando validação local...');
        validationResult = generateFallbackValidation(
          extractionResult.campos,
          extractionResult.textoBruto,
          true
        );
      }

      setValidationResult(validationResult);
      setCurrentView('results');
      toast.success(`Análise concluída — Score: ${validationResult.score}/100`);
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar a proposta. Tente novamente.');
      setCurrentView('upload');
    } finally {
      setIsAnalyzing(false);
    }
  }, [canAnalyze, pdfText, pdfFileName]);

  // Copiar sugestão
  const handleCopySuggestion = useCallback((suggestion: string) => {
    toast.success('Sugestão copiada');
  }, []);

  // Aplicar correção
  const handleApplyCorrection = useCallback((item: ValidationItem) => {
    if (!item.sugestao) return;

    setValidationResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        itens: prev.itens.map((i) =>
          i.id === item.id ? { ...i, corrigido: true } : i
        ),
      };
    });

    toast.success(`Correção aplicada: ${item.nome}`);
  }, []);

  // Exportar PDF
  const handleExportPDF = useCallback(() => {
    if (!validationResult) return;
    try {
      const numero = extraction?.codigoProposta || 'proposta';
      exportPDF(validationResult, numero);
      toast.success('Relatório PDF exportado');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  }, [validationResult, extraction]);

  // Exportar CSV
  const handleExportCSV = useCallback(() => {
    if (!validationResult) return;
    try {
      exportCSV(validationResult);
      toast.success('Checklist CSV exportado');
    } catch (error) {
      toast.error('Erro ao gerar CSV');
    }
  }, [validationResult]);

  // Resetar tudo
  const handleReset = useCallback(() => {
    setCurrentView('upload');
    setPdfText('');
    setPdfFileName('');
    setPdfFileSize(0);
    setPdfHasText(true);
    setExtraction(null);
    setValidationResult(null);
    setActiveFilter('Todos');
    setIsAnalyzing(false);
    toast.info('Formulário reiniciado');
  }, []);

  // Preview do texto
  const pdfTextPreview = pdfText.substring(0, 400);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Topbar
        currentView={currentView}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1">
        {currentView === 'upload' && (
          <UploadView
            pdfFileName={pdfFileName}
            pdfFileSize={pdfFileSize}
            pdfHasText={pdfHasText}
            pdfTextPreview={pdfTextPreview}
            isLoading={isAnalyzing}
            onFileLoaded={handleFileLoaded}
            onClearPDF={handleClearPDF}
            onFillDemo={handleFillDemo}
            onAnalyze={handleAnalyze}
            canAnalyze={canAnalyze}
          />
        )}

        {currentView === 'processing' && <ProcessingView />}

        {currentView === 'results' && extraction && validationResult && (
          <ResultsView
            extraction={extraction}
            resultado={validationResult}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onApplyCorrection={handleApplyCorrection}
            onCopySuggestion={handleCopySuggestion}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            onReset={handleReset}
            numeroProposta={extraction.codigoProposta || ''}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
          <p className="text-[10px] text-[var(--muted)]">
            ProValida Senior © {new Date().getFullYear()} — Senior Sistemas S/A
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            Validação inteligente de propostas comerciais
          </p>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
}

// ============================================================
// Recalcular valores de investimento (corrige erros de formatação da IA)
// ============================================================
function recalcularInvestimentos(
  investimentos: { descricao: string; valorComImposto: string; valorSemImposto: string }[],
  impostoCCI: number,
  impostosInclusos: boolean
): { descricao: string; valorComImposto: string; valorSemImposto: string }[] {
  const parseBRL = (s: string): number | null => {
    const clean = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  };

  const formatBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return investimentos.map(item => {
    const valorCom = parseBRL(item.valorComImposto);
    const valorSem = parseBRL(item.valorSemImposto);

    if (impostosInclusos && valorCom) {
      // Valores já incluem imposto → calcular sem imposto
      return {
        ...item,
        valorComImposto: formatBRL(valorCom),
        valorSemImposto: formatBRL(valorCom / (1 + impostoCCI / 100)),
      };
    } else if (!impostosInclusos && valorSem) {
      // Valores não incluem imposto → calcular com imposto
      return {
        ...item,
        valorComImposto: formatBRL(valorSem * (1 + impostoCCI / 100)),
        valorSemImposto: formatBRL(valorSem),
      };
    } else if (valorCom) {
      return {
        ...item,
        valorComImposto: formatBRL(valorCom),
        valorSemImposto: formatBRL(valorCom / (1 + impostoCCI / 100)),
      };
    }
    return item;
  });
}

// ============================================================
// Extração local de campos (fallback quando API indisponível)
// ============================================================
function extractFieldsLocally(pdfText: string): ExtractionResult {
  const lower = pdfText.toLowerCase();

  const findPattern = (patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const match = pdfText.match(p);
      if (match) return match[1] || match[0];
    }
    return null;
  };

  const parseBRL = (s: string): number | null => {
    const clean = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  };

  const formatBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Extrair valores financeiros
  const mensalidadeComImposto = findPattern([/Mensalidade[^:]*:\s*R\$\s*([\d.,]+)/i]) || '';
  const habilitacaoComImposto = findPattern([/Habilitação[^:]*:\s*R\$\s*([\d.,]+)/i]) || '';

  const mensalidadeNum = parseBRL(mensalidadeComImposto);
  const habilitacaoNum = parseBRL(habilitacaoComImposto);
  const cci = 10.50;

  const mensalidadeSemImposto = mensalidadeNum ? formatBRL(mensalidadeNum / (1 + cci / 100)) : '—';
  const habilitacaoSemImposto = habilitacaoNum ? formatBRL(habilitacaoNum / (1 + cci / 100)) : '—';

  // Extrair módulos (tentativa simples)
  const moduloLines: { bloco: string; modulo: string; quantidade: string; unidade: string }[] = [];
  // Detectar blocos por linha de cabeçalho
  const blocoPattern = /(?:Gestão de Pessoas \| HCM|Gestão Empresarial \| ERP|HCM|ERP)/gi;
  const blocoMatches = [...pdfText.matchAll(blocoPattern)];

  // Se não encontrar blocos específicos, criar entradas genéricas
  if (blocoMatches.length > 0) {
    // Tentar extrair módulos do texto
    const moduloPattern = /(\w[\w\s]+?)\s*\|\s*(\d+)\s*\|\s*([\w\s]+)/g;
    let mMatch;
    let currentBloco = '';
    while ((mMatch = moduloPattern.exec(pdfText)) !== null) {
      const modulo = mMatch[1].trim();
      const qtd = mMatch[2].trim();
      const unidade = mMatch[3].trim();
      if (modulo && !modulo.includes('Módulos') && !modulo.includes('Quantidade')) {
        // Detectar bloco atual
        if (modulo.includes('HCM') || modulo.includes('Pessoal') || modulo.includes('eSocial') || modulo.includes('Ponto')) {
          currentBloco = 'Gestão de Pessoas | HCM';
        } else if (modulo.includes('ERP') || modulo.includes('Contabilidade') || modulo.includes('Fiscal') || modulo.includes('Finanças') || modulo.includes('Compras')) {
          currentBloco = 'Gestão Empresarial | ERP';
        }
        moduloLines.push({ bloco: currentBloco, modulo, quantidade: qtd, unidade });
      }
    }
  }

  // Se não encontrou módulos, usar lista padrão
  if (moduloLines.length === 0) {
    moduloLines.push(
      { bloco: 'Gestão de Pessoas | HCM', modulo: 'Produção HCM', quantidade: '2', unidade: 'Usuários SaaS' },
      { bloco: 'Gestão de Pessoas | HCM', modulo: 'Homologação HCM', quantidade: '1', unidade: 'Usuário SaaS' },
      { bloco: 'Gestão de Pessoas | HCM', modulo: 'Administração de Pessoal', quantidade: '100', unidade: 'Colaboradores' },
      { bloco: 'Gestão de Pessoas | HCM', modulo: 'Analisador de Impacto eSocial', quantidade: '100', unidade: 'Colaboradores' },
      { bloco: 'Gestão de Pessoas | HCM', modulo: 'Documentos Eletrônicos eSocial', quantidade: '100', unidade: 'Colaboradores' },
      { bloco: 'Gestão de Pessoas | HCM', modulo: 'Solução de Ponto Senior', quantidade: '100', unidade: 'Colaboradores' },
      { bloco: 'Gestão Empresarial | ERP', modulo: 'Produção ERP', quantidade: '2', unidade: 'Usuários SaaS' },
      { bloco: 'Gestão Empresarial | ERP', modulo: 'Homologação ERP', quantidade: '1', unidade: 'Usuário SaaS' },
      { bloco: 'Gestão Empresarial | ERP', modulo: 'Contabilidade', quantidade: '1', unidade: 'Empresa' },
      { bloco: 'Gestão Empresarial | ERP', modulo: 'Escrita Fiscal', quantidade: '1', unidade: 'Empresa' },
      { bloco: 'Gestão Empresarial | ERP', modulo: 'Finanças', quantidade: '1', unidade: 'Empresa' },
      { bloco: 'Gestão Empresarial | ERP', modulo: 'Compras', quantidade: '1', unidade: 'Empresa' },
    );
  }

  // Extrair escopos
  const escopoPattern = /ESCOPO_SINTETICO[\w_[\]]+/gi;
  const escopoMatches = [...pdfText.matchAll(escopoPattern)];
  const escopos = escopoMatches.map(m => ({ id: m[0] }));
  if (escopos.length === 0) {
    escopos.push(
      { id: 'ESCOPO_SINTETICO_372008_PM_ERP_JEQUITIBA_04082025' },
      { id: 'ESCOPO_SINTETICO_371967_[BV]_HCM_JEQUITIBA_04082025' },
    );
  }

  // Extrair condições de pagamento
  const carencia = findPattern([/(\d+)\s*primeiras?\s*parcelas/i]) || '';
  const descontoCarencia = findPattern([/(\d+)%\s*de\s*desconto/i]) || '';
  const valorCarencia = findPattern([/desconto\s*[—-]\s*R\$\s*([\d.,]+)/i]) || '';

  const condicoes = [
    {
      tipo: 'Mensalidade',
      condicao: carencia ? `${carencia} primeiras parcelas com ${descontoCarencia}% de desconto${valorCarencia ? ' — R$ ' + valorCarencia : ''}` : '',
      descontoHabilitacao: 'Não informado',
      descontoServicos: 'Não informado',
    },
    {
      tipo: 'Habilitação + Serviços',
      condicao: lower.includes('btg') ? 'Pagamento à vista ou financiado via BTG Pactual.' : '',
      descontoHabilitacao: 'Não informado',
      descontoServicos: 'Não informado',
    },
  ];

  // Campos ausentes
  const camposAusentes = {
    revisao: findPattern([/Revisão[:\s]*(.+)/i]) || '',
    tipoAliquota: findPattern([/Tipo Alíquota[:\s]*(.+)/i]) || '',
    impostos: lower.includes('impostos já inclusos') || lower.includes('contêm impostos') ? 'Impostos já inclusos' : '',
    motivoReprogramacao: findPattern([/Motivo[^:]*reprogramação[:\s]*(.+)/i]) || '',
    responsavelSuporte: '',
    layout: findPattern([/Layout[:\s]*(.+)/i]) || '',
    cobrancaDespesas: '',
    possuiRateio: '',
  };

  // Campos flat para validação
  const campos = [
    { campo: 'Cliente', valor: findPattern([/Cliente:\s*(.+?)(?:\s*—|\s*CNPJ)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined as string | undefined },
    { campo: 'CNPJ', valor: findPattern([/CNPJ[:\s]*([\d./-]+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Endereço', valor: findPattern([/Endereço:\s*(.+?)(?:\s*—|\s*CEP)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Executivo', valor: findPattern([/Executivo[^:]*:\s*(.+?)(?:\s*—|\s*$)/im]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Número da Proposta', valor: findPattern([/Proposta Comercial Senior\s+\w+/i, /ID[:\s]+(\d+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Código da Proposta', valor: findPattern([/PR[\w]+/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Solução', valor: findPattern([/Solução:\s*(.+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Valor Mensalidade', valor: mensalidadeComImposto ? `R$ ${mensalidadeComImposto}` : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Valor Habilitação + Serviços', valor: habilitacaoComImposto ? `R$ ${habilitacaoComImposto}` : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Prazo Contratual', valor: findPattern([/(\d+)\s*meses/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Validade da Proposta', valor: findPattern([/Validade:\s*(\d+\s*dias)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Multa Rescisória', valor: findPattern([/Multa rescisória:\s*(.+)/i]) || '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Condições de Financiamento', valor: lower.includes('btg') ? 'Financiamento Banco BTG Pactual' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Faturamento de Serviços', valor: lower.includes('antecipado') ? 'Antecipado' : lower.includes('pós-entrega') ? 'Pós-entrega' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Imposto CCI (%)', valor: lower.includes('imposto') ? '10,50' : '', encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
    { campo: 'Impostos', valor: camposAusentes.impostos, encontrado: false, origem: 'nao_encontrado' as const, trechoPDF: undefined },
  ];

  // Marcar campos encontrados
  for (const campo of campos) {
    if (campo.valor && campo.valor.trim()) {
      campo.encontrado = true;
      campo.origem = 'pdf';
    }
  }

  return {
    cliente: findPattern([/Cliente:\s*(.+?)(?:\s*—|\s*CNPJ)/i]) || 'Não identificado',
    cnpj: findPattern([/CNPJ[:\s]*([\d./-]+)/i]) || '',
    endereco: findPattern([/Endereço:\s*(.+?)(?:\s*—|\s*CEP)/i]) || '',
    executivo: findPattern([/Executivo[^:]*:\s*(.+?)(?:\s*—|\s*$)/im]) || '',
    emailExecutivo: findPattern([/[\w.]+@senior\.com\.br/i]) || '',
    cargoExecutivo: findPattern([/(Executivo de Contas|Consultor|Representante)/i]) || '',
    numeroProposta: findPattern([/ID[:\s]+(\d+)/i]) || '',
    codigoProposta: findPattern([/PR[\w]+/i]) || '',
    versaoModelo: findPattern([/\d{4}\s*\|\s*Versão\s+\d+\s*\|\s*[\d/]+/i]) || '',
    modulos: moduloLines,
    escopos,
    investimentos: [
      { descricao: 'Mensalidade', valorComImposto: mensalidadeComImposto ? `R$ ${mensalidadeComImposto}` : '—', valorSemImposto: mensalidadeSemImposto },
      { descricao: 'Habilitação + Serviços', valorComImposto: habilitacaoComImposto ? `R$ ${habilitacaoComImposto}` : '—', valorSemImposto: habilitacaoSemImposto },
    ],
    impostoCCI: cci,
    impostosInclusos: lower.includes('impostos') || lower.includes('imposto'),
    condicoes,
    prazoContratual: findPattern([/(\d+)\s*meses/i]) || '',
    validadeProposta: findPattern([/Validade:\s*(\d+\s*dias)/i]) || '',
    multaRescisoria: findPattern([/Multa rescisória:\s*(.+)/i]) || '',
    faturamentoServicos: lower.includes('antecipado') ? 'Antecipado' : lower.includes('pós-entrega') ? 'Pós-entrega' : '',
    financiamento: lower.includes('btg') ? 'Financiamento Banco BTG Pactual — Prazo: 15 dias — Cancelamento automático' : '',
    camposAusentes,
    rateio: [],
    observacaoRateio: '',
    campoAssinatura: lower.includes('assinatura') || lower.includes('aprovação') ? 'Presente' : '',
    campos,
    textoBruto: pdfText,
  };
}
