# De/Para - Manual de Propostas Senior x ProValida

Data da análise: 2026-04-29

## Objetivo

Mapear o que o ProValida precisa validar a partir do Manual de Propostas 2025 e das propostas corretas fornecidas. A leitura separa:

- campos que devem vir do PDF;
- campos que são exclusivos ou quase exclusivos do CRM;
- variações reais entre layouts de proposta;
- lacunas atuais do app.

## Amostra Validada

| Arquivo | Código | Layout observado | Faturamento | Observação relevante |
|---|---:|---|---|---|
| `PR356360V1BS_INXU ERP.pdf` | `PR356360V1BS` | Seções curtas: `2. INVESTIMENTO`, `4. CONDIÇÕES` | não identificado pelo app | Usa numeração diferente do padrão novo. |
| `PR311947V4N_BIOENEGIA_ERP_LOGISTICA_HCM.pdf` | `PR311947V4N` | Layout antigo/assinado | Por pacote | App erra cliente e mensalidade; precisa parser mais tolerante. |
| `PR387153V2KF_NATTER_ERP-SENIOR FLOW-SENIOR TI_Final_v2.pdf` | `PR387153V2KF` | Completo com escopo e fatura excedente | Por pacote | Traz tabela de percentuais por fase/subetapa. |
| `PROPOSTA CLAUDIO AUTO PEÇAS - ERP.pdf` | `PR397530V5AB` | Completo com escopo e fatura excedente | Por pacote | Traz carência/desconto e percentuais quebrados por subetapa. |
| `proposta.pdf` | `PR371020V3MH` | Completo com escopo e fatura excedente | Antecipada | Fluxo BTG, despesas por RDV e vencimento dia 20. |
| `PropostaAssinada.pdf` | `PR367143V1MG` | Sem fatura excedente | não identificado pelo app | Seções em `4. CONDIÇÕES`; app perde condições. |
| `PropostaAssinadaAgricolaAlvorada.pdf` | `PR385126V5MG` | Completo com pacote | Por pacote | Tabela de pacote com subpercentuais. |
| `PROPOSTAHCMCAVACO.pdf` | `PR352878V1MG` | Sem fatura excedente | Por pacote | App não detectou pacote porque condições estão na seção 4. Também tem desconto de primeira parcela. |
| `PROPOSTASANTAASSINADA.pdf` | `PR357224V1BS` | Sem fatura excedente | não identificado pelo app | Seções em `4. CONDIÇÕES`; app perde condições. |

## De/Para Principal

