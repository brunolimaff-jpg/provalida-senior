'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { PROCESSING_STEPS } from './constants';

export default function ProcessingView() {
  const [currentStep, setCurrentStep] = useState(0);

  // Calcular progresso derivado do passo atual (sem setState)
  const progress = useMemo(() => (currentStep / PROCESSING_STEPS.length) * 100, [currentStep]);

  useEffect(() => {
    const stepDuration = 700;
    const totalSteps = PROCESSING_STEPS.length;

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < totalSteps) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, stepDuration);

    return () => {
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Ícone central */}
        <div className="flex justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#cedcd8]">
            <Loader2 className="h-8 w-8 animate-spin text-[#01696f]" />
          </div>
        </div>

        {/* Título */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--text)]">Analisando proposta...</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Aguarde enquanto validamos os dados</p>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#01696f] transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-right text-xs text-[var(--muted)]">{Math.round(Math.min(progress, 100))}%</p>
        </div>

        {/* Lista de passos */}
        <div className="space-y-3">
          {PROCESSING_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 rounded-lg p-3 transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-[#d4dfcc] text-[#437a22]'
                    : isCurrent
                    ? 'bg-[#cedcd8] text-[#01696f]'
                    : 'bg-[var(--background)] text-[var(--muted)]'
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isCompleted
                    ? 'bg-[#437a22] text-white'
                    : isCurrent
                    ? 'bg-[#01696f] text-white'
                    : 'bg-[var(--border)] text-[var(--muted)]'
                }`}>
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <span className={`text-sm ${isCompleted || isCurrent ? 'font-medium' : ''}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
