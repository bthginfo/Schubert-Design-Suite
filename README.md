# SCHUBERT Design Suite

Deutschsprachige Betriebsanwendung für Kunden, Angebote, Aufträge, Einkauf, Lager, Raum- und Grabmalplanung, Arbeitszeiten, Dokumente, Rechnungen, Kundenportal und Auswertungen.

Svelte5 / SvelteKit3, TypeScript, PostgreSQL mit mandanten- und gesellschaftsbezogener Row Level Security. Private Dateien liegen in Vercel Blob; Neon übernimmt die Geschäftsdaten. Dokumentprüfung, Blender-Rendering und verschlüsselte Sicherung laufen in getrennten Vercel-Projekten.

## Start und Prüfung

Voraussetzungen: Node24.15, pnpm11.25, eine separate Entwicklungsdatenbank und private Entwicklungsablage. `.env.example` beschreibt die Variablen. Zugangsdaten gehören ausschließlich in ignorierte Umgebungsdateien beziehungsweise die geschützten Vercel-Einstellungen.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm exec tsx scripts/configure-app-role.ts
pnpm db:seed
pnpm dev
```

Migrationen benötigen einen eigenen Datenbankeigentümer über `DATABASE_MIGRATION_URL`; der normale Server verwendet ausschließlich den eingeschränkten `schubert_app`-Zugang. Testkonten erzeugt `scripts/testing-fixture.ts` in einer gesonderten Testgesellschaft.

```sh
pnpm check
pnpm test
pnpm test:integration
pnpm requirements
pnpm security:check
pnpm build
```

Die CI führt diese Prüfungen mit einem kurzlebigen PostgreSQL aus. Reale Providerprüfungen und visuelle Abnahmen sind zusätzlich in `docs/qa/` dokumentiert. Ein erfolgreiches Build bestätigt keine steuerliche, rechtliche oder technische Fertigungsfreigabe.

## Dokumentation

- [Bedienung](docs/bedienung.md): verständliche Einstiege und typische Arbeitsabläufe.
- [Betrieb und Konfiguration](docs/operations/configuration.md): SMTP, KI-Wechsel, Budgets, Freigaben und Dienste.
- [Wiederherstellung](docs/operations/restore.md): Sicherungsgrenzen, isolierter Test und sichere Wiederaufnahme.
- [Architektur](docs/architecture.md), [Anforderungen](docs/requirements.md), [Abnahme](docs/qa/acceptance.md).
- [Abhängigkeiten und Lizenzen](docs/third-party-notices.md), [Versionen](docs/dependencies.json).

Die Ausgangsspezifikation ist als `docs/master-specification.md` erhalten. Abweichungen durch spätere Nutzerentscheidungen, insbesondere ausschließliche Nutzung von Neon und Vercel Blob, sind in der Betriebsdokumentation festgehalten.
