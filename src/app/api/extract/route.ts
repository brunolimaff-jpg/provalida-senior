import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * API route que extrai campos estruturados do texto de uma proposta comercial
 * usando o z-ai-web-dev-sdk (LLM no backend).
 *
 * Retorna os dados organizados por seções (como na proposta):
 * - Informações Gerais (cliente, executivo, número proposta)
 * - 1.1 MÓDULOS (blocos, módulos, quantidades)
 * - 2. ESCOPO DE SERVIÇOS CONTEMPLADOS (IDs)
 * - 3. INVESTIMENTO (valores com/sem impostos, 10.50% CCI)
 * - 5. CONDIÇÕES DE PAGAMENTO (mensalidade, habilitação, descontos)
 * - Campos ausentes (revisão, tipo alíquota, etc.)
 */

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
Analise o texto abaixo de uma proposta comercial e extraia os dados organizados por seções, exatamente como aparecem no documento.

IMPORTANTE:
- Extraia os dados na mesma estrutura de seções da proposta (1.1 MÓDULOS, 2. ESCOPO, 3. INVESTIMENTO, 5. CONDIÇÕES DE PAGAMENTO).
- Para MÓDULOS: identifique cada BLOCO (ex: "Gestão de Pessoas | HCM", "Gestão Empresarial | ERP") e dentro de cada bloco, liste os módulos com suas quantidades e unidades/modalidades.
- Para ESCOPO: extraia os IDs completos (ex: "ESCOPO_SINTETICO_372008_PM_ERP_JEQUITIBA_04082025").
- Para INVESTIMENTO: extraia os valores do documento. Os valores no documento geralmente INCLUEM impostos (10,50% CCI). O valor "sem imposto" é o BASE (mais confiável, vem automaticamente do sistema). O valor "com imposto" = sem imposto × 1.105. Valide se a diferença entre "com imposto" e "sem imposto" é de aproximadamente 10,50%. Se os valores do documento já incluem imposto, calcule o "sem imposto" dividindo por 1.105. Confirme se o imposto CCI é de 10,50%.
- Para CONDIÇÕES DE PAGAMENTO: organize por tipo (Mensalidade, Habilitação + Serviços), incluindo condições de desconto de carência, desconto de habilitação e desconto de serviços.
- Alguns campos podem NÃO estar na proposta (Revisão, Tipo Alíquota, Motivo da Reprogramação, Responsável pelo Suporte, Layout, Cobrança de Despesas, Possui Rateio). Para esses, deixe vazio em camposAusentes.
- Se o imposto for 10,50% e estiver incluso nos valores, confirme em impostosInclusos=true.

## TEXTO DA PROPOSTA:
${pdfText.substring(0, 12000)}

## JSON OBRIGATÓRIO (retorne APENAS isto):
{
  "cliente": "",
  "cnpj": "",
  "endereco": "",
  "executivo": "",
  "emailExecutivo": "",
  "cargoExecutivo": "",
  "numeroProposta": "",
  "codigoProposta": "",
  "versaoModelo": "",
  "modulos": [
    {"bloco": "Gestão de Pessoas | HCM", "modulo": "Produção HCM", "quantidade": "2", "unidade": "Usuários SaaS"},
    {"bloco": "Gestão de Pessoas | HCM", "modulo": "Homologação HCM", "quantidade": "1", "unidade": "Usuário SaaS"}
  ],
  "escopos": [
    {"id": "ESCOPO_SINTETICO_372008_PM_ERP_JEQUITIBA_04082025"},
    {"id": "ESCOPO_SINTETICO_371967_[BV]_HCM_JEQUITIBA_04082025"}
  ],
  "investimentos": [
    {"descricao": "Mensalidade", "valorComImposto": "R$ 0,00", "valorSemImposto": "R$ 0,00"},
    {"descricao": "Habilitação + Serviços", "valorComImposto": "R$ 0,00", "valorSemImposto": "R$ 0,00"}
  ],
  "impostoCCI": 10.50,
  "impostosInclusos": true,
  "condicoes": [
    {
      "tipo": "Mensalidade",
      "condicao": "Descreva as condições completas de pagamento da mensalidade aqui",
      "descontoHabilitacao": "Não informado ou o valor",
      "descontoServicos": "Não informado ou o valor"
    },
    {
      "tipo": "Habilitação + Serviços",
      "condicao": "Descreva as condições completas de pagamento de habilitação e serviços aqui",
      "descontoHabilitacao": "Não informado ou o valor",
      "descontoServicos": "Não informado ou o valor"
    }
  ],
  "prazoContratual": "",
  "validadeProposta": "",
  "multaRescisoria": "",
  "faturamentoServicos": "",
  "financiamento": "",
  "camposAusentes": {
    "revisao": "",
    "tipoAliquota": "",
    "impostos": "",
    "motivoReprogramacao": "",
    "responsavelSuporte": "",
    "layout": "",
    "cobrancaDespesas": "",
    "possuiRateio": ""
  },
  "rateio": [],
  "observacaoRateio": "",
  "campoAssinatura": "",
  "campos": [
    {"campo": "Cliente", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "CNPJ", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Endereço", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Executivo", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Número da Proposta", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Código da Proposta", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Solução", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Valor Mensalidade", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Valor Habilitação + Serviços", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Prazo Contratual", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Validade da Proposta", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Multa Rescisória", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Condições de Financiamento", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Faturamento de Serviços", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Imposto CCI (%)", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null},
    {"campo": "Impostos", "valor": "", "encontrado": false, "origem": "nao_encontrado", "trechoPDF": null}
  ],
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
      max_tokens: 8192,
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

    const result = JSON.parse(cleanText);
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
