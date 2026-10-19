# Modern product redesign — 19 October 2026

## User direction and authority

The user explicitly rejects the previous quiet, flat navy redesign as insufficiently modern. They ask for a visibly modern premium SaaS product, with Apple-like composition, ease and precision. This is a replacement of the visual world, not another layer of minor shadow/color tweaks. Work autonomously; all functionality and training data remain. The user's repeated Apple/SaaS direction is the pinned category-standard preference. No concept selection or new approval round is necessary. Code-led implementation, no generated design comps or new raster assets required.

## Product and audience

Read PRODUCT.md. A German stone business operates CRM, projects, finance, purchasing, stock, personnel, dispatch, time and editable stone/room planning. Office staff and practical workers include people with little digital experience. They need familiar visible text labels, readable inputs, clear choices and recoverable errors. All facts, permissions, records, status meanings, technical approvals and commands remain true. See AGENTS.md. Do not touch domain logic, database, API credentials or paid integrations.

## Direction: a precise, spacious working product

The application should feel designed as one product: a compact, softly tinted navigation rail, a distinct inset workspace, a restrained utility header, strong page typography, comfortable controls and meticulously aligned data. Light mode is cool porcelain; dark mode is deep navy, with separated raised surfaces. Preserve the six user-selected accent families, light/dark/system preferences, readable contrast and physical drawing/material/PDF colors. Accent is selective: current location, primary action and selection. Icons accompany readable text. Use the existing locally hosted Inter and Lucide icons, without fake Apple assets.

FIRST VIEWPORT: At 1440×1000, show a compact branded left rail with clearly grouped navigation, an unobtrusive utility/search row, then a real workspace whose title and main action are immediately obvious. The TEST notice remains truthful and visible, but occupies a compact contextual banner instead of dominating the page. On Today, real appointments, attention-needed tasks and recent orders lead; an oversized generic marketing hero must not push work below the fold. The main workspace has a coherent visual boundary, alignment and useful density. At 375×812, readable headings and actions, no horizontal page overflow, the existing mobile navigation and menu remain usable. On record pages the filter controls clearly belong to the table, which has strong row hierarchy and restrained status badges. Forms use confident, readable labels, inset field surfaces and well-designed disclosure groups. On planning pages tools, tabs and inspector sections look like a purposeful professional editor.

Signature interaction: the current location is carried consistently from the soft selected navigation item through the segmented section navigation to the page title/action area. The real studio full-screen control gives the editable drawing a clean immersive workspace; do not change its behavior.

## Scope and implementation boundary

Implement in the real Svelte application. You may edit shared app.css, the route shell at apps/web/src/routes/[...path]/+page.svelte, appearance neutral tokens (keep the actual tested navy canvas unless there is a compelling reason), and reusable UI components/markup including Dashboard, SectionNavigation, WorkflowGuide, RecordList/Detail/Editor, Settings/Account/Appearance, Studio framing and disclosures. Keep business behavior, accessible names used by tests, data-tour targets, permission conditions, filters, submission handlers, existing responsive and fullscreen functionality. Do not hide functional actions or introduce new fake data. Avoid destructive restructuring of the enormous Studio domain markup; use targeted framing classes and CSS. No new component library or dependencies.

Replace contradictory old visual overrides rather than accumulating arbitrary final overrides. Make a substantial coherent result across shell, dashboard, records, forms, settings and studio, not just a nicer dashboard. Typography must read at a glance. Main surfaces need subtle physical depth and crisp spacing. Avoid giant pill panels, excessive nested cards, decoration gradients, tiny all-caps labels, decorative eye-brows, and ornamental icon tiles. Use whitespace and tonal separation with restrained shadow. Do not recolor physical plan paper or material assets.

## Truth and cost constraints

No extra DB or AI calls, polling, remote runtime fonts or new services. Preserve every TEST record. Do not create or issue business documents or change approval state. The current price/render/provider settings remain unchanged.

## Evidence and handoff

Inspect the incumbent screenshots .impeccable/review/appearance-dark-desktop.png and work/uat-production/dashboard-desktop.png, and the source before editing. Read C:/Users/vonin-ju/.agents/skills/frontend-design/implementation.md (implementation role instructions), the Impeccable craft-floor and mode-operate references. The parent has already loaded the skill/context in this conversation; do not rerun context or start a design-choice server. Implement fully, then run a targeted Svelte check when edits settle. Parent handles full checks, builds, browser verification, release and deployment. Do not run builds or servers concurrently with parent; notify parent when ready. Report exact files changed, composition decisions and verification. Do not commit or deploy. Do not write DESIGN.md/design.json; a separate final documentation handoff will do that.
