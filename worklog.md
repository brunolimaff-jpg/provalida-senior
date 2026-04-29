---
Task ID: 1-9
Agent: Main
Task: Fix payment conditions bug + refactor god file (page.tsx 1129 lines → thin shell)

Work Log:
- Investigated the payment conditions bug in extrairCondicoesDoPDF()
- Added 3rd fallback strategy: if structured parsing fails, use full section text
- Added complementação for empty condicao even when API returns condicoes array
- Searched web for React/Next.js best practices for document processing apps
- Created services/financial-parsing/ - parseBRL, formatBRL, regex patterns, CCI calculations
- Created services/pdf-extraction/ - extrairValoresMonetarios, extrairInvestimentoDoPDF, extrairCondicoesDoPDF
- Created services/field-complement/ - complementarComExtracaoLocal, validarERecalcularInvestimentos
- Created services/local-extraction/ - extractFieldsLocally (full fallback)
- Created hooks/useProposalAnalysis.ts - orchestrates full analysis pipeline
- Refactored page.tsx from 1129 lines → ~75 lines thin shell
- Fixed tax calculation: sem_imposto is BASE, com_imposto = sem_imposto × 1.105
- Added more context keywords for value extraction (desconto, parcela, pagamento)
- Fixed TypeScript type errors
- Build passes successfully

Stage Summary:
- page.tsx reduced from 1129 → 75 lines
- All business logic extracted to 4 service modules + 1 custom hook
- Payment conditions extraction now has 3 fallback strategies
- Tax calculation correctly uses sem_imposto as base value
- Build passes with 0 errors in refactored files
