# Architecture

Modular monolith. SvelteKit is a request and UI adapter. packages/contracts defines shared validation and module metadata; domain and geometry are framework-independent. Application coordinates server-authorized transactions. Node pg pooled connections provide real transactions; Drizzle defines typed relational tables. Each tenant operation uses transaction-local context and FORCE RLS; a separate migration principal owns DDL.

Commands atomically persist their business effects, hash-bound idempotency receipt, audit and outbox. A persisted PostgreSQL job orchestrator provides leases, fencing, retries and checkpoints. External adapters are isolated and report unavailable or unknown outcomes honestly. Immutable document revisions reference content hashes and audience-specific artifacts. No universal table CRUD endpoint.

Private Vercel Blob is operational storage. The user selected Vercel-only archival: private originals, readback hashes, application retention guards and an independent encrypted private Blob backup. This is not provider WORM/Object Lock. Production finance is gated on verified archival and validated e-invoice formats. Missing integrations never become simulated success.
