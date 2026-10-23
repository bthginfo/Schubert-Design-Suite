# Optionale Schubert-Fachskills – 23.10.2026

## Auftrag und Umsetzung

Vier selbst verfasste, versionierte Fachskills unterstützen die vorhandenen KI-Anwendungen. Die KI entscheidet selbst, ob sie eine Fachhilfe benötigt. Fachlich gilt Deutschland; es wurden keine fremden Expertenpakete, ausländischen Normwerte oder allgemeinen Steuer-/Baustandards übernommen.

| Fachhilfe | Verfügbar für | Inhalt |
|---|---|---|
| Grabmal & Inschrift | Geöffnetes Grabmalstudio | Maßbezug, Nachbeschriftung, exakter Wortlaut, Herstellerbezug, konkrete Friedhofsunterlagen, Schritte Prüfen/Präsentieren |
| Raum & Naturstein | Geöffnetes Raumstudio | Lichte/äußere/Achsmaße, Öffnungen, Bauteile, Kanten/Ausschnitte, unveränderliche Produktmaße, passende technische Unterlagen |
| Herstellerdaten & Unterlagen | Ausdrücklich ausgewählte und serverseitig berechtigte Quellen | Artikel, Einheit, Maßart, Fundstelle/Version, Widersprüche, Preisbasis, OCR- und Bildgrenzen |
| Büro & Entwürfe | Konkreter Bürodatensatz oder aktuelle erlaubte Formularkopie | Verständlichkeit, fehlende Angaben, Leistungsbeschreibung, begrenzte Rückfragen, unveränderte Zahlen und Empfänger |

Die Inhalte liegen als `SKILL.md` unter `skills/`. Ein überprüfter Buildschritt erzeugt ein statisches Serverbundle. Das Bundle wird in `check` und `build` auf Übereinstimmung geprüft. Inhaltsänderungen ändern den Registry-Hash und damit den Anfragecache. Die Produktivfunktion benötigt weder freie Dateizugriffe noch eine Shell oder zusätzliche Infrastruktur.

## Tatsächliche Modellentscheidung

Der Assistent erhält zunächst nur Metadaten der im aktuellen Kontext verfügbaren Fachhilfen. `tool_choice: auto` erlaubt eine direkte Antwort ohne Skill. Eine Fachhilfe wird erst nach einem gültigen Aufruf von `load_schubert_skills` geladen. Die Toolargumente sind streng validiert und auf ein bis zwei unterschiedliche verfügbare IDs begrenzt. Ein Raumskill ist im Grabmalstudio nicht verfügbar; Quellenhilfe ohne ausgewählte Quelle ebenfalls nicht. Dokumente können keine weitere Fachhilfe freischalten.

Nach dem Nachladen erhält eine abschließende, eigenständige Anfrage denselben berechtigten Kontext mit den gewählten Fachanweisungen. Es werden keine Modellgedanken, Teilvorschläge oder unbeschränkten Toolverläufe wiederverwendet. Die abschließende Anfrage besitzt keine Tools. Insgesamt sind höchstens zwei Anbieteraufrufe möglich, ohne automatischen Modellwechsel oder Wiederholungsversuch.

Deutschlandbezug, Berechtigungen, aktuelle Revision, Schrittgrenzen, exakter Wortlaut, Maße, Geometrie-/Quellenprüfung und die bestehenden Vorschlags-/Übernahmeregeln gelten auch ohne optionalen Skill. Skills erteilen keine Normkonformität oder technische Freigabe. Aktuelle konkrete Friedhofssatzungen, Herstelleranweisungen und Fachunterlagen bleiben Quellen des Auftrags.

## Kosten und Fehlerverhalten

Eine atomare Reservierung deckt beide möglichen Anfragen samt Bildreferenzen, Antwortschema und allen im Kontext verfügbaren Fachanweisungen ab. Eine direkte Antwort wird nur mit ihrer tatsächlichen Nutzung abgerechnet; ungenutzte Reservierung wird frei. Bei zwei erfolgreichen Antworten werden Tokens und Cache-Unteranteile addiert. IDs, Versionen und tatsächliche Anbieteraufrufe sind nachvollziehbar gespeichert.

Ein abgewiesener Folgeaufruf macht die bereits abgeschlossene Auswahl nicht kostenlos. Bei unklarem Ausgang bleibt die Kostenobergrenze reserviert. Fehlende Nutzungsdaten werden nicht als Nullkosten behandelt. Identische weitere Anfragen werden auch dann gesperrt, wenn ein zusätzlicher Formatfehler den Laufstatus auf `invalid_response` gesetzt hat und seine Reservierung noch offen ist.

