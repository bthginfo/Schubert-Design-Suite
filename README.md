# SCHUBERT Design Suite

Deutschsprachige Betriebsanwendung fÃ¼r Kunden, Angebote, AuftrÃ¤ge, Einkauf, Lager, Raum- und Grabmalplanung, Arbeitszeiten, Dokumente, Rechnungen, Kundenportal und Auswertungen.

Svelte5 / SvelteKit3, TypeScript, PostgreSQL mit mandanten- und gesellschaftsbezogener Row Level Security. Private Dateien liegen in Vercel Blob; Neon Ã¼bernimmt die GeschÃ¤ftsdaten. DokumentprÃ¼fung, Blender-Rendering und verschlÃ¼sselte Sicherung laufen in getrennten Vercel-Projekten.

## Start und PrÃ¼fung

Voraussetzungen: Node24.15, pnpm11.25, eine separate Entwicklungsdatenbank und private Entwicklungsablage. `.env.example` beschreibt die Variablen. Zugangsdaten gehÃ¶ren ausschlieÃŸlich in ignorierte Umgebungsdateien beziehungsweise die geschÃ¼tzten Vercel-Einstellungen.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm exec tsx scripts/configure-app-role.ts
pnpm db:seed
pnpm dev
```

Migrationen benÃ¶tigen einen eigenen DatenbankeigentÃ¼mer Ã¼ber `DATABASE_MIGRATION_URL`; der normale Server verwendet ausschlieÃŸlich den eingeschrÃ¤nkten `schubert_app`-Zugang. Testkonten erzeugt `scripts/testing-fixture.ts` in einer gesonderten Testgesellschaft.

```sh
pnpm check
pnpm test
pnpm test:integration
pnpm requirements
pnpm security:check
pnpm build
```

Die CI fÃ¼hrt diese PrÃ¼fungen mit einem kurzlebigen PostgreSQL aus. Reale ProviderprÃ¼fungen und visuelle Abnahmen sind zusÃ¤tzlich in `docs/qa/` dokumentiert. Ein erfolgreiches Build bestÃ¤tigt keine steuerliche, rechtliche oder technische Fertigungsfreigabe.

## Dokumentation

- [Bedienung](docs/bedienung.md): verstÃ¤ndliche Einstiege und typische ArbeitsablÃ¤ufe.
- [Betrieb und Konfiguration](docs/operations/configuration.md): SMTP, KI-Wechsel, Budgets, Freigaben und Dienste.
- [Wiederherstellung](docs/operations/restore.md): Sicherungsgrenzen, isolierter Test und sichere Wiederaufnahme.
- [Architektur](docs/architecture.md), [Anforderungen](docs/requirements.md), [Abnahme](docs/qa/acceptance.md).
- [AbhÃ¤ngigkeiten und Lizenzen](docs/third-party-notices.md), [Versionen](docs/dependencies.json).

Die Ausgangsspezifikation ist als `docs/master-specification.md` erhalten. Abweichungen durch spÃ¤tere Nutzerentscheidungen, insbesondere ausschlieÃŸliche Nutzung von Neon und Vercel Blob, sind in der Betriebsdokumentation festgehalten.