| Manual / regra Senior | Onde aparece no PDF | Como deve entrar no app | Prioridade |
|---|---|---|---|
| Layout selecionado define cláusulas corretas | Normalmente não aparece como campo explícito | Campo CRM/manual obrigatório: `layout`; validar contra indícios do PDF, como presença de escopo aberto/fechado, demanda avulsa, upgrade, balde/bodyshop | Alta |
| Proposta e revisão devem bater com escopo | Código no rodapé, aprovação e IDs de escopo | Extrair `codigoProposta`; manter `revisao` como campo CRM; validar se IDs de escopo carregam mesmo código/revisão quando houver | Alta |
| Valores devem ser conferidos antes da aprovação | Seção `INVESTIMENTO` | Parser determinístico para mensalidade, licença, habilitação, serviços, totais sem/com impostos | Alta |
| Impostos devem ser `INCLUIR IMPOSTOS` | Texto de termos e tabelas com sem/com imposto | Campo `impostosInclusos`; evidência obrigatória; alerta se não houver confirmação | Alta |
| Prazo de pagamento dos módulos/licenças/habilitação vem do negociado aprovado | Seção `CONDIÇÕES DE PAGAMENTO` | Separar `prazoPagamentoModulos` e `prazoPagamentoServicos`; não inferir tudo como BTG | Alta |
| Forma de pagamento padrão é boleto | Às vezes aparece como boleto/parcelas; às vezes não | Campo CRM com default `Boleto`; PDF como evidência quando houver | Média |
| Validade máxima padrão é 60 dias | Termos: propostas válidas por 60 dias; às vezes não há `Validade:` explícito | Parser deve capturar frase corrida e validar `<= 60 dias`; `>60` exige alerta de Operações | Alta |
| Escopo pode ser aberto ou fechado | Termos de serviços, texto `Escopo Fechado`, IDs de escopo | Campo estruturado `escopo.tipo`; para fechado, proposta mostra valor final; para aberto, estimativa/hora pode variar | Alta |
| Faturamento padrão de serviços é antecipado | `faturamento será feito de forma ANTECIPADA` | `faturamentoServicos = Antecipado`; status confirmado com evidência | Alta |
| Faturamento por pacote exige quantidade de pacotes e marco/pacote descrito | `POR PACOTE / EVOLUÇÃO`, tabela de fases/marcos/percentuais | `faturamentoServicos = Por pacote`; armazenar pacotes, subetapas, percentual mínimo e evidência | Alta |
| Faturamento parcelado exige quantidade de NFs | Pode aparecer como parcelado/NF(s) | Adicionar tipo `Parcelado`; capturar quantidade de NFs e vencimento | Média |
| Sob demanda/postecipado não deve ser fomentado e exige aprovação | Termos ou campo CRM | Se aparecer, sinalizar como risco/alerta de alçada | Média |
| Cobrança de despesas padrão Senior ou diferenciada | Seção `DESPESAS DE DESLOCAMENTO`, RDV, reserva/passagens | Capturar `despesas.valor`, `responsavelPassagens`, `taxaAdministracao`, `cobrancaDespesas`; negociação diferenciada exige alerta | Alta |
| Rateio deve fechar 100% por rubrica/CNPJ | Pode não estar no PDF; manual é CRM | Manter como CRM-only; se PDF trouxer, validar soma 100% e rubrica `Licenças`, `Mensalidade`, `Serviços` | Média |
| Carência combina quantidade de meses e percentual de desconto | Condições de mensalidade | Capturar `parcelas/meses`, `% desconto`, `valor com desconto`, `valor cheio após carência` | Alta |
| Multa rescisória SaaS por faixa 35/30/25 | Termos e condições | Parser deve capturar bullets e validar se prazo mínimo `36 meses` existe | Média |
| Aprovação/assinatura | Página final e assinatura eletrônica | Campo de assinatura com status `assinado`, `em branco` ou `não encontrado` | Alta |

## Variáveis Que Mudam Entre Propostas

### 1. Numeração e presença de seções

O app não pode depender de `3. INVESTIMENTO` e `5. CONDIÇÕES` fixos.

- INXU: `2. INVESTIMENTO`, `4. CONDIÇÕES DE PAGAMENTO`.
- Propostas sem fatura excedente: condições aparecem como seção `4`.
- Propostas com fatura excedente: condições aparecem como seção `5`.
- Algumas propostas antigas/assinadas têm texto extraído com menos cabeçalhos claros.

Regra para o app: localizar seção por título normalizado e aceitar qualquer número anterior ao título.

### 2. Investimento

Formatos encontrados:

- tabela com `Total (sem impostos)` e `Total (com impostos)`;
- tabela simples com `Valor Mensal`;
- tabela de `Licença e Habilitação`, `Serviços`, `Total`;
- propostas com valores parciais por solução e total geral.

Lacuna atual: quando não existe linha explícita `Total (sem impostos) / Total (com impostos)`, o app pode pegar item parcial ou até valor de despesa. Exemplo observado: BioEnergia teve mensalidade capturada como `R$ 1,20`, que é valor de quilômetro rodado, não mensalidade.

Regra para o app: parser financeiro precisa reconhecer blocos de tabela, colunas e totais por grupo, nunca buscar o menor/maior valor como fallback financeiro crítico.

### 3. Condições de pagamento

Variações corretas observadas:

- BTG com aprovação/cancelamento automático;
- pagamento de habilitação em 1 parcela para 30 dias;
- licença/habilitação em 6 parcelas/boletos a cada 30 dias;
- mensalidade com vencimento dia 20;
- primeiro pagamento no mês posterior à assinatura/contrato;
- carência/desconto por parcelas iniciais;
- despesas de viagem 14 dias após RDV.

Regra para o app: separar condições por rubrica:

- `mensalidade`;
- `licenca`;
- `habilitacao`;
- `servicos`;
- `despesas`;
- `financiamento`.

### 4. Faturamento por pacote

O manual diz que, se a opção for por pacote, deve haver quantidade de pacotes e descrição do pacote/marco de faturamento.

Nas propostas reais:

- Natter, Claudio, Agrícola Alvorada, Cavaco e BioEnergia usam por pacote/evolução.
- Os percentuais podem ser quebrados em subetapas.
- A regra não é "cobrar exatamente 20/50/30"; é respeitar mínimo por etapa e permitir quebra interna.

Regra para o app:

