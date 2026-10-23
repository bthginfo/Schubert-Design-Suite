# Product

<!-- impeccable:product-schema 1 -->

## Platform

Web application, including mobile browser and offline time entry.

## Users

Schubert employees in office, planning, purchasing, dispatch and practical work; business management; the personal Superadmin. The user explicitly requires guidance suitable for people who are not digital natives. Customers receive the separately permissioned portal workflows.

## Product Purpose

Connect customer work, business documents, staff coordination and editable stone/room planning in one German-language application. Preserve traceable source data, exact plan revisions and explicit approval of consequential changes.

## Operating Context

The application serves the Schubert stone business described in docs/master-specification.md. It includes memorials, inscriptions, floor plans and natural-stone components. Plans, photos, manufacturer products, dimensions, materials, quotations and invoices are parts of the work. The user is currently conducting a staff test phase and has requested clearly labeled demonstration data that remains until they explicitly authorize removal.

## Capabilities and Constraints

- CRM, quotations, orders, billing, payments, purchasing, catalog, stock, private documents, personnel, dispatch, time and reporting are connected through authenticated backend commands.
- Planning stays editable and versioned. Technical views, PDFs and generative images have distinct purposes. Published documents and technical releases require their configured evidence and permissions.
- Both planning studios offer four explicit work steps. AI receives the saved live revision, selection, dependent geometry and task-specific instructions. Review/output stages cannot generate planning changes; failed saves stop model requests.
- A private manufacturer library accepts actual plans, contours, reference images, data sheets and 3D originals. SuperAdmin can delegate its independent management permission. Published sources are immutable, scoped to one or both studios, and carry separate planning/AI usage grants. Technical product verification remains a separate step.
- Office forms expose section shortcuts, exact draft totals and an optional review of bounded current inputs. The AI review cannot save business records and excludes old persisted lines and internal costs.
- The callable companion offers local page help, contextual chat and explicit proposals. Guided onboarding visits real pages, can resume/restart, and ends with personal color and light/dark preferences.
- Feedback during testing is optional at tenant level; the Superadmin reviews comments with page and privacy-filtered preceding actions. No typed field contents are collected as action history.
- Vercel Pro, Neon Free and private Vercel Blob are the user's chosen hosted services. Avoid unnecessary queries, polling and model usage. No arbitrary monthly count of image renders and no automatic credit recharge.
- OpenAI is accessed through replaceable Superadmin settings, with usage/cost reporting and explicit image-cost confirmation. SMTP is to be supplied by the operator in settings. Current operational prerequisites are tracked in docs/operations/configuration.md.
- The initial sourced manufacturer selection contains 28 base models from three brands. Unverified dimensions, availability, prices and manufacturing suitability must remain explicit rather than invented.
- The current browser tests use synthetic data and explicitly stub expensive chat responses; they do not establish the visual quality of new generated images. Actual provider checks and their scope are recorded separately in docs/qa/acceptance.md and later dated QA reports.

## Voice and Brand Commitments

German interface and business documents. Clear actions, practical explanations and visible recovery from errors. The user asks for premium SaaS quality and Apple-like clarity while allowing each person to choose their own accent and display mode. DESIGN.md records the incumbent visual system.
