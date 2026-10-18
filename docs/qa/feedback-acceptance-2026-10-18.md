# Feedback-Erweiterung · Abnahme am 18.10.2026

## Geprüfter Umfang

Schwebender Feedback-Button auf internen Seiten, Kommentar und optionales erwartetes Verhalten, minimierter Seiten-/Aktionskontext, ausschließlich persönliche Mitarbeiterzugänge, Superadmin-Schalter und Übersicht, Status/Priorität/Notizen, unverändertes Original und strukturierter Markdown-/JSON-Export. Keine KI-Verarbeitung und keine laufenden Diagnose-Uploads.

## Ergebnisse

- Typ- und Svelte-Prüfung: keine Fehler oder Warnungen. Produktionsbuild erfolgreich.
- 253 Unit-Tests erfolgreich, einschließlich URL-Minimierung, strikt erlaubter Diagnosefelder, begrenztem Verlauf, Ablauf nach 15 Minuten, Trennung beim Benutzerwechsel und direktem Planungs-Speichervorgang ohne Eingabeinhalte.
- 27 echte PostgreSQL-Integrationsprüfungen erfolgreich. Feedback umfasst aktuelle Superadmin-Berechtigung, idempotente Einsendung, eigenen Absender, Sperre für Owner/andere Mitarbeiter, Mandanten-/Einheitsgrenzen, unveränderliches Original, Versionskonflikte, Export, Seitenwechsel mit Mikrosekunden-Präzision, Originalreferenz beim isolierten Wiederherstellen und sofortige serverseitige Sperre nach Abschalten.
- Gesamtdurchlauf: 18 Browserabläufe erfolgreich. Enthalten sind Feedback, KI-Verbrauch, Hilfe/Onboarding, Nummernkreise, Kunden/Anfragen/Angebote, schmale Formulare, Tastaturbedienung, Mitarbeiterrechte, Offline-Zeiten sowie Grabmal- und Raumplanung einschließlich echter PDF- und Stücklistenausgaben.
- Nach den abschließenden Änderungen drei betroffene Browserabläufe erneut erfolgreich: Feedback-Dialog und Verwaltung, Rollen/Schalter sowie Grabmal-/Raumplanung. Speichervorgänge im Studio erscheinen mit Ergebnis im optionalen Feedback-Kontext. Der Fachformularentwurf bleibt beim darüber geöffneten Feedback-Dialog erhalten.
- Bildschirmprüfungen bei 1440 × 1000 und 375 × 812 Pixeln; kein horizontaler Überlauf, keine als schwerwiegend/kritisch bewerteten automatischen Barrierefreiheitsbefunde in den neuen Oberflächen. Mobile Netzwerkfehler, erneutes Senden mit identischem Schlüssel, Einordnungsfehler und erfolgreiche Speicherung wurden samt sichtbarer Meldungsposition geprüft.
- Quellenprüfung auf versehentlich veröffentlichte Zugangsdaten erfolgreich. Produktionsschema vor Veröffentlichung des Servers auf 38 Migrationen mit geprüften Prüfsummen aktualisiert; das Wartungsprojekt anschließend wieder von der Datenbank getrennt.

## Unabhängige UX-Prüfung

Die erste Prüfung bestätigte die bestehende Schrift-, Farb- und Formularsprache und fand zwei materielle Punkte: Fehler im Feedback-Dialog und Ergebnis einer Einordnung konnten außerhalb des sichtbaren Scrollbereichs liegen. Beide wurden korrigiert. Der erneute Reviewer-Durchlauf bewertete beide Punkte anhand neuer Aufnahmen als **resolved**, Disposition **ship** für diese geprüften Korrekturen. Das ist keine pauschale Garantie für alle möglichen Nutzungssituationen.

## Betrieb und Grenzen

Es wurden ausschließlich synthetische Daten im isolierten Entwicklungstestmandanten für die umfassenden Schreibtests verwendet. Die anschließende Produktionsprüfung verwendet eine ausdrücklich als Abnahmetest gekennzeichnete Rückmeldung. Bestehende Schubert-Testdaten werden nicht entfernt.

Produktive fachliche Entscheidungen bleiben beim Betrieb: SMTP, persönliche Nutzer, bestätigte Betriebs-/Steuer-/Bankdaten, Startstände der Nummernkreise sowie Rechnungs-, Vertrags-, DATEV- und Fertigungsfreigaben. Feedback erteilt keine automatische Umsetzungsfreigabe. Der jeweilige Umsetzungsauftrag muss separat erfolgen.

Bedienung und Datenumfang: [Feedback im Testbetrieb](../operations/feedback.md).