## UX/UI-Prüfung

Die Bedienung benötigt keine neue Auswahl, Einstellung oder Bestätigung. Nur tatsächlich geladene Hilfen erscheinen unter „Verwendete Fachhilfe“ bei ihrer Antwort. Name, Deutschlandbezug und Version sind aufklappbar; Rückfragen und Annahmen stehen davor. Ohne geladenen Skill entfällt die Zeile. Die native Aufklappfunktion besitzt eine mindestens 44 px hohe Bedienfläche und verwendet die bestehenden Farben, Typografie und Formmuster. Das Studio bleibt daneben bedienbar. Die Formularprüfung behält ihren aktuellen Stand, Antworten und Abbruchverhalten.

Prüfperspektiven: Steinmetz in beiden Studios (Wortlaut, Maße, Kontext, Vorschau, Übernahme, Undo), Verwaltungskraft (aktuelle Formularkopie, Rückfragen, keine Speicherung durch KI, erreichbare mobile Aktionen) und UI/UX (Hierarchie, Tastatur, Dark/Light, kleine Viewports, Reduced Motion, Überlauf und Kontrast).

## Verifikation

- 379 Unitprüfungen bestanden, einschließlich 21 neuer Prüfungen zu optionalem Laden, Studio-/Quellenbindung, manipulierten Toolargumenten, Abbruch, Aufrufanzahl, Kostenschätzung und aufsummierter Nutzung.
- 53 echte PostgreSQL-Integrationsprüfungen bestanden. Sechs neue Fälle verwenden das echte OpenAI-SDK mit einem ausschließlich synthetischen, netzfreien Anbietertransport: erfolgreiches Laden plus Cache, direkte Antwort, falscher Studioskill, abgewiesener Folgeaufruf, unklarer Folgeaufruf sowie fehlende Abrechnung mit ungültiger Antwort. Eigene Testläufe sind eindeutig markiert; simulierte Budgetbewegungen werden ausschließlich für diese Testläufe zurückgenommen, alle Evidenzzeilen bleiben erhalten.
- Svelte-/TypeScript-Prüfung: 0 Fehler und 0 Warnungen. Produktionsbuild erfolgreich. Im erzeugten Client-JavaScript sind die Fachanweisungen nicht enthalten.
- Alle 53 Browserabläufe bestanden (9,7 Minuten), einschließlich Steinmetz-/Büroabläufen, Vorschlag/Übernahme/Undo, veralteten Antworten, Herstellerbibliothek, Rollen, responsiven Ansichten und tatsächlichen PDF-/BOM-Ausgaben. Die Fachhilfeanzeige wurde in Studio und Büro ergänzt und geprüft.
- Vier zusätzliche Sichtprüfungen beider Studios in Hell auf Desktop und Dunkel auf 375 px, jeweils mit tatsächlicher gespeicherter Darstellung, Tastaturbedienung der Aufklappfunktion, 44-px-Bedienfläche, 0 Axe-Verstößen, 0 JavaScriptfehlern und keinem Seitenüberlauf. Beide aktuellen fünfseitigen technischen PDFs wurden erneut exportiert; ihre ersten Zeichnungsseiten wurden gerendert und visuell geprüft.
- [Maschinenlesbare Prüfübersicht](optional-fachskills-evidence/verification.json), [UI-Prüfung](optional-fachskills-evidence/ui.json), [Grabmal Desktop](optional-fachskills-evidence/memorial-light.png), [Raum mobil dunkel](optional-fachskills-evidence/room_plan-dark.png), [Grabmal-PDF-Seite](optional-fachskills-evidence/pdf-memorial.png) und [Raum-PDF-Seite](optional-fachskills-evidence/pdf-room.png).

Die Tests belegen Anwendung, Transport, Budget und Bedienung. Sie simulieren Anbieterantworten und belegen keine gemessene Qualitätssteigerung eines Live-Modells. Eine zusätzliche kostenpflichtige Live-Modellbewertung wurde in dieser lokalen Umgebung ohne konfigurierten OpenAI-Schlüssel nicht durchgeführt. Die vorhandene Modellwahl bleibt unverändert.

## Auslieferung und Daten

Ziel ist der bestehende Main-Branch und das bestehende Vercel-Projekt `schubert-design-suite` mit Root `apps/web`. Die Änderung benötigt keine Datenbankmigration und keine Bereinigung von Produktiv- oder Testdaten.
