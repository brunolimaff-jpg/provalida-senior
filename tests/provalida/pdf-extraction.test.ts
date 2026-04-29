import { describe, expect, it } from 'bun:test';
import { extractFieldsLocally } from '../../src/services/local-extraction';
import { extrairCondicoesDoPDF, extrairInvestimentoDoPDF, extrairSecaoNumerada, extrairSecaoPorTitulo } from '../../src/services/pdf-extraction';

const REAL_PDF_SNIPPET = `
Proposta Comercial Senior PR372150V1MH
Jequitibá Agro LTDA
40.494.738/0001-77
Rod MT 129, Km 05, S/N
Bruno Lima Freitas Ferreira
bruno.ferreira@senior.com.br

3. INVESTIMENTO
MENSALIDADE
Total (sem impostos) Total (com impostos)
R$ 13.640,51 R$ 15.240,80

HABILITAÇÃO e SERVIÇOS
Gestão de Pessoas HCM R$ 29.688,16 sem impostos R$ 463.030,77 sem impostos
Gestão Empresarial ERP
Senior GAtec R$ 33.171,13 com impostos R$ 517.352,82 com impostos
Total (sem impostos) Total (com impostos)
R$ 492.718,93 R$ 550.523,95

4. REGRAS COMERCIAIS
O prazo mínimo contratual é de 36 meses.

5. CONDIÇÕES DE PAGAMENTO
O pagamento dos valores referentes à Habilitação e Serviços previstos nesta Proposta será realizado através de financiamento pelo Banco BTG Pactual, com prazo para aprovação de até 15 (quinze) dias corridos. O não cumprimento desse prazo gerará cancelamento automático.
O faturamento será feito de forma ANTECIPADA.
O vencimento será mensal, no dia 20 de cada mês.
MENSALIDADE
SaaS contrato, e, com 06 (seis) primeiras parcelas com 50% de desconto no valor de R$ 7.620,40.
DESPESAS DE VIAGEM
As despesas serão pagas 14 dias após o RDV.

6. APROVAÇÃO
Assinatura
`;

const PACKAGE_BILLING_SNIPPET = `
5. CONDIÇÕES DE PAGAMENTO
HABILITAÇÃO O pagamento da habilitação ocorrerá em 01 parcela para 30 dias.
O vencimento será mensal, no dia 20 de cada mês, com o primeiro
MENSALIDADE pagamento ocorrendo no mês posterior ao da assinatura da proposta e/ou SaaS contrato.
É o projeto em que, independentemente das horas trabalhadas pelo Consultor, o valor mencionado na proposta para execução dos serviços será o faturado.
SERVIÇOS Escopo Fechado
O faturamento será feito de forma POR PACOTE / EVOLUÇÃO (realizado de acordo com a finalização das FASES detalhadas), com pagamento da(s) NF(s) ocorrendo em 01 parcela para 30 dias.
As despesas serão pagas 14 dias após o RDV.
5.1 Faturamento:
`;

const LEGACY_PAYMENT_SNIPPET = `
4. CONDIÇÕES DE PAGAMENTO
HABILITAÇÃO O pagamento da habilitação ocorrerá em 01 parcela para 30 dias.
O vencimento será mensal, no dia 10 de cada mês.
O faturamento será feito de forma ANTECIPADA.
As condições expressas nesta proposta são válidas por 60 dias.
Em caso de rescisão será aplicada multa rescisória de 35% até 12º mês, 30% do 13º ao 24º mês e 25% do 25º ao 36º mês sobre parcelas vincendas.
5. APROVAÇÃO
`;

const SIMPLE_INVESTMENT_SNIPPET = `
2. INVESTIMENTO
MENSALIDADE
Gestão de Pessoas HCM R$ 3.051,50

LICENÇA, HABILITAÇÃO E SERVIÇOS
Gestão de Pessoas HCM R$ 9.604,70 R$ 108.770,42 R$ 118.375,12

3. CONDIÇÕES COMERCIAIS
`;

const PACKAGE_WITH_SUBPERCENTAGES_SNIPPET = `
5. CONDIÇÕES DE PAGAMENTO
O faturamento será feito de forma POR PACOTE / EVOLUÇÃO.
Etapa Marco/Pacote % Percentual mínimo de faturamento
Início Aceite da proposta 10%
Início Realização do Kickoff 5%
Início Aprovação do planejamento/cronograma inicial 5%
Execução Aprovação de DPS ou documento equivalente 20%
Execução Entrega para Homologação 30%
Finalização Realização do GO LIVE 20%
Finalização Encerramento do projeto 10%
6. APROVAÇÃO
`;

