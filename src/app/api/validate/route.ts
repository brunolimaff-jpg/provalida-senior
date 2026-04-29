import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * API route que valida os campos extraídos de uma proposta comercial
 * contra as regras de negócio da Senior Sistemas.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campos, pdfText } = body as { campos: Array<{ campo: string; valor: string; encontrado: boolean; origem: string; trechoPDF?: string }>; pdfText: string };

    if (!campos || !Array.isArray(campos)) {
      return NextResponse.json(
        { error: 'Campos não fornecidos ou formato inválido' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const prompt = `Você é um auditor de propostas comerciais da Senior Sistemas S/A.
Analise os campos extraídos de uma proposta comercial e valide conforme as regras abaixo.

## CAMPOS EXTRAÍDOS:
${JSON.stringify(campos, null, 2)}

## TEXTO DO PDF:
${(pdfText || '').substring(0, 8000)}

## REGRAS DE VALIDAÇÃO:

### GRUPO 1 — Campos Ausentes no PDF (campos que SÓ existem no CRM):
1. Revisão > 1 sem Motivo da Reprogramação → error
2. Possui Rateio = Sim com percentuais vazios ou incompletos → error  
3. Layout "Demandas Avulsas" com Escopo "Fechado" em proposta multi-produto → warning
4. Carência > 6 meses ou desconto > 50% → warning

### GRUPO 2 — Consistência CRM × PDF:
5. Carência declarada no PDF deve bater com o campo extraído → error se divergir
6. Escopo declarado no PDF → error se ausente
7. Faturamento declarado no PDF → error se ausente
8. BTG: PDF deve ter "BTG Pactual" + prazo 15 dias + cancelamento automático → error
9. Tratamento de impostos declarado no PDF → warning se ausente
10. CNPJ do cliente no PDF → error se ausente
11. Valor total no PDF → error se ausente
12. Validade da proposta no PDF → warning se ausente
13. Prazo contratual 36 meses e multa rescisória no PDF → warning se ausente
14. Representante compatível com localização do cliente → warning se inconsistente

### GRUPO 3 — Qualidade:
15. Campo de assinatura/aceite no PDF → warning se ausente
16. Data de emissão no PDF → warning se ausente
17. Endereço do cliente no PDF → info se ausente

### GRUPO 4 — Campos Exclusivos do CRM (não estão no PDF):
Para campos como "Revisão", "Tipo Alíquota", "Imposto CCI", "Motivo da Reprogramação", "Responsável pelo Suporte" — verifique se foram marcados como "nao_encontrado" e alerte o usuário que esses dados precisam ser verificados manualmente no CRM.

## JSON OBRIGATÓRIO (retorne APENAS isto):
{
  "score": <0-100>,
  "classificacao": "<Aprovada | Com Ressalvas | Necessita Revisão>",
  "resumo": "<1 frase>",
  "camposCRMNaoEncontrados": ["campo1", "campo2"],
  "itens": [{
    "id": "<snake_case>",
    "nome": "<nome legível>",
    "categoria": "<CRM Interno | CRM × PDF | Qualidade | Campo Exclusivo CRM>",
    "status": "<ok | warning | error | info>",
    "valorCRM": "<string ou null>",
    "evidenciaPDF": "<trecho ou 'Não encontrado'>",
    "mensagem": "<descrição objetiva>",
    "sugestao": "<como corrigir ou null>"
  }]
}
Score: ≥85 = Aprovada | 65-84 = Com Ressalvas | <65 = Necessita Revisão.
Erros penalizam mais que avisos.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Você é um auditor preciso. Retorne APENAS JSON válido, sem markdown ou texto adicional.'
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

    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
    if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
    cleanText = cleanText.trim();

    const result = JSON.parse(cleanText);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Erro na validação:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Erro ao validar: ${message}` },
      { status: 500 }
    );
  }
}
