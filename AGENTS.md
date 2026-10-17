# SCHUBERT Design Suite

Svelte 5 / SvelteKit 3 / Node 24 / TypeScript strict / pnpm workspace. UI and business documents in German; code identifiers in English. Read docs/master-specification.md and docs/implementation-plan.md before changing domain behavior.

All business writes use packages/application commands with authenticated server context, current membership checks, optimistic versions, idempotent receipts, audit and outbox in one PostgreSQL transaction. Decimal strings and decimal.js for money. Tenant-local composite references and FORCE RLS. Never mutate issued invoices, published quote versions, approved planning revisions or ledger history. No tenant or permission from browser input. No secrets in logs or client bundles. Files stay private and quarantined until scanning. No mock integration success. Missing credentials must produce an explicit unavailable state.

Finance and manufacturing release require approved configuration and evidence. AI proposes; explicit user actions commit binding transactions. Owner alone does not grant technical release permission. Keep requirements and test evidence honest. Run pnpm check, pnpm test, PostgreSQL integration tests and pnpm build before delivery. Browser test full flows and inspect PDF outputs. Never substitute a demonstration for a completed requirement.