- armazenar `percentualMinimo` por etapa;
- armazenar subetapas/marcos com percentuais próprios quando o PDF trouxer a tabela;
- validar se a soma por etapa respeita o mínimo;
- validar se soma geral fecha 100%;
- se só houver texto sem tabela legível, marcar como `revisar` com evidência.

### 5. Validade, prazo e multa

O manual estabelece validade máxima de 60 dias. As propostas nem sempre trazem `Validade: 60 dias`; muitas usam frase corrida em termos.

Regra para o app:

- capturar `válidas por 60 dias`, `validade de 60 dias`, `validade: 60 dias`;
- alertar se maior que 60;
- capturar prazo contratual `36 meses`;
- capturar multa por faixas `35%`, `30%`, `25%`.

## Lacunas Atuais Encontradas no App

| Lacuna | Impacto | Exemplo |
|---|---|---|
| Seções por número fixo | Perde condições/investimento em layouts antigos | INXU, Fiori, Cavaco, Santa |
| Fallback financeiro por menor/maior valor | Captura valor errado como mensalidade | BioEnergia pegou `R$ 1,20` |
| Habilitação parcial como total | Validação financeira errada | Fiori pegou `R$ 9.604,70` em vez do total do bloco |
| Faturamento por pacote hardcoded | Não respeita tabela real com subpercentuais | Natter, Claudio, Agrícola |
| CNPJ/cliente ainda frágil em alguns layouts | Dados gerais incorretos ou ausentes | BioEnergia, Claudio |
| Condições antigas na seção 4 não parseadas | Perde vencimento, despesas, pacote, descontos | Cavaco, Santa, Fiori |
| Validade e multa por frase corrida não capturadas | Campos marcados como ausentes mesmo estando no PDF | várias propostas |
| Descontos de carência variados | App só cobre alguns padrões | Cavaco: primeira parcela com 30% |

## Modelo de Dados Recomendado

Separar regra de negócio de parser e UI:

```text
src/provalida/
  domain/
    proposal-audit.ts
    billing-policy.ts
    money.ts
  parsing/
    section-parser.ts
    investment-parser.ts
    payment-terms-parser.ts
    package-billing-parser.ts
    party-parser.ts
  normalization/
    normalize-extraction.ts
  validation/
    validate-proposal-audit.ts
  adapters/
    pdf-text.ts
    export-csv.ts
    export-pdf.ts
```

### Entidades principais

- `ProposalIdentity`: código, revisão, modelo, data, cliente, CNPJ.
- `InvestmentSummary`: mensalidade, licença, habilitação, serviços, total sem/com imposto.
- `PaymentTerms`: prazos por rubrica, forma de pagamento, vencimento, carência, descontos.
- `ServiceBilling`: `Antecipado`, `Por pacote`, `Parcelado`, `Postecipado`, `Sob demanda`.
- `PackageBillingPlan`: pacotes/fases/subetapas, percentual mínimo, percentual informado, evidência.
- `TravelExpensesPolicy`: RDV, prazo, responsável passagens, taxa administração.
- `AuditEvidence`: trecho, seção, confiança, origem.

## Backlog Recomendado

1. Trocar extração de seção por busca por título, não por número fixo.
2. Criar parser de investimento por tabela/bloco, removendo fallback de menor/maior valor.
3. Criar parser de condições por rubrica: mensalidade, licença, habilitação, serviços, despesas.
4. Criar parser específico de faturamento por pacote com subetapas e percentuais.
5. Expandir parser de dados gerais para página final e blocos assinados.
6. Capturar validade e multa em frases corridas.
7. Marcar campos CRM-only de forma explícita, sem parecer erro de PDF.
8. Atualizar tela para mostrar "variável encontrada", "CRM-only" e "revisar com alçada".
9. Criar fixtures de teste para cada proposta correta fornecida.

## Critérios de Aceite

- Cada proposta correta da amostra deve gerar um resumo auditável sem valores financeiros absurdos.
- O app deve indicar `Por pacote` nas propostas que trazem essa condição.
- Para faturamento por pacote, a UI deve mostrar percentuais mínimos e subetapas quando legíveis.
- Se o PDF trouxer seção `4. CONDIÇÕES` em vez de `5. CONDIÇÕES`, a extração deve funcionar igual.
- Campos que dependem só do CRM devem aparecer como `Verificar no CRM`, não como falha do PDF.
- Exportação PDF/CSV deve carregar os mesmos dados auditáveis da tela.
