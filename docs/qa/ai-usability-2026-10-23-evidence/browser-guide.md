# Independent browser users

Run from `/workspace/Schubert-Design-Suite`. The parent starts the SvelteKit app separately, provisions `work/ai-usability/private/personas.json`, then starts one broker:

```sh
node work/ai-usability/broker.mjs
```

Keep this process alive throughout the study. All users share its Chromium process, with separate browser contexts and persistent live pages. Commands for each user are serialized; different users can run concurrently. The parent limits active testers to six. Restarting the broker loses live pages and unsaved state, so do not restart it between batches.

Each tester uses only their assigned persona ID. Never read the private manifest or application source. Use real visible UI and adapt to the resulting page. A command is:

```sh
node work/ai-usability/browser.mjs PERSONA ACTION '{"key":"value"}'
```

Start with `start` (or `login`). It opens `/login`, fills the assigned email and password privately, and clicks **Sicher anmelden**. It leaves onboarding visible so the tester can explore it. Subsequent commands preserve the current page, authentication, and unsaved modals. `login` navigates to the login page again; use it only for intentional reauthentication. `close` destroys that user's browser context.

Actions return a capped accessibility snapshot, URL, title, and visible links. `inspect` accepts `{"maxChars":16000,"fields":true}` for field labels, IDs, types, values, native options, and visible rectangles. Use `{"scope":{"role":"dialog","name":"Dialog title"}}` to inspect a modal. Password values are redacted.

Targets use accessible roles and exact names by default. Examples:

```sh
node work/ai-usability/browser.mjs PERSONA click '{"role":"button","name":"Speichern"}'
node work/ai-usability/browser.mjs PERSONA fill '{"label":"Projektname","value":"Testprojekt"}'
node work/ai-usability/browser.mjs PERSONA click '{"role":"button","name":"Speichern","scope":{"role":"dialog","name":"Projekt bearbeiten"}}'
node work/ai-usability/browser.mjs PERSONA ownPassword '{"label":"Passwort"}'
node work/ai-usability/browser.mjs PERSONA fill '{"selector":"#reauth-password","ownPassword":true}'
node work/ai-usability/browser.mjs PERSONA press '{"key":"Escape"}'
node work/ai-usability/browser.mjs PERSONA check '{"label":"Bedingungen akzeptieren","checked":true}'
node work/ai-usability/browser.mjs PERSONA select '{"label":"Status","optionLabel":"Entwurf"}'
```

Targets can also use `placeholder`, `text`, or an explicitly observed CSS `selector`. `nth` is a zero-based index for an observed duplicate; scoped targets are preferable. Set `exact:false` only when needed. `press` accepts Playwright keyboard names such as `Tab`, `Shift+Tab`, `Enter`, `ArrowDown`, and `Control+a`; add a target to focus a specific field. For a custom dropdown, click its visible button then click the observed option or use the keyboard. `select` applies only to native `<select>` elements and accepts `value`, `values`, or `optionLabel`.

Other commands:

- `scroll {"y":650}`; a target instead scrolls that element into view.
- `viewport {"width":390,"height":844}`.
- `offline {"enabled":true}` and `offline {"enabled":false}`.
- `wait {"ms":1000}`; waits are capped at 2000 ms.
- `screenshot {"fullPage":false}` returns an absolute local PNG path for `tools.view_image`. Any action can add `"screenshot":true`. Errors also attempt a screenshot. Password fields are masked in screenshots.
- `goto {"href":"/observed/path"}` permits only same-origin hrefs already seen in a prior snapshot. Prefer clicking visible links.
- `back {}` and `forward {}`.
- `upload {"selector":"input[type=file]","file":"/workspace/Schubert-Design-Suite/work/ai-usability/synthetic/example.txt"}`. Explicitly create harmless synthetic files under that directory before uploading. No other local file paths are accepted.
- `dialogAccept {}` or `dialogDismiss {}` responds to a native browser dialog. DOM modals use normal clicks.
- `close {}` ends the user's session after evidence is complete.

Screenshots, downloaded UI files, and redacted action/error/network events stay in `work/ai-usability/evidence/PERSONA/`. Network evidence stores only method, path, and error/status; no bodies, cookies, headers, or credentials. Arbitrary JavaScript evaluation, direct API calls, cross-origin navigation, database access, and application-source inspection are outside this harness. If a command fails, use the evidence and current visible UI to choose the next action; do not treat command failures alone as product failures.
