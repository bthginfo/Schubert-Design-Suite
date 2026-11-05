# KI-Qualität, Fachabfragen und Planungsablauf

## Suite-Chat

Der Assistent ist auf internen Seiten und im Studio-Vollbild verfügbar. **Mit Seitenbezug** berücksichtigt den geöffneten Vorgang oder die gespeicherte Planvariante. **Suite-Chat** führt ein eigenes Gespräch über Seitenwechsel hinweg. Geschützte Personal- und Einstellungsseiten öffnen den Suite-Chat ohne die Daten der angezeigten Akte.

In beiden Ansichten kann der Assistent berechtigte Kunden, Aufträge, Belege, Einsätze, Artikel, Unterlagen und Planvarianten nachschlagen. Der Chat verlinkt gefundene Vorgänge. Die Einsatzabfrage löst Person und Auftrag gemeinsam auf. Bei mehreren passenden Treffern klärt der Assistent den Bezug vor einer Änderung. Die Abfragen laden begrenzte Ausschnitte aus dem aktuellen Datenstand.

Angebote, Rechnungen und Einsätze lassen sich als Entwürfe vorbereiten und nach der Vorschau speichern. Die Fachlogik berechnet Belegpositionen und prüft Einsätze auf Überschneidungen. Eine Änderung an einer anderen Planvariante erhält eine Vorher-nachher-Vorschau gegen ihre genaue Revision. Ausstellung, Versand, verbindliche Einsatzbestätigung und Fertigungsfreigabe erfolgen im Fachdialog. Der Verbrauch wird nach der ausgeführten Aufgabenart erfasst.

Die Suite verwendet weiter die vorhandene Responses-Integration. Standardaufgaben bleiben beim konfigurierten günstigen Modell; eine vertiefte Designprüfung erfolgt nur nach ausdrücklicher Auswahl. Es gibt keinen zusätzlichen Agentendienst und keine automatische Eskalation zu einem teureren Modell.

## Qualität vor Modellwechseln

`pnpm ai:quality` prüft zehn synthetische Aufgaben anhand deterministischer Positivkontrollen. Dazu gehören lichte Raummaße in cm/m, tatsächliche Materialstärke und Volumen, exakter Inschriftwortlaut, fehlende Maße, geschützte Texte, Bedienhilfe und Anweisungen in fremden Dokumenten. Die Entwürfe werden mit derselben Geometrie- und Bearbeitungslogik wie im Produkt ausgeführt. Negative Unit-Testkontrollen müssen falsche Maße, erfundene Freigaben und unzulässige Aktionen erkennen.

Dieser Offline-Lauf prüft den Bewertungsvertrag. Er misst **keine Modellqualität**. Er läuft ohne OpenAI-Zugang und ohne Anbieteraufruf auch in CI.

Ein echter synthetischer Modellvergleich startet mit `pnpm ai:quality --live --label <laufname>`. Der Testschlüssel wird über OpenAI Developers sicher in der ignorierten `.env.ai-eval.local` eingerichtet. Keine echten Kundenunterlagen verwenden. Der Bericht enthält Regeln, Modell, Token, Aufrufanzahl, Laufzeit und konfigurierte Kostenschätzung; keine Zugangsschlüssel oder Kundeninhalte. Die Berichte liegen unter `work/ai-quality-*.json`.

`--tools` wählt zwei zusätzliche kontrollierte Fälle für tatsächliche Werkzeugwahl und Faktennutzung. `--case <fall-id>` begrenzt eine gezielte Nachprüfung auf einen bekannten Fall. Die synthetischen Antworttexte können für die fachliche Sichtprüfung im Bericht stehen. Das gemeinsame Kostenbuch gilt für alle Varianten und Wiederholungen.

Das gemeinsame lokale Kostenbuch `work/ai-quality-cost-ledger.json` begrenzt **alle** echten Testläufe zusammen auf zunächst 0,50 USD. Es reserviert vor einem Aufruf dessen konservative Obergrenze. Teilweise abgeschlossene Aufrufe werden erfasst; unklare Ergebnisse behalten ihre Reservierung. Ein exklusiver Lock verhindert parallele Testläufe. Kostenbuch oder verwaiste Locks niemals automatisch löschen, um einen weiteren Lauf zu ermöglichen. Die Preise bleiben Konfigurationsschätzungen und sind keine Anbieterrechnung.

Optik, fotorealistische Bildqualität und fachliche Richtigkeit einer Herstellerquelle brauchen zusätzlich eine visuelle bzw. fachliche Abnahme. Ein bestandener Geometrietest ersetzt diese nicht.

## Wiederholbare lokale Browserabnahme

Der zusätzliche Browserfall `assistant-read-tools.spec.ts` verwendet den echten Companion, die echte API, den eingeschränkten PostgreSQL-Zugang und das echte OpenAI-SDK. Nur die Anbieterantworten kommen aus einem ausdrücklich lokalen Transport. Der Fall ist ohne `UAT_AI_TOOL_PROVIDER=synthetic-local` übersprungen, um bei einer allgemeinen UAT keine echten Anbieteraufrufe auszulösen.

