# Planungsabläufe für Büro und operative Mitarbeitende · 28.10.2026

Agentengestützter Usability-Durchlauf auf der echten Anwendung, mit synthetischen Testkonten und Testplänen. Kein Test mit menschlichen Versuchspersonen. Ausgangsstand: `4975f6d`, Produktion `dpl_7rzsEfTiaQn9mDc8cWYrqQTTLFBh`.

## Aufgaben und Testdaten

- Büro und Mitarbeiter: jeweils Grabsteinplanung mit KI und hochgeladener grober PNG-Skizze sowie manuelle Badplanung.
- Skizze: Rundbogenstele 600 × 900 × 120 mm, Sockel 700 × 140 × 180 mm, synthetische Inschrift „MARIA MUSTER / 1950 - 2025 / In liebevoller Erinnerung“.
- Bad: lichte Innenmaße 3000 × 2400 mm, Höhe 2500 mm, Wandkern 115 mm; Entwurf bleibt ungeprüft.
- Gekennzeichnete Zugänge: `ux.backoffice.20261028@schubert.invalid` und `ux.operativ.20261028@schubert.invalid`. Passphrasen und Sitzungen gehören nicht in dieses Protokoll.

## Reproduzierte Findings und Änderungen

| ID | Schwere | Beobachtung / Reproduktion | Änderung | Nachtest |
| --- | --- | --- | --- | --- |
| U01 | Blockierend | Anmeldung als Büro, Studio öffnen: Navigation fehlt, direkter Aufruf zeigt „Planungszugriff fehlt“. | Planungsrecht standardmäßig für Büro; vom Benutzer am 28.10. ausdrücklich bestätigt. | Ausstehend |
| U02 | Blockierend | Anmeldung als Mitarbeiter, gleicher Versuch: Planung vollständig gesperrt. | Planungsrecht standardmäßig für Mitarbeiter, ohne technische oder finanzielle Freigabe. | Ausstehend |
| U03 | Blockierend | Leeren Grabsteinplan öffnen, PNG-Skizze hochladen/vorbereiten und konkrete Plananlage verlangen: Kostenlimitfehler vor dem Provideraufruf bei 0,02 USD. | Zusätzliche optionale Fachhilfen werden nur angeboten, wenn auch ihr zweiter Aufruf in das bestehende Limit passt. Ansonsten bleibt die normale Planung mit denselben Quellen und demselben Modell verfügbar. Die konservative Ein-Aufruf-Grenze und das Monatsbudget werden weiter geprüft. | Ausstehend |
| U04 | Mittel | Der Kostenfehler nennt weder kalkulierten Betrag noch Limit und empfiehlt ausschließlich kleinere Referenzen. | Echte Überschreitungen nennen Betrag, Limit, fehlenden Provideraufruf, erhaltene Eingaben und mögliche Prüfung durch die Administration. | Ausstehend |
| U05 | Mittel | Raum anlegen, Eigenschaften öffnen: unter X/Y/Z erscheint dreimal `isabled}/>`; die zugänglichen Feldnamen nennen auch bei cm/m immer mm. | Beschädigten Text entfernt und zugängliche Einheit an die sichtbare Auswahl gebunden. | Ausstehend |
| U06 | Blockierend | Nach Anhebung des Limits scheitern zwei echte KI-Versuche an erfundenem Sockel-Verwendungszweck bzw. nicht beschriebenen Schrift-/Positionsfeldern. | Zulässige Kategorien und Koordinaten werden dem Modell ausdrücklich mitgeteilt; gängige Sockelbezeichnungen werden im Grabmalstudio zur vorhandenen Kategorie normalisiert. Unbekannte Angaben bleiben gesperrt; Fehler bieten verständliche deutsche Wiederherstellung ohne interne Schemaausgabe. | Ausstehend |
| U07 | Blockierend | Der echte Büro-KI-Nachtest kann einen Planvorschlag mit syntaktisch ungültigem eingebettetem Änderungs-JSON liefern. | Für leere Grabmalvarianten liefert das Modell einen strikt strukturierten Gesamtentwurf aus Steinform, Maßen, optionalem Sockel, Wortlaut und Materialwunsch. Der Server erzeugt daraus die konkreten Bauteile und lässt in dieser Antwort keine freien JSON-Befehle zu. | Ausstehend |
| U08 | Blockierend | Der echte Mitarbeiter-Nachtest deklariert dasselbe neue Maßkürzel für Stein und Sockel mit unterschiedlichen Werten; der Plan bleibt leer und eine interne Maß-ID erscheint als Fehler. | Der strukturierte Gesamtentwurf vergibt serverseitig eigene IDs. Bei freien Bearbeitungen bleiben wiederverwendete lokale Maßbezeichnungen an ihr neues Bauteil gebunden, ohne vorherige oder vorhandene Planmaße umzuschreiben. | Ausstehend |

Lokale Ausgangsevidenz: `C:/Users/vonin-ju/Documents/ChatGPT/mixed things/schubert-usability-2026-10-28/`. Bildschirmbilder 02/07 belegen KI-Eingabe und Fehler; 04/05 die Rollensperren; 06 das Bad samt Textartefakten. Eine Videoaufnahme war mangels ffmpeg nicht möglich; das Protokoll behauptet keinen vorhandenen Videobeleg.

## Prüfungen und Auslieferung

Der Benutzer hat am 28.10. größere KI-Anfragen ausdrücklich gewünscht. Das Standardlimit wurde im authentifizierten Konfigurationsdialog von 0,02 auf 0,25 USD pro Anfrage erhöht; Monatsbudget 5 USD. Das Modell bleibt gpt-6-luna. Die optionale Fachhilfe bleibt bei ausreichendem Kostenrahmen verfügbar.

Bestätigte lokale Prüfungen:

- `pnpm check`: keine Fehler und keine Svelte-Warnungen.
- `pnpm exec vitest run --maxWorkers 2 --testTimeout 15000`: 443 Tests in 71 Dateien bestanden. Der anfängliche Standardlauf hatte einen lastabhängigen 5-Sekunden-Timeout im unveränderten Vektorimport; dessen gezielter Nachtest und der abschließende Gesamtlauf bestanden.
- `pnpm test:integration`: 92 PostgreSQL-Prüfungen bestanden, einschließlich Erstellen, Speichern und erneutem Laden beider Planarten durch beide Rollen sowie weiterhin gesperrter technischer Freigabe. Die separate Entwicklungsdatenbank wurde zuvor auf die bereits vorhandenen Migrationen 0043–0045 gebracht; die Produktivdatenbank wurde nicht migriert.
- Vier neue Browserabläufe bestanden: Büro auf Desktop, Mitarbeiter bei 390 × 844 px, jeweils Grabmal und Bad, mit echtem Speichern/Neuladen, Einheitenwechsel und automatischer Barrierefreiheitsprüfung ohne Verstöße im Studio. Drei bestanden im Gesamtlauf, der vierte im gezielten Nachlauf nach einem lokalen HMR-Fehler; ein vorheriger Kaltstart-Timeout wurde ebenfalls nachgeprüft.
- Vorher-/Nachher-Bildschirme liegen unter [Evidenz](usability-role-planning-2026-10-28/evidence/).

`pnpm build` ist erfolgreich. Auslieferung und echte KI-Nachtests sind noch in Arbeit. Die lokalen KI-Transporttests verwenden kontrollierte Providerantworten; sie ersetzen den echten Modellaufruf nicht. Produktive Finanz- und Fertigungsfreigaben sind nicht Teil dieser Testpläne.
