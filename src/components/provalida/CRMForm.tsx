'use client';

import type { CRMData } from './types';
import {
  LAYOUT_OPTIONS,
  PRAZO_OPTIONS,
  COBRANCA_OPTIONS,
  ESCOPO_OPTIONS,
  FATURAMENTO_OPTIONS,
  ALIQUOTA_OPTIONS,
  IMPOSTOS_OPTIONS,
} from './constants';
import RateioTable from './RateioTable';

interface CRMFormProps {
  crmData: CRMData;
  onChange: (data: CRMData) => void;
}

export default function CRMForm({ crmData, onChange }: CRMFormProps) {
  // Atualizar campo do CRM
  const updateField = <K extends keyof CRMData>(field: K, value: CRMData[K]) => {
    onChange({ ...crmData, [field]: value });
  };

  // Verificar se revisão > 1 e motivo vazio
  const showReprogramacaoWarning = crmData.revisao > 1 && (!crmData.motivoReprogramacao || crmData.motivoReprogramacao.trim() === '');

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[var(--text)]">Dados do CRM</h2>

      {/* Número da Proposta */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Número da Proposta *</label>
        <input
          type="text"
          value={crmData.numeroProposta}
          onChange={(e) => updateField('numeroProposta', e.target.value)}
          placeholder="Ex: 428658"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        />
      </div>

      {/* Código da Proposta */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Código da Proposta *</label>
        <input
          type="text"
          value={crmData.codigoProposta}
          onChange={(e) => updateField('codigoProposta', e.target.value)}
          placeholder="Ex: PR372150V1MH"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        />
      </div>

      {/* Revisão e Motivo da Reprogramação */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Revisão *</label>
          <input
            type="number"
            value={crmData.revisao}
            onChange={(e) => updateField('revisao', parseInt(e.target.value) || 1)}
            min={1}
            max={99}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Motivo Reprogramação
            {showReprogramacaoWarning && (
              <span className="ml-1 text-[#964219]">⚠ Obrigatório</span>
            )}
          </label>
          <input
            type="text"
            value={crmData.motivoReprogramacao}
            onChange={(e) => updateField('motivoReprogramacao', e.target.value)}
            placeholder={crmData.revisao > 1 ? 'Descreva o motivo...' : 'N/A'}
            className={`w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors duration-180 ${
              showReprogramacaoWarning
                ? 'border-[#964219] focus:border-[#964219]'
                : 'border-[var(--border)] focus:border-[#01696f]'
            }`}
          />
        </div>
      </div>

      {/* Layout */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Layout *</label>
        <select
          value={crmData.layout}
          onChange={(e) => updateField('layout', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        >
          <option value="">Selecione...</option>
          {LAYOUT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Prazo de Pagamento Módulos */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Prazo Pagamento Módulos *</label>
        <select
          value={crmData.prazoPagamentoModulos}
          onChange={(e) => updateField('prazoPagamentoModulos', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        >
          <option value="">Selecione...</option>
          {PRAZO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Prazo de Pagamento Serviços */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Prazo Pagamento Serviços *</label>
        <select
          value={crmData.prazoPagamentoServicos}
          onChange={(e) => updateField('prazoPagamentoServicos', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        >
          <option value="">Selecione...</option>
          {PRAZO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Carência e Desconto */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Carência (meses)</label>
          <input
            type="number"
            value={crmData.carenciaMeses}
            onChange={(e) => updateField('carenciaMeses', parseInt(e.target.value) || 0)}
            min={0}
            max={24}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Desconto Carência (%)</label>
          <input
            type="number"
            value={crmData.descontoCarencia}
            onChange={(e) => updateField('descontoCarencia', parseFloat(e.target.value) || 0)}
            min={0}
            max={100}
            step={0.5}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
          />
        </div>
      </div>

      {/* Cobrança de Despesas */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Cobrança de Despesas</label>
        <select
          value={crmData.cobrancaDespesas}
          onChange={(e) => updateField('cobrancaDespesas', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        >
          <option value="">Selecione...</option>
          {COBRANCA_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Representante */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Representante *</label>
        <input
          type="text"
          value={crmData.representante}
          onChange={(e) => updateField('representante', e.target.value)}
          placeholder="Ex: Senior Filial MT"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        />
      </div>

      {/* Escopo */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Escopo *</label>
        <select
          value={crmData.escopo}
          onChange={(e) => updateField('escopo', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        >
          <option value="">Selecione...</option>
          {ESCOPO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Faturamento de Serviços */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Faturamento Serviços *</label>
        <select
          value={crmData.faturamentoServicos}
          onChange={(e) => updateField('faturamentoServicos', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        >
          <option value="">Selecione...</option>
          {FATURAMENTO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Tipo Alíquota */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Tipo Alíquota *</label>
        <select
          value={crmData.tipoAliquota}
          onChange={(e) => updateField('tipoAliquota', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        >
          <option value="">Selecione...</option>
          {ALIQUOTA_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Imposto CCI */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Imposto CCI (%)</label>
        <input
          type="number"
          value={crmData.impostoCCI}
          onChange={(e) => updateField('impostoCCI', parseFloat(e.target.value) || 0)}
          min={0}
          max={100}
          step={0.01}
          placeholder="10.50"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        />
      </div>

      {/* Impostos */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Impostos *</label>
        <select
          value={crmData.impostos}
          onChange={(e) => updateField('impostos', e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        >
          <option value="">Selecione...</option>
          {IMPOSTOS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Responsável Suporte */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Responsável Suporte</label>
        <input
          type="text"
          value={crmData.responsavelSuporte}
          onChange={(e) => updateField('responsavelSuporte', e.target.value)}
          placeholder="Ex: Senior Matriz"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#01696f] transition-colors duration-180"
        />
      </div>

      {/* Possui Rateio */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Possui Rateio? *</label>
        <div className="flex gap-3">
          {['Sim', 'Não'].map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm cursor-pointer transition-colors duration-180 ${
                crmData.possuiRateio === opt
                  ? 'border-[#01696f] bg-[#cedcd8] text-[#01696f] font-medium'
                  : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
              }`}
            >
              <input
                type="radio"
                name="possuiRateio"
                value={opt}
                checked={crmData.possuiRateio === opt}
                onChange={(e) => updateField('possuiRateio', e.target.value)}
                className="sr-only"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Tabela de Rateio (condicional) */}
      {crmData.possuiRateio === 'Sim' && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Contas de Rateio</label>
          <RateioTable
            contas={crmData.contasRateio}
            onChange={(contas) => updateField('contasRateio', contas)}
          />
        </div>
      )}
    </div>
  );
}
