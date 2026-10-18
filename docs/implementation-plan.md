# Implementation plan — 2026-10-17

Full scope: docs/master-specification.md. Empty upstream repository inspected. Dedicated Vercel project schubert-design-suite created in the connected account; no existing Schubert marketing project modified.

| Stage | Status | Evidence |
|---|---|---|
| 0 Foundation and requirements | Implemented and checked | Source specification, requirements matrix, CI, dependency baseline |
| 1 Identity, commands, DB, outbox, private files | Implemented and exercised | 15 real PostgreSQL transaction/isolation checks; malware/private-file tests |
| 2 CRM, sales, billing, payments, portal | Implemented and exercised; operational profiles pending | Browser flows, full finance/XRechnung/DATEV/private originals |
| 3 Workforce and offline PWA | Implemented; device/employee acceptance pending | Browser offline and PostgreSQL time/approval checks |
| 4 Catalog, purchasing, stock, migration | Implemented and exercised; SMTP credentials pending | Catalog real-data isolation checks, ZIP/DIESTEIN/cutover evidence |
| 5 Memorial studio | Implemented and exercised | Geometry, exact revision packages, renderer and source provenance |
| 6 Room studio | Implemented and exercised | Shared topology, openings, source import, product dimensions, Undo |
| 7 Assistant and analytics | Implemented and exercised on production | Budget/context tests, actual report snapshots and private exports |
| 8 Deployment and acceptance | Deployed and technically verified | Production schema39; additive onboarding, usage, numbering, feedback, personal appearance and training manifest tables; actual AI/queue/private archive/backup/offline checks |
| 9 Guided training and usage visibility | Implemented and checked | 246 unit tests, 21 PostgreSQL integration checks, browser coverage for personal onboarding, contextual help, monthly AI usage and real number allocation; explicit operator-run test dataset |
| 10 Test feedback and personal appearance | Implemented and checked | 260 unit tests, 29 PostgreSQL integration checks, 20 complete browser flows; private feedback with SuperAdmin triage/export, personal palettes and light/dark/device modes with actual-color previews; see docs/qa/personal-appearance-2026-10-18.md |
| 11 Companion, guided tour and planning usability | Implemented and checked | 276 unit tests, 33 PostgreSQL integration checks; contextual companion, bounded conversation, editable first drafts, actual-page tour, month calendar, manual time, compact navigation, source-bound charts, studio search and 28 sourced manufacturer models; see docs/qa/companion-planning-2026-10-18.md |

Missing operational inputs are tracked in docs/operations/configuration.md. They block their dependent live operation only. No financial, legal, supplier or manufacturing approval may be fabricated.