const PAYMENT_ONLY_PACKAGE_VALUE_SNIPPET = `
4. CONDIÇÕES DE PAGAMENTO
FATURAMENTO: POR PACOTE (EVOLUÇÃO): O faturamento do valor relativo aos serviços será
realizado de acordo com a finalização das fases. Valor da parcela: R$ 79.627,80.
DESPESAS DE VIAGEM As despesas serão pagas 14 dias após o RDV.
`;

const PACKAGE_WITH_HOURLY_RATE_SNIPPET = `
5. CONDIÇÕES DE PAGAMENTO
O faturamento será feito de forma POR PACOTE / EVOLUÇÃO.
Início Aceite da proposta 10%
Execução Aprovação de documento equivalente 50%
Execução » Até o 12º mês: 35%
SaaS » Do 13º ao 24º mês: 30%
o valor hora dos profissionais Senior sofrerá um adicional de 50%
este valor hora será acrescido em 100%
6. APROVAÇÃO
`;

const MONTHLY_SCALE_SNIPPET = `
5. CONDIÇÕES DE PAGAMENTO
O vencimento será mensal, no dia 20 de cada mês, com o primeiro
pagamento ocorrendo no mês posterior ao da assinatura da proposta e/ou
MENSALIDADE
contrato, seguindo a seguinte regra: de 1 a 12 meses no valor de R$ 29.563,37
SaaS
de 13 a 36 meses no valor de R$ 59.126,74 e após o mês 37 no valor de R$
67.899,33, seguindo reajuste a partir do 37º sendo aplicado ao 49º mês.
6. APROVAÇÃO
`;

const CARENCIA_MENSALIDADE_SNIPPET = `
5. CONDIÇÕES DE PAGAMENTO
O vencimento será mensal, no dia 20 de cada mês, com o primeiro
pagamento ocorrendo no mês posterior ao da assinatura da proposta
MENSALIDADE e/ou contrato com 50% de carência nos primeiros 6 meses, sendo assim
SaaS o valor que será cobrado nos primeiros 6 meses será de R$ 31.018,61
após os 6 meses de carência o valor volta a ser cobrado integralmente
de R$ 62.037,23.
6. APROVAÇÃO
`;

