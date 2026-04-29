'use client';

import { ShieldCheck, Sun, Moon } from 'lucide-react';
import type { CurrentView, ThemeMode } from './types';

interface TopbarProps {
  currentView: CurrentView;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const steps = [
  { key: 'upload' as CurrentView, label: '1. Dados' },
  { key: 'processing' as CurrentView, label: '2. Análise' },
  { key: 'results' as CurrentView, label: '3. Resultados' },
];

export default function Topbar({ currentView, theme, onToggleTheme }: TopbarProps) {
  const currentIndex = steps.findIndex(s => s.key === currentView);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] transition-colors duration-180">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[#01696f]" />
          <span className="text-lg font-bold text-[var(--text)]">
            ProValida <span className="text-[#01696f]">Senior</span>
          </span>
        </div>

        {/* Indicadores de passo */}
        <nav className="hidden sm:flex items-center gap-1" aria-label="Etapas">
          {steps.map((step, i) => {
            const isActive = step.key === currentView;
            const isCompleted = i < currentIndex;
            return (
              <div key={step.key} className="flex items-center gap-1">
                {i > 0 && (
                  <div
                    className={`h-px w-6 transition-colors duration-180 ${
                      isCompleted ? 'bg-[#01696f]' : 'bg-[var(--border)]'
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-180 ${
                    isActive
                      ? 'bg-[#01696f] text-white'
                      : isCompleted
                      ? 'bg-[#cedcd8] text-[#01696f]'
                      : 'bg-[var(--background)] text-[var(--muted-foreground)]'
                  }`}
                >
                  {isCompleted && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {step.label}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Toggle de tema */}
        <button
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] transition-colors duration-180 hover:bg-[var(--surface)] hover:text-[var(--text)]"
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
