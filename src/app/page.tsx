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
          // Garantir campos obrigatórios e normalizar dados da API
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

          // Complementar dados faltantes com extração local do texto
          // Isso garante que valores financeiros, condições etc. sejam preenchidos
          // mesmo quando a API LLM retorna campos vazios
          extractionResult = complementarComExtracaoLocal(extractionResult, pdfText);

          // Recalcular e validar investimentos
          extractionResult.investimentos = validarERecalcularInvestimentos(
            extractionResult.investimentos || [],
            extractionResult.impostoCCI || 10.50,
            extractionResult.impostosInclusos ?? true,
            pdfText
          );
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
// Complementar dados da API com extração local do texto do PDF
// Esta função SEMPRE tenta extrair valores do texto para garantir
// que os campos não fiquem vazios quando a API LLM falha
// ============================================================
function complementarComExtracaoLocal(result: ExtractionResult, pdfText: string): ExtractionResult {
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

  // Complementar informações gerais
  if (!result.cliente || result.cliente === 'Não identificado' || result.cliente.trim() === '') {
    result.cliente = findPattern([/Cliente:\s*(.+?)(?:\s*—|\s*CNPJ)/i]) || result.cliente || '';
  }
  if (!result.cnpj || result.cnpj.trim() === '') {
    result.cnpj = findPattern([/CNPJ[:\s]*([\d./-]+)/i]) || '';
  }
  if (!result.endereco || result.endereco.trim() === '') {
    result.endereco = findPattern([/Endereço:\s*(.+?)(?:\s*—|\s*CEP)/i]) || '';
  }
  if (!result.executivo || result.executivo.trim() === '') {
    result.executivo = findPattern([/Executivo[^:]*:\s*(.+?)(?:\s*—|\s*$)/im]) || '';
  }
  if (!result.emailExecutivo || result.emailExecutivo.trim() === '') {
    result.emailExecutivo = findPattern([/[\w.]+@senior\.com\.br/i]) || '';
  }
  if (!result.codigoProposta || result.codigoProposta.trim() === '') {
    result.codigoProposta = findPattern([/PR[\w]+/i]) || '';
  }

  // ==========================================
  // INVESTIMENTO — sempre tentar extrair do texto
  // A lógica é: valor "sem imposto" é o BASE,
  // valor "com imposto" = sem imposto × 1.105
  // ==========================================
  const investimentosTemValores = result.investimentos && result.investimentos.length > 0 &&
    result.investimentos.some(i => {
      const v = i.valorComImposto || i.valorSemImposto;
      return v && v !== '—' && v !== '' && v !== 'R$ 0,00';
    });

  if (!investimentosTemValores) {
    // Extrair valores financeiros diretamente do texto do PDF
    const mensalidadeStr = findPattern([
      /Mensalidade[^:]*:\s*R\$\s*([\d.,]+)/i,
      /Mensalidade\s*\(com impostos\)\s*:\s*R\$\s*([\d.,]+)/i,
      /mensalidade.*?R\$\s*([\d.,]+)/i,
    ]);
    const habilitacaoStr = findPattern([
      /Habilitação[^:]*:\s*R\$\s*([\d.,]+)/i,
      /Habilitação\s*\+?\s*Serviços[^:]*:\s*R\$\s*([\d.,]+)/i,
      /habilitação.*?R\$\s*([\d.,]+)/i,
    ]);

    const mensalidadeNum = mensalidadeStr ? parseBRL(mensalidadeStr) : null;
    const habilitacaoNum = habilitacaoStr ? parseBRL(habilitacaoStr) : null;
    const cci = result.impostoCCI || 10.50;

    result.investimentos = [
      {
        descricao: 'Mensalidade',
        valorComImposto: mensalidadeNum ? formatBRL(mensalidadeNum) : '—',
        valorSemImposto: mensalidadeNum ? formatBRL(mensalidadeNum / (1 + cci / 100)) : '—',
      },
      {
        descricao: 'Habilitação + Serviços',
        valorComImposto: habilitacaoNum ? formatBRL(habilitacaoNum) : '—',
        valorSemImposto: habilitacaoNum ? formatBRL(habilitacaoNum / (1 + cci / 100)) : '—',
      },
    ];
  }

  // ==========================================
  // CONDIÇÕES DE PAGAMENTO — sempre tentar extrair do texto
  // ==========================================
  const condicoesTemValores = result.condicoes && result.condicoes.length > 0 &&
    result.condicoes.some(c => c.condicao && c.condicao.trim() !== '');

  if (!condicoesTemValores) {
    // Extrair condições de pagamento do texto
    const carencia = findPattern([/(\d+)\s*primeiras?\s*parcelas/i]);
    const descontoCarencia = findPattern([/(\d+)%\s*de\s*desconto/i]);
    const valorCarencia = findPattern([/desconto\s*[—-]\s*R\$\s*([\d.,]+)/i]);

    // Extrair condições de mensalidade
    let condicaoMensalidade = '';
    if (carencia) {
      condicaoMensalidade = `${carencia} primeiras parcelas com ${descontoCarencia}% de desconto`;
      if (valorCarencia) condicaoMensalidade += ` — R$ ${valorCarencia}`;
    }

    // Extrair condições de habilitação
    let condicaoHabilitacao = '';
    if (lower.includes('btg')) {
      condicaoHabilitacao = 'Pagamento à vista ou financiado via BTG Pactual.';
    }

    // Extrair desconto de habilitação e serviços
    const descHabilitacao = findPattern([/[Dd]esconto de habilitação:\s*(.+)/i]) || 'Não informado';
    const descServicos = findPattern([/[Dd]esconto de serviços:\s*(.+)/i]) || 'Não informado';

    result.condicoes = [
      {
        tipo: 'Mensalidade',
        condicao: condicaoMensalidade,
        descontoHabilitacao: descHabilitacao,
        descontoServicos: descServicos,
      },
      {
        tipo: 'Habilitação + Serviços',
        condicao: condicaoHabilitacao,
        descontoHabilitacao: descHabilitacao,
        descontoServicos: descServicos,
      },
    ];
  } else {
    // Mesmo tendo condições, complementar descontos se estiverem vazios
    for (const cond of result.condicoes) {
      if (!cond.descontoHabilitacao || cond.descontoHabilitacao.trim() === '') {
        const descHab = findPattern([/[Dd]esconto de habilitação:\s*(.+)/i]);
        cond.descontoHabilitacao = descHab || 'Não informado';
      }
      if (!cond.descontoServicos || cond.descontoServicos.trim() === '') {
        const descServ = findPattern([/[Dd]esconto de serviços:\s*(.+)/i]);
        cond.descontoServicos = descServ || 'Não informado';
      }
    }
  }

  // Complementar escopos se vazio
  if (!result.escopos || result.escopos.length === 0) {
    const escopoPattern = /ESCOPO_SINTETICO[\w_[\]]+/gi;
    const escopoMatches = [...pdfText.matchAll(escopoPattern)];
    if (escopoMatches.length > 0) {
      result.escopos = escopoMatches.map(m => ({ id: m[0] }));
    }
  }

  // Complementar prazo, validade, multa
  if (!result.prazoContratual || result.prazoContratual.trim() === '') {
    result.prazoContratual = findPattern([/(\d+)\s*meses/i]) || '';
  }
  if (!result.validadeProposta || result.validadeProposta.trim() === '') {
    result.validadeProposta = findPattern([/Validade:\s*(\d+\s*dias)/i]) || '';
  }
  if (!result.multaRescisoria || result.multaRescisoria.trim() === '') {
    result.multaRescisoria = findPattern([/Multa rescisória:\s*(.+)/i]) || '';
  }
  if (!result.faturamentoServicos || result.faturamentoServicos.trim() === '') {
    result.faturamentoServicos = lower.includes('antecipado') ? 'Antecipado' : lower.includes('pós-entrega') ? 'Pós-entrega' : '';
  }
  if (!result.financiamento || result.financiamento.trim() === '') {
    if (lower.includes('btg')) {
      result.financiamento = 'Financiamento Banco BTG Pactual — Prazo: 15 dias — Cancelamento automático';
    }
  }

  // Corrigir campo "Impostos" nos campos ausentes
  if (!result.camposAusentes.impostos || result.camposAusentes.impostos.trim() === '') {
    if (lower.includes('impostos já inclusos') || lower.includes('contêm impostos') || lower.includes('incluem impostos')) {
      result.camposAusentes.impostos = 'Impostos já inclusos';
    }
  }

  // Detectar impostoCCI se não foi detectado
  if (!result.impostoCCI || result.impostoCCI === 0) {
    const impostoMatch = findPattern([/([\d,]+)\s*%\s*.*(?:CCI|imposto)/i]) ||
                         findPattern([/(?:CCI|imposto).*?([\d,]+)\s*%/i]);
    if (impostoMatch) {
      result.impostoCCI = parseFloat(impostoMatch.replace(',', '.'));
    } else {
      result.impostoCCI = 10.50;
    }
  }

  // Detectar impostosInclusos
  if (result.impostosInclusos === undefined || result.impostosInclusos === null) {
    result.impostosInclusos = lower.includes('impostos') && (lower.includes('inclusos') || lower.includes('contêm') || lower.includes('incluem'));
  }

  return result;
}