describe('parser financeiro ProValida', () => {
  it('extrai seção numerada exata sem cair em condições genéricas', () => {
    const section = extrairSecaoNumerada(REAL_PDF_SNIPPET, 5, 'CONDIÇÕES DE PAGAMENTO');

    expect(section).toContain('Banco BTG Pactual');
    expect(section).toContain('R$ 7.620,40');
    expect(section).not.toContain('3. INVESTIMENTO');
  });

  it('separa valores contratuais totais de descontos e itens parciais', () => {
    const investimento = extrairInvestimentoDoPDF(REAL_PDF_SNIPPET);

    expect(investimento.mensalidade).toBe(15240.8);
    expect(investimento.mensalidadeSemImposto).toBe(13640.51);
    expect(investimento.habilitacao).toBe(550523.95);
    expect(investimento.habilitacaoSemImposto).toBe(492718.93);
    expect(investimento.evidencias?.mensalidade?.trecho).toBe('Total (com impostos) R$ 15.240,80');
  });

  it('extrai condições comerciais críticas', () => {
    const condicoes = extrairCondicoesDoPDF(REAL_PDF_SNIPPET);

    expect(condicoes.condicaoMensalidade).toContain('6 primeiras parcelas');
    expect(condicoes.condicaoMensalidade).toContain('50% de desconto');
    expect(condicoes.condicaoMensalidade).toContain('R$ 7.620,40');
    expect(condicoes.financiamento).toContain('BTG Pactual');
    expect(condicoes.financiamento).toContain('15 dias');
    expect(condicoes.faturamentoServicos).toBe('Antecipada');
    expect(condicoes.detalhes?.despesas?.valor).toBe('14 dias após RDV');
    expect(condicoes.detalhes?.habilitacaoServicos.cancelamentoAutomatico).toBe(true);
  });

  it('normaliza resultado com evidências e preserva valor cheio da mensalidade', () => {
    const result = extractFieldsLocally(REAL_PDF_SNIPPET);

    expect(result.codigoProposta).toBe('PR372150V1MH');
    expect(result.cliente).toBe('Jequitibá Agro LTDA');
    expect(result.cnpj).toBe('40.494.738/0001-77');
    expect(result.investimentos[0].valorComImposto).toBe('R$ 15.240,80');
    expect(result.investimentos[1].valorComImposto).toBe('R$ 550.523,95');
    expect(result.condicoesPagamento?.mensalidade.valorComDesconto).toBe('R$ 7.620,40');
    expect(result.condicoesPagamento?.habilitacaoServicos.banco).toBe('BTG Pactual');
  });

  it('reconhece faturamento por pacote e monta os percentuais por etapa', () => {
    const condicoes = extrairCondicoesDoPDF(PACKAGE_BILLING_SNIPPET);

    expect(condicoes.faturamentoServicos).toBe('Por pacote');
    expect(condicoes.detalhes?.pacote?.modalidade).toBe('Por pacote');
    expect(condicoes.detalhes?.pacote?.etapas).toHaveLength(3);
    expect(condicoes.detalhes?.pacote?.etapas.map(stage => stage.percentualMinimo)).toEqual(['20%', '50%', '30%']);
    expect(condicoes.detalhes?.pacote?.etapas[0].marcos.map(marco => marco.descricao)).toContain('Aceite da proposta');
    expect(condicoes.detalhes?.pacote?.observacao).toContain('pode ser quebrado');
  });

  it('localiza seções pelo título mesmo quando o número muda', () => {
    const section = extrairSecaoPorTitulo(LEGACY_PAYMENT_SNIPPET, 'CONDIÇÕES DE PAGAMENTO');

    expect(section).toContain('01 parcela para 30 dias');
    expect(section).not.toContain('5. APROVAÇÃO');
  });

  it('extrai valores de investimento em proposta antiga sem linha Total', () => {
    const investimento = extrairInvestimentoDoPDF(SIMPLE_INVESTMENT_SNIPPET);

    expect(investimento.mensalidade).toBe(3051.5);
    expect(investimento.habilitacao).toBe(118375.12);
  });

  it('extrai condições antigas, validade e multa em texto corrido', () => {
    const condicoes = extrairCondicoesDoPDF(LEGACY_PAYMENT_SNIPPET);

    expect(condicoes.condicaoHabilitacao).toContain('01 parcela para 30 dias');
    expect(condicoes.faturamentoServicos).toBe('Antecipada');
    expect(condicoes.validadeProposta).toBe('60 dias');
    expect(condicoes.multaRescisoria).toContain('35% até 12º mês');
  });

  it('preserva percentuais quebrados por subetapa no faturamento por pacote', () => {
    const condicoes = extrairCondicoesDoPDF(PACKAGE_WITH_SUBPERCENTAGES_SNIPPET);
    const etapas = condicoes.detalhes?.pacote?.etapas || [];
    const inicio = etapas.find(stage => stage.etapa === 'Início');
    const execucao = etapas.find(stage => stage.etapa === 'Execução');
    const finalizacao = etapas.find(stage => stage.etapa === 'Finalização');

    expect(condicoes.faturamentoServicos).toBe('Por pacote');
    expect(inicio?.marcos.map(marco => marco.percentual)).toContain('10%');
    expect(execucao?.marcos.map(marco => marco.percentual)).toContain('30%');
    expect(finalizacao?.marcos.map(marco => marco.percentual)).toContain('20%');
  });

  it('não usa valor de pacote como mensalidade quando a seção de investimento não existe', () => {
    const investimento = extrairInvestimentoDoPDF(PAYMENT_ONLY_PACKAGE_VALUE_SNIPPET);

    expect(investimento.mensalidade).toBeNull();
    expect(investimento.habilitacao).toBeNull();
  });

  it('não mistura multa e valor hora nos marcos de faturamento por pacote', () => {
    const condicoes = extrairCondicoesDoPDF(PACKAGE_WITH_HOURLY_RATE_SNIPPET);
    const descriptions = condicoes.detalhes?.pacote?.etapas.flatMap(stage => stage.marcos.map(marco => marco.descricao)) || [];

    expect(descriptions.join(' ')).toContain('Aprovação de documento equivalente');
    expect(descriptions.join(' ')).not.toContain('valor hora');
    expect(descriptions.join(' ')).not.toContain('Até o 12º mês');
  });

  it('extrai escala de mensalidade por faixa de meses', () => {
    const condicoes = extrairCondicoesDoPDF(MONTHLY_SCALE_SNIPPET);

    expect(condicoes.detalhes?.mensalidade.escala).toEqual([
      { periodo: '1 a 12 meses', valor: 'R$ 29.563,37' },
      { periodo: '13 a 36 meses', valor: 'R$ 59.126,74' },
      { periodo: 'Após o mês 37', valor: 'R$ 67.899,33' },
    ]);
    expect(condicoes.condicaoMensalidade).toContain('Escala de mensalidade');
  });

  it('extrai carência/desconto de mensalidade por meses', () => {
    const condicoes = extrairCondicoesDoPDF(CARENCIA_MENSALIDADE_SNIPPET);

    expect(condicoes.detalhes?.mensalidade.parcelasComDesconto).toBe('6');
    expect(condicoes.detalhes?.mensalidade.descontoPercentual).toBe('50%');
    expect(condicoes.detalhes?.mensalidade.valorComDesconto).toBe('R$ 31.018,61');
    expect(condicoes.condicaoMensalidade).toContain('6 primeiros meses com 50% de carência');
  });
});
