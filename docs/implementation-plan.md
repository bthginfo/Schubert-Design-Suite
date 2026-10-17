# Implementation plan — 2026-10-17

Full scope: docs/master-specification.md. Empty upstream repository inspected. Dedicated Vercel project schubert-design-suite created in the connected account; no existing Schubert marketing project modified.

| Stage | Status | Evidence |
|---|---|---|
| 0 Foundation and requirements | Implemented and checked | Source specification, requirements matrix, CI, dependency baseline |
| 1 Identity, commands, DB, outbox, private files | Implemented and exercised | 15 real PostgreSQL transaction/isolation checks; malware/private-file tests |
| 2 CRM, sales, billing, payments, portal | Implemented; operational profiles pending | Browser flows, full finance/XRechnung/DATEV/private originals |
| 3 Workforce and offline PWA | Implemented; device/employee acceptance pending | Browser offline and PostgreSQL time/approval checks |
| 4 Catalog, purchasing, stock, migration | Implemented and exercised; SMTP credentials pending | Catalog real-data isolation checks, ZIP/DIESTEIN/cutover evidence |
| 5 Memorial studio | Implemented and exercised | Geometry, exact revision packages, renderer and source provenance |
| 6 Room studio | Implemented and exercised | Shared topology, openings, source import, product dimensions, Undo |
| 7 Assistant and analytics | Implemented; production AI smoke pending | Budget/context tests, actual report snapshots and private exports |
| 8 Deployment and acceptance | In progress | Production schema32 verified; final application build/deployment pending |

Missing operational inputs are tracked in docs/operations/configuration.md. They block their dependent live operation only. No financial, legal, supplier or manufacturing approval may be fabricated.
