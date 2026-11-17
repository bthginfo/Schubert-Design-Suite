# Planungsabläufe und Glasoberfläche

Prüfstand vom 17. November 2026. Bestehende Svelte-Anwendung mit synthetischem lokalem Mandanten und echtem PostgreSQL. Die Überarbeitung betrifft den gemeinsamen Seitenrahmen, beide Planungsstudios sowie die Büro- und Einkaufsübersichten. Die Geschäftsregeln und Freigabegrenzen bleiben verbindlich.

## Befund und Umsetzung

| Befund | Änderung |
| --- | --- |
| Navigation, Werkzeuge und Arbeitsinhalt besitzen zu wenig sichtbare Abstufung. | Gemeinsame Glasmaterialien für Seitenleiste, Kopfzeile und schwebende Werkzeuge. Deckende Inhaltsflächen, abgestufte Schatten, kühle Hintergrundaufhellung und Navy im dunklen Modus. Persönliche Akzente bleiben erhalten. |
| Der Projektstart zeigt viele Zuordnungsfelder, bevor die eigentliche Planung beginnt. | Wahl zwischen Maßeingabe und Plan/Foto. Optionale Kunden- und Auftragsfelder aufklappbar. Vorbelegte Beziehungen bleiben sichtbar. Der gewählte Arbeitsschritt öffnet sich nach dem Anlegen direkt. |
| Die Wirkung eingegebener Maße und Schriftangaben ist erst nach dem Einfügen erkennbar. | Proportionale Vorschau für Stein und Raum. Inschriftvorschau aus derselben Layoutfunktion wie der Plan einschließlich Zeichenhöhe, Zeilenabstand, Breitenbegrenzung, Farbe und Position. Fehlende Schriftdateien werden kenntlich gemacht. |
| Aktionen für die aktuelle Auswahl liegen verteilt im Eigenschaftenbereich. | Direkte Auswahlleiste mit Bearbeiten, Einpassen, Duplizieren und Aufheben. Ergänzende Tastenkürzel, bestehendes Rückgängig und serverseitige Speicherung. |
| Zusätzliche Leisten verkleinern den Zeichenbereich. | Kompaktere Projektüberschrift, Schrittleiste und Ansichtsleiste. Die bestehende Prüfung auf eine Zeichenfläche über 1000 × 570 px bei 1440 × 1000 bleibt erfüllt. Vollbild nutzt die tatsächliche Fensterhöhe. |
| Die lokale Steinbibliothek erreicht ältere Einträge außerhalb der vorgeladenen Auswahl nicht. | Ab zwei Suchzeichen wird die vorhandene berechtigte Datenbanksuche verwendet. 300 ms Eingabepause, maximal 30 Treffer und lokaler Cache für wiederholte Suchbegriffe. Quellenangaben kommen mit derselben Antwort. Keine KI-Suche und kein Polling. |
| Büro und Einkauf geben vielen Bereichen dasselbe visuelle Gewicht. | Zwei priorisierte Einstiege, kompakte weitere Bereiche und durchsuchbare Fachaufgaben. Angebote und Rechnungsentwürfe sind direkt anlegbar. Die Abschnittsleiste in Formularen folgt der sichtbaren Position. |

## Verifikation

- `pnpm check` mit 0 Svelte-Fehlern und 0 Warnungen sowie erfolgreicher TypeScript-Prüfung.
- `pnpm test --maxWorkers=4` mit 483 bestandenen Tests in 78 Dateien.
- `pnpm test:integration` mit 107 bestandenen PostgreSQL-Prüfungen, einschließlich Mandantentrennung, Berechtigungen, Versionierung und echter Speicherung.
- Browserprüfung mit realen Rollen, mobilen und Desktop-Ansichten, allen persönlichen Farbpaletten, Hell/Dunkel, Formularfehlern, Kundenbezügen und beiden Studios. Die zugehörigen Fälle stehen in `tests/e2e/liquid-glass-workflows.spec.ts`, `appearance.spec.ts`, `backoffice-usability.spec.ts`, `studio-interaction.spec.ts`, `studio-quality.spec.ts` und `workspace-redesign.spec.ts`.
- 15 Browserfälle erfolgreich. 14 bestanden im gemeinsamen Bestätigungslauf. Der neue Auswahlablauf bestand nach Korrektur des Testselektors und der Einpassen-Funktion im gezielten Nachtest. Er prüft auch echtes Duplizieren, die erneute Speicherung und Auswahl über die Tastatur.
- Die Studiofälle prüfen Maße, Konturen, frei verschiebbare Inschriften, Raster, Fanghilfen, Persistenz, 3D-Kamera, Wandsichtbarkeit und Vollbild. Axe prüft die jeweiligen sichtbaren Oberflächen auf WCAG-Verstöße und die Browserfälle prüfen horizontales Überlaufen.
- Beide frisch exportierten PDFs besitzen fünf Seiten. Front, Seite, Draufsicht, Stückliste und offene fachliche Angaben wurden gerendert und visuell kontrolliert. Innen- und Wandachsmaße bleiben ausdrücklich unterscheidbar.
- Der mechanische Designscan meldet vier Schriftwarnungen für bestehende Inter-/Georgia-Deklarationen und 280 Hinweise zu vorhandenen Farb- und Typografiewerten. Inter bleibt die dokumentierte Produktoberfläche. Die Warnungen sind kein Nachweis eines Funktionsfehlers und wurden nicht durch einen Schriftwechsel verdeckt.

Die erste Browserrunde enthielt zwei lokale Kaltstart-Zeitüberschreitungen. Sie zeigte außerdem den Platzverlust im Zeichenbereich und den auf vorgeladene Materialien begrenzten Katalog. Diese beiden Produktfehler wurden behoben. In der neuen Vorschauprüfung musste ein zu allgemeiner SVG-Testselektor auf die tatsächlich benannte Grafik eingegrenzt werden. Das Einpassen der Auswahl war zunächst an eine unzutreffende CSS-Zustandsklasse gebunden; es liest nun den tatsächlich gesetzten `aria-pressed`-Zustand der Planobjekte.

Screenshots und die frisch gerenderten PDF-Kontrollbilder liegen lokal unter `work/liquid-glass-review`. Die Original-PDFs liegen unter `work/final-studios`. Diese Verzeichnisse bleiben von Git ausgeschlossen.

## Grenzen und Betrieb

Glas ist im Browser mit CSS-Materialien umgesetzt. Bei erhöhter Kontrastanforderung und reduzierter Transparenz wechseln diese auf deckende Flächen. Die Planung und Vorschau erzeugen keine zusätzlichen KI-Aufrufe. Es wurden keine kostenpflichtigen Bildgenerierungen, Produktionsdatenänderungen oder neue Datenbankmigrationen für diese Überarbeitung ausgeführt.

Dies ist eine technische und gestalterische Prüfung mit synthetischen Abläufen. Sie ersetzt keine beobachtete Nutzungsstudie mit Schubert-Mitarbeitenden und keine fachliche Freigabe einer Fertigungszeichnung.

Die Gestaltung folgt insbesondere Apples Trennung von transparenten Navigationsebenen und lesbarem Inhalt. Quellen sind [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios) und [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars).