Nach Migration, `scripts/configure-app-role.ts`, `scripts/testing-fixture.ts` und `pnpm build` in getrennten lokalen Terminals starten:

```powershell
node --env-file=.env scripts/testing-ai-provider.mjs

$env:OPENAI_BASE_URL='http://127.0.0.1:8854/v1'
node --env-file=.env scripts/testing-built-server.mjs

$env:UAT_BASE_URL='http://127.0.0.1:5186'
$env:UAT_AI_TOOL_PROVIDER='synthetic-local'
pnpm exec playwright test tests/e2e/assistant-read-tools.spec.ts
```

Beide Server verweigern Vercel/Produktion; der Browser-Testserver verlangt zusätzlich eine Datenbank und einen Anbietertransport auf Loopback. Er setzt das tatsächliche HTTP-Schema für den gebauten Node-Adapter, ohne die Herkunftsprüfung abzuschalten. Die produktive Vercel-Konfiguration bleibt separat. Reale Modellqualität wird ausschließlich am offiziellen OpenAI-Endpunkt bewertet.

## Fachabfragen bei Bedarf

Im geöffneten Planungsprojekt kann das Modell zwei schreibgeschützte Werkzeuge auswählen:

| Werkzeug | Umfang | Verwendung |
| --- | --- | --- |
| `lookup_planning_catalog` | Bis zu sechs tatsächliche Produkt-, Material- oder Schriftreferenzen | Konkrete Auswahlfrage, deren Referenzen im bestehenden Kontext fehlen |
| `inspect_current_plan` | Berechnete Mengen, Materialstärken, Volumen und offene Prüfgrundlagen der gespeicherten Revision | Mengen- oder Prüfungsfrage, die der bestehende Kontext nicht beantwortet |

Jede tatsächliche Fachabfrage prüft aktuelle Mitgliedschaft, Berechtigungsstand, Rechtsträger, Projekt, Variante, Revisions-ID, Versionsnummer und Inhaltshash. Modellargumente enthalten weder Mandant noch Benutzer, Plan-ID oder frei abrufbare URL. SQL-Parameter sind gebunden. Gesperrte Bereiche und veraltete Planstände werden abgewiesen.

Ergebnisse enthalten nur freigegebene Felder, keine Einkaufspreise oder internen Notizen. Öffentlich dokumentierte Herstellerreferenzen bleiben als `technicalApproval: false` gekennzeichnet. Das Gesamtresultat jeder Abfrage bleibt unter 5.000 UTF-8-Bytes; entfernte Datensätze sind ausdrücklich markiert. Eine Auswahl beschränkt die Mengenzeilen; Gesamtplanprüfungen sind als solche bezeichnet.

Der erste Modellaufruf kann passende Fachanweisungen und höchstens zwei erforderliche Abfragen gemeinsam auswählen. Identische Abfragen innerhalb dieser Antwort werden einmal ausgeführt. Der abschließende Aufruf erhält nur den autorisierten Ausgangskontext und die begrenzten Fakten. Danach sind keine Werkzeuge mehr zugelassen. Es gibt insgesamt höchstens zwei kostenpflichtige Modellaufrufe; eine direkte Antwort benötigt nur einen. Das Modell lädt bei einfachen Bedienfragen keine Fachabfrage.

Die Kostenreservierung berücksichtigt beide möglichen Modellaufrufe und die maximalen Werkzeugergebnisse. Passt diese Obergrenze nicht ins Anfragelimit, entfallen die optionalen Fachanweisungen und Abfragen; eine direkte Antwort bleibt möglich, wenn deren Obergrenze passt. Fehlende Daten müssen dann sichtbar fehlen. Kein automatischer Wiederholungsaufruf bei Limitfehlern oder unklarem Ausgang.

`ai_runs.usage_details` erfasst Anbieteraufrufe und Token sowie Namen, Ergebnisanzahl, Dauer und Wiederverwendung der Fachabfragen. Suchbegriffe und vollständige Werkzeugresultate werden dort nicht protokolliert. Konkrete Vorschläge behalten begrenzte, versionsgebundene Fakten in ihrem Prüfkontext. Die vorhandene Token- und Kostenübersicht zählt beide Anbieteraufrufe gemeinsam.

## Leichter vom Wunsch zum bearbeitbaren Entwurf

Der Assistent erhält einen kompakten aktuellen Arbeitsstand: leerer Plan, zu korrigierender Entwurf oder bearbeitbares Konzept, dazu Arbeitsschritt, vorhandene Grundform und Inschrift. Diese Fakten benötigen keinen zusätzlichen Datenbank- oder Modellaufruf.

Für einen ausdrücklich gewünschten Konzeptentwurf fragt er nur nach tatsächlich benötigten Maßen, Wortlaut oder Quellen. Fehlende Herstellungsnachweise sollen einen bearbeitbaren Entwurf nicht unnötig blockieren. KI-Maße bleiben ungeprüft; Inschriftgrenzen, Auswahlgrenzen und geschützte Maße werden weiterhin deterministisch geprüft. Verbindliche Transaktionen und Fertigungsfreigaben bleiben ausdrückliche, berechtigte Benutzeraktionen.
