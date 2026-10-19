# Abnahme der modernen Produktoberfläche

Stand: 19.10.2026. Geprüft wurde die kompilierte Anwendung gegen den echten PostgreSQL-Testmandanten. Diese Änderung betrifft Darstellung und Informationshierarchie; Datenmodell, Geschäftsbefehle, Berechtigungen und Freigaben bleiben unverändert.

## Ergebnis und Umfang

Die Oberfläche verwendet einen kompakten Navigationsbereich, einen eingesetzten Arbeitsraum, Porzellan im Hellmodus und abgestufte Navy-Flächen im Dunkelmodus. Aufgaben und Aufträge stehen auf der Startseite vor den Kennzahlen. Filter und Tabellen bilden eine gemeinsame Fläche. Einstellungen, Formulare, Bereichswechsel und Studio-Bedienleisten folgen denselben Abständen und Oberflächenregeln. Feedback und Assistent erhalten auf dem Desktop einen reservierten Bereich, damit sie keine Tabellenaktionen verdecken. Alle sechs persönlichen Akzentfamilien und Hell/Dunkel/Geräteeinstellung bleiben erhalten.

## Ausgeführte Prüfungen

- `pnpm check`: keine Svelte-Fehler oder Warnungen; TypeScript-Prüfung erfolgreich.
- 322 Unit-Tests in 53 Dateien erfolgreich. 37 echte PostgreSQL-Integrationsprüfungen erfolgreich.
- Vollständige Browserrunde: 28 von 28 Fällen erfolgreich. Enthalten sind gespeicherte Formulare und Referenzen, Dezimalbeträge, Fehlerbehandlung, Schutz ungespeicherter Eingaben, Rollenrechte, mobile Offline-Zeitbuchung, persönliche Darstellung, Feedback, die vollständige Einführung, Assistent, Monatsdisposition, KI-Verbrauch sowie bearbeitbare Grabmal- und Raumplanung mit Export.
- Nach der isolierten Schattenkorrektur wurden die beiden Darstellungsfälle erneut erfolgreich ausgeführt. Sie prüfen alle Akzentfamilien, tatsächliches Speichern und Wiederladen, den automatischen Gerätewechsel, dunkle Fachformulare, Feedback und Studio einschließlich unverändert hellem Zeichenpapier. Die nachfolgende mobile Filterkorrektur wurde gesondert geprüft.
- Die ergänzende schreibgeschützte Prüfung umfasste zehn Bereiche auf Desktop und Mobilgerät in Hell und Dunkel sowie Formulare und den geöffneten Editor: 44 Prüfungen erfolgreich, 19 visuell geprüfte Aufnahmen. Keine horizontalen Seitenüberläufe; keine schwerwiegenden oder kritischen automatisierten WCAG-Befunde in den auditierten Ansichten. Keine JavaScript-Fehler, Geschäftsschreibvorgänge oder KI-Aufrufe in dieser Prüfstrecke.
- Die Schattenvariablen wurden in echtem Chromium geprüft: gültige CSS-Syntax und tatsächlich berechnete Schatten an Dialog, aktiver Bereichsauswahl, Feedback und Assistent in beiden Modi. Die ursprüngliche Verwendung von `light-dark()` um vollständige Schattenwerte war ungültig und wurde auf adaptive Schattenfarben korrigiert.
- Die abschließende mobile Filterkorrektur wurde bei 375 und 390 CSS-Pixeln sowie bei 1440 Pixeln in beiden Modi geprüft. Status und Anwenden stehen wieder nebeneinander, der erste Datensatz beginnt sichtbar oberhalb der unteren Navigation. Suche und Anzahl behalten eigene Zeilen. Kein Seitenüberlauf und keine schwerwiegenden oder kritischen automatisierten WCAG-Befunde im Datensatzbereich.
- Grabmal und Raumplanung erzeugten echte fünfseitige PDFs. Gerenderte Grabmal-Frontansicht und Raumansichten wurden auf lesbare Maße, Konturen, Türanschlag, Maßstab und Revisionsangaben geprüft. Vollbild, Schriftpositionierung, Raster, 3D und Stücklistenexport sind durch die Browserfälle abgedeckt.
- Abschließender Produktionsbuild erfolgreich. Die Quelltextprüfung auf Zugangsschlüssel (593 Dateien) und `git diff --check` waren erfolgreich.

## Befunde und Grenzen

Die erste Browserrunde fand einen realen Kontrastfehler an der dunklen Studio-Beschriftung; dieser ist behoben. Zwei weitere Fehlschläge betrafen einen fest verdrahteten Testport. Die betroffenen Tests verwenden jetzt die tatsächlich konfigurierte lokale Adresse, statt versehentlich eine andere Anwendung zu prüfen. Die finale Gesamtrunde bestand alle Fälle.

Die zusätzliche CI-Runde fand anschließend eine veraltete Hellmodus-Farberwartung im bestehenden Unit-Test. Der Test prüft jetzt die neue Porzellanfläche und auch die zusätzliche Navy-Arbeitsfläche. Danach bestanden lokal erneut alle 322 Unit-Tests; Anwendungsquelltext und bereits geprüfte Ansichten wurden dadurch nicht verändert.

Die unabhängige Designprüfung und ihre begrenzten Nachprüfungen behandelten die Sichtbarkeit der Arbeit auf der Startseite, Studio-Beschriftungen, Kontrast, Filterdichte, verdeckte Aktionen, Dokumentationskonsistenz und die Schattenkorrektur. `DESIGN.md` und `.impeccable/design.json` wurden mit dem finalen Quelltext abgeglichen.

Die Prüfung verwendet Chromium/Edge und ersetzt keinen Test auf jedem realen Mobilgerät. Sie bescheinigt die genannten Abläufe und Ansichten, keine allgemeine Fehlerfreiheit. Bezahlte KI-Bilderstellung wurde in dieser visuellen Änderung nicht erneut ausgelöst. Vorhandene TEST-Daten bleiben erhalten. Es entstehen keine zusätzlichen laufenden Datenbankabfragen, KI-Aufrufe, externen Schriftabrufe oder Dienste durch die Umgestaltung.