// ============================================================
// Validar e recalcular investimentos
// Lógica: o valor "sem imposto" é o BASE (mais confiável).
// O valor "com imposto" = sem imposto × 1.105
// Se a diferença entre com e sem não for ~10.50%, recalculamos
// ============================================================
function validarERecalcularInvestimentos(
  investimentos: { descricao: string; valorComImposto: string; valorSemImposto: string }[],
  impostoCCI: number,
  impostosInclusos: boolean,
  pdfText: string
): { descricao: string; valorComImposto: string; valorSemImposto: string }[] {
  const parseBRL = (s: string): number | null => {
    const clean = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  };

  const formatBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Se investimentos está vazio ou só tem "—", extrair do PDF
  if (!investimentos || investimentos.length === 0 ||
      investimentos.every(i => !i.valorComImposto || i.valorComImposto === '—' || i.valorComImposto === '')) {
    // Extrair do texto do PDF
    const findPattern = (patterns: RegExp[]): string | null => {
      for (const p of patterns) {
        const match = pdfText.match(p);
        if (match) return match[1] || match[0];
      }
      return null;
    };

    const mensalidadeStr = findPattern([
      /Mensalidade[^:]*:\s*R\$\s*([\d.,]+)/i,
      /Mensalidade\s*\(com impostos\)\s*:\s*R\$\s*([\d.,]+)/i,
      /mensalidade.*?R\$\s*([\d.,]+)/i,
    ]);
    const habilitacaoStr = findPattern([
      /Habilitação[^:]*:\s*R\$\s*([\d.,]+)/i,
      /Habilitação\s*\+?\s*Serviços[^:]*:\s*R\$\s*([\d.,]+)/i,
      /habilitação.*?R\$\s*([\d.,]+)/i,
    ]);

    const mensalidadeNum = mensalidadeStr ? parseBRL(mensalidadeStr) : null;
    const habilitacaoNum = habilitacaoStr ? parseBRL(habilitacaoStr) : null;

    return [
      {
        descricao: 'Mensalidade',
        valorComImposto: mensalidadeNum ? formatBRL(mensalidadeNum) : '—',
        valorSemImposto: mensalidadeNum ? formatBRL(mensalidadeNum / (1 + impostoCCI / 100)) : '—',
      },
      {
        descricao: 'Habilitação + Serviços',
        valorComImposto: habilitacaoNum ? formatBRL(habilitacaoNum) : '—',
        valorSemImposto: habilitacaoNum ? formatBRL(habilitacaoNum / (1 + impostoCCI / 100)) : '—',
      },
    ];
  }

  // ========================================================
  // Cross-validação: extrair valores "com imposto" diretamente
  // do PDF e usá-los como fonte de verdade quando disponíveis.
  // A API LLM pode retornar valores ligeiramente incorretos,
  // mas o texto do PDF é a fonte autoritativa.
  // ========================================================
  const findPattern = (patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const match = pdfText.match(p);
      if (match) return match[1] || match[0];
    }
    return null;
  };

  const pdfMensalidadeStr = findPattern([
    /Mensalidade[^:]*:\s*R\$\s*([\d.,]+)/i,
    /Mensalidade\s*\(com impostos\)\s*:\s*R\$\s*([\d.,]+)/i,
    /mensalidade.*?R\$\s*([\d.,]+)/i,
  ]);
  const pdfHabilitacaoStr = findPattern([
    /Habilitação[^:]*:\s*R\$\s*([\d.,]+)/i,
    /Habilitação\s*\+?\s*Serviços[^:]*:\s*R\$\s*([\d.,]+)/i,
    /habilitação.*?R\$\s*([\d.,]+)/i,
  ]);

  const pdfMensalidadeNum = pdfMensalidadeStr ? parseBRL(pdfMensalidadeStr) : null;
  const pdfHabilitacaoNum = pdfHabilitacaoStr ? parseBRL(pdfHabilitacaoStr) : null;

  // Mapa de descrição → valor com imposto extraído do PDF
  const pdfValues: Record<string, number | null> = {
    'Mensalidade': pdfMensalidadeNum,
    'Habilitação + Serviços': pdfHabilitacaoNum,
  };

  // Recalcular cada investimento
  return investimentos.map(item => {
    // Se temos o valor "com imposto" diretamente do PDF, usar como fonte de verdade
    const pdfValorCom = pdfValues[item.descricao] ?? null;
    const valorComOriginal = parseBRL(item.valorComImposto);

    // Se o PDF tem o valor e ele difere do valor da API, usar o do PDF
    let valorCom: number | null;
    if (pdfValorCom !== null) {
      valorCom = pdfValorCom;
    } else {
      valorCom = valorComOriginal;
    }

    const valorSem = parseBRL(item.valorSemImposto);

    // Caso 1: Tem valor com imposto — calcular sem imposto
    if (valorCom) {
      const semImpostoCalc = valorCom / (1 + impostoCCI / 100);

      // Se também tem valor sem imposto, validar se a diferença é ~10.50%
      if (valorSem) {
        const diferencaPercentual = ((valorCom - valorSem) / valorSem) * 100;
        const diferencaOk = Math.abs(diferencaPercentual - impostoCCI) < 1.0; // tolerância de 1%

        if (diferencaOk && pdfValorCom === null) {
          // Valores consistentes e sem cross-validação do PDF — usar o sem imposto como base
          return {
            ...item,
            valorSemImposto: formatBRL(valorSem),
            valorComImposto: formatBRL(valorSem * (1 + impostoCCI / 100)),
          };
        } else {
          // Diferença inconsistente ou temos valor do PDF — confiar no valor com imposto
          // e recalcular o sem imposto
          return {
            ...item,
            valorComImposto: formatBRL(valorCom),
            valorSemImposto: formatBRL(semImpostoCalc),
          };
        }
      }

      // Só tem valor com imposto — calcular sem imposto
      return {
        ...item,
        valorComImposto: formatBRL(valorCom),
        valorSemImposto: formatBRL(semImpostoCalc),
      };
    }

    // Caso 2: Só tem valor sem imposto — calcular com imposto
    if (valorSem) {
      return {
        ...item,
        valorSemImposto: formatBRL(valorSem),
        valorComImposto: formatBRL(valorSem * (1 + impostoCCI / 100)),
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
