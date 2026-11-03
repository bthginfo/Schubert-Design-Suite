# KI-Qualität und Fachwerkzeuge · 03.11.2026

Die Suite verwendet die vorhandene Responses-Integration weiter. Der Standard bleibt beim konfigurierten günstigen Modell; eine vertiefte Prüfung wird ausdrücklich ausgewählt. Neu sind zwei begrenzte, schreibgeschützte Datenwerkzeuge für echte Bibliothekstreffer und berechnete Planwerte. Die KI erteilt keine fachliche Freigabe und führt keine verbindlichen Geschäftsvorgänge selbst aus.

## Nachweise

| Prüfung | Ergebnis |
| --- | --- |
| Unit-Tests | 469 bestanden in 75 Dateien; einschließlich Negativkontrollen für Geometrie, Wortlaut, tatsächliche Fachabfrage, falsche Fakten und das gemeinsame Testkostenbuch |
| PostgreSQL | 101 Prüfungen bestanden mit PostgreSQL 17.11 und eingeschränkter Anwendungsrolle; reale Transaktionen, RLS, entzogene Rechte, echte neue Revisionen, sechs begrenzte Suchtreffer, ausgeblendete interne Notizen und Abrechnung beider SDK-Aufrufe |
| Echter Modelltest: Planung | Alle zehn Fälle im finalen Lauf bestanden; gpt-6-luna, 17 Anbieteraufrufe, 86.081 Eingabe- und 1.764 Ausgabetokens |
| Echter Modelltest: Fachabfragen | Beide Fälle bestanden; tatsächliche Werkzeugwahl durch gpt-6-luna, berechnetes Steinvolumen und korrekter synthetischer Katalogtreffer; vier Anbieteraufrufe, 26.855 Eingabe- und 321 Ausgabetokens |
| Modell-Testkosten | Alle Entwicklungs- und Wiederholungsläufe zusammen 0,034555965 USD nach konfiguriertem Preisprofil; keine offene Reservierung. Gemeinsame Obergrenze 0,50 USD. Dies ist eine Kostenschätzung anhand der gemeldeten Tokens, keine bestätigte Anbieterrechnung. |
| Browser | Sieben Assistenten-/Multimodalfälle bestanden im gemeinsamen Abschlusslauf; der dabei gefundene Studiofehler wurde behoben und der achte Fall danach bestanden, einschließlich beider Studios auf Desktop und Mobilgerät. Kein fehlerfreier gemeinsamer Achterlauf wird behauptet. |
| PDFs | Beide tatsächlich exportierten Studio-PDFs mit jeweils fünf Seiten erzeugt, gerastert und visuell geprüft; Innen-, Achs- und Außenmaßbezüge, Materialstärke, Entwurfsstatus und lesbare Fußtexte vorhanden |
| Svelte / TypeScript und Build | Erfolgreich; zusätzliche abschließende CI prüft denselben veröffentlichten Quellstand |

Die zehn Planungsfälle prüfen wörtliche Inschriften mit `*`/`†`, Steinmaterialstärke, lichte Raummaße in cm/m, fehlende Maße, uneindeutige Maßbasis, Textänderung, aktivierte Wortlautsperre, Bedienhilfe und Anweisungen aus fremden Dokumenten. Die zusätzlichen Modellfälle verwenden kontrollierte synthetische Fakten. Sie ersetzen keine fachliche Prüfung eines echten Herstellerartikels.

Die ersten Offline-Positivkontrollen sind ausdrücklich keine Modellmessung. Die echten Läufe sind in `work/ai-quality-release-core.json` und `work/ai-quality-release-factual.json` dokumentiert. Das gemeinsame Kostenbuch liegt ignoriert unter `work/ai-quality-cost-ledger.json`; es darf nicht zurückgesetzt werden, um weitere bezahlte Tests zu ermöglichen. Die Testzugangsdaten bleiben außerhalb von Git. Die Tests verwendeten keine Kundendaten und keine Neon-Geschäftsdatenbank.

## Aus den Tests behobene Ursachen

- Eine Fachanweisung konnte die konkret beauftragte Bibliothekssuche verdrängen. Die Anweisungen priorisieren jetzt tatsächliche Datenabfragen, erklären die unvollständige Katalogvorschau und nennen den einzigen verfügbaren Werkzeugschritt ausdrücklich. Fachanweisung und nötige Datenabfragen können gemeinsam gewählt werden; höchstens zwei Modellaufrufe bleiben erlaubt.
- Ein gewünschter, vollständig bemaßter Erstentwurf wurde in einem Modelllauf nur beschrieben. Die Entwurfsanweisung verlangt jetzt das tatsächlich ausgefüllte `planningDraft`, wenn die notwendigen Angaben vorhanden sind. Fehlende Fertigungsnachweise verhindern keinen ausdrücklich gewünschten ungeprüften Konzeptentwurf.
- Im Raumstudio überdeckte der Wandschalter die geöffnete Kamerasteuerung. Der Schalter gehört nun zur tatsächlichen Modellfläche in `ThreePreview`; Desktop-Seitenleiste und mobile Kameraleiste beanspruchen ihren eigenen Bereich. Der Browser prüft echte Zeigerklicks, Ein-/Ausblenden der Wände und die räumliche Zuordnung zum Modellviewport.
- Eine erst nach den Migrationen eingerichtete Anwendungsrolle erhielt bisher nicht alle vorgesehenen Funktionseintritte. Beide Einrichtungsskripte vergeben die drei konkret benötigten Ausführungsrechte. Superuser, Schemaeigentum und RLS-Umgehung bleiben ausgeschlossen; echte Anmeldung und Kontextauflösung wurden geprüft.
- Der Planungsstand wird vor der Kontextkürzung berechnet. Eine isolierte Inschriftauswahl darf den vorhandenen Stein nicht als fehlende Grundform erscheinen lassen. Gekürzte Prüflisten nennen ihre Gesamtanzahlen.

## Abgrenzung und Betrieb

Fachabfragen prüfen aktuelle Mitgliedschaft, Rechtsträger, Berechtigungsstand, Projekt und exakte Revision. Jede Abfrage liefert höchstens sechs Treffer und höchstens 5.000 UTF-8-Bytes; doppelte Abfragen derselben Antwort werden einmal ausgeführt. Interne Preise und Notizen gelangen nicht ins Ergebnis. Mengenprüfung, Entwurfsmaße und Herstellerquellen bleiben von Fertigungsfreigabe getrennt.

Die Transporttests verwenden das echte SDK und die echte Datenbank mit ausdrücklich simulierten Anbieterantworten. Die Modelltests verwenden den offiziellen OpenAI-Endpunkt und einen separaten Entwicklungsschlüssel. Fotorealistische Bildgenerierung, Scanner und externe E-Mail-Zustellung wurden in diesem Durchlauf nicht neu bewertet. Die vorhandene Bildvorbereitung wird im Browser ohne kostenpflichtige Generierung geprüft.

Es gibt keine neue SQL-Migration, keinen zusätzlichen Datenbankdienst und keine neue monatliche Rendering-Anzahlgrenze. Die vorhandene produktive Neon-/Blob-Konfiguration wird weiterverwendet. Weiteres Vorgehen und wiederholbare lokale Befehle: [KI-Qualität und Werkzeuge](../ai-quality-and-tools.md).
