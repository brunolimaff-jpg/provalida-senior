import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * API route que extrai campos estruturados do texto de uma proposta comercial
 * usando o z-ai-web-dev-sdk (LLM no backend).
 */

interface ExtractedField {
  campo: string;
  valor: string;
  encontrado: boolean;
  origem: 'pdf' | 'inferido' | 'nao_encontrado';
  trechoPDF?: string;
}

interface ExtractedRateio {
  conta: string;
  tipoRateio: string;
  percentual: string;
}

interface ExtractionResult {
  campos: ExtractedField[];
  rateio: ExtractedRateio[];
  observacaoRateio: string;
  valoresComImposto: { label: string; valor: string }[];
  valoresSemImposto: { label: string; valor: string }[];
  impostoCCI: number;
  textoBruto: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfText, fileName } = body as { pdfText: string; fileName: string };

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texto do PDF vazio ou não fornecido' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const prompt = `Você é um extrator de dados de propostas comerciais da Senior Sistemas S/A.
Analise o texto abaixo de uma proposta comercial e extraia TODOS os campos listados.

IMPORTANTE:
- Alguns campos podem NÃO estar no texto da proposta (ex: Revisão, Tipo Alíquota, Imposto CCI, Motivo da Reprogramação, Responsável pelo Suporte). Para esses, marque encontrado=false e origem="nao_encontrado".
- Para campos que você conseguir inferir do contexto mas que não estão explícitos, marque origem="inferido".
- Para campos encontrados diretamente no texto, marque origem="pdf" e inclua o trecho exato em trechoPDF.
- Para valores financeiros, extraia tanto com impostos quanto sem impostos (desconsiderando os 10,50% de CCI quando "Impostos já inclusos").
- Se encontrar "com impostos" no texto, o valor sem imposto = valor / 1.105

## TEXTO DA PROPOSTA:
${pdfText.substring(0, 10000)}

## CAMPOS A EXTRAIR (retorne EXATAMENTE este JSON):
{
  "campos": [
    {"campo": "Número da Proposta", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Código da Proposta", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Revisão", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Motivo da Reprogramação", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Layout", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Prazo Pagamento Módulos", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Prazo Pagamento Serviços", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Carência (meses)", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Desconto de Carência (%)", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Cobrança de Despesas", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Representante", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Escopo", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Faturamento de Serviços", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Tipo Alíquota", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Imposto CCI (%)", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Impostos", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Responsável pelo Suporte", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Possui Rateio", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Cliente", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "CNPJ", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Endereço", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Executivo", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Solução", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Valor Mensalidade", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Valor Habilitação + Serviços", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Prazo Contratual", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Validade da Proposta", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Multa Rescisória", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Condições de Financiamento", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Campo de Assinatura", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null}
  ],
  "rateio": [
    {"conta": "", "tipoRateio": "", "percentual": ""}
  ],
  "observacaoRateio": "",
  "valoresComImposto": [
    {"label": "Mensalidade", "valor": ""},
    {"label": "Habilitação + Serviços", "valor": ""}
  ],
  "valoresSemImposto": [
    {"label": "Mensalidade", "valor": ""},
    {"label": "Habilitação + Serviços", "valor": ""}
  ],
  "impostoCCI": 10.50,
  "textoBruto": ""
}

Retorne APENAS o JSON, sem texto adicional.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Você é um extrator de dados preciso. Retorne APENAS JSON válido, sem markdown ou texto adicional.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.05,
      max_tokens: 4096,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json(
        { error: 'Resposta vazia do modelo de IA' },
        { status: 500 }
      );
    }

    // Tentar fazer parse do JSON, removendo markdown se necessário
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    }
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    const result: ExtractionResult = JSON.parse(cleanText);
    result.textoBruto = pdfText;

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Erro na extração:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Erro ao extrair dados: ${message}` },
      { status: 500 }
    );
  }
}
