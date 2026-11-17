# Begleiter: Kontext, Datenwerkzeuge und Kosten

Prüfstand vom 17. und 18. November 2026. Die vorhandene Svelte-Anwendung und die direkte OpenAI-Responses-Anbindung wurden überarbeitet. Es gibt keine neue Infrastruktur, Abhängigkeit, Datenbankmigration oder Modellumstellung.

## Befunde und Änderungen

| Befund | Umsetzung |
| --- | --- |
| Der bisherige Suite-Chat verwirft den aktuellen Planbezug; der Seitenchat verliert beim Wechsel die gemeinsame Unterhaltung. | Der Modus **Begleiter** hält die Unterhaltung über Client-Navigation und Studioschritte hinweg. Jede neue Anfrage kann die aktuelle Seite und den gespeicherten Planstand verwenden. **Separater Seitenchat** bleibt für unabhängige Gespräche verfügbar. |
| Eine Antwort kann erst nach einem Seitenwechsel eintreffen. | Seite, Planrevision und ausgewählte Quellen werden vor dem asynchronen Vorbereiten gebunden. Antworten aus einem anderen Bildschirm erhalten einen Rückverweis. Der kurze Gesprächsverlauf kennzeichnet seine ursprünglichen Bezüge. |
| Die Verwendung von Seitendaten ist im Suite-Chat nicht steuerbar. | **Aktuelle Seite einbeziehen** lässt sich ausschalten. Persönliche und administrative Ansichten sind automatisch ausgenommen; ihre Namen gelangen nicht als Herkunftsangabe in den Verlauf. |
| Das günstige Modell lädt bei einer konkreten Materialsuche gelegentlich nur eine Fachhilfe. | Eindeutige einzelne Datenaufträge wählen ihr bereits erlaubtes Lesewerkzeug verbindlich. Die erste Anfrage bietet dafür nur dessen Schema an. Hilfe-, gemischte und nicht eindeutig zuordenbare Fragen behalten die normale Werkzeugauswahl. Ein fehlender Pflichtaufruf führt zu einem sichtbaren Fehler ohne automatischen Wiederholungsversuch. |
| Bei zu kleinem Anfragelimit werden Fachhilfen und Datenwerkzeuge gemeinsam entfernt. | Zuerst entfallen optionale Fachhilfen. Passen die benötigten Datenwerkzeuge weiterhin nicht in die Kostenreservierung, stoppt die Anfrage vor dem Modellaufruf. Datenzugriff wird nicht still durch eine unbelegte Antwort ersetzt. |
| Tatsächliche Abfragen sind in der Antwort nicht erkennbar. | **Datenabfragen** nennt die ausgeführten Werkzeuge, den berechneten gespeicherten Planstand und begrenzte Trefferzahlen. Die Anzeige benötigt weder eine weitere Datenbankabfrage noch einen Modellaufruf. |
| Ein Abbruch kann nach dem ersten Werkzeug noch einen zweiten Lesezugriff starten. | Abbruchprüfungen vor und nach jedem Werkzeug verhindern weitere Abfragen und den zweiten Modellaufruf. Bereits entstandene Anbieternutzung bleibt erfasst. |
| Auf einem kurzen mobilen Bildschirm verdrängt der zusätzliche Seitenbezug die Senden-Schaltfläche. | Seitenbezug und Planstand erhalten einen begrenzten, per Tastatur fokussierbaren Scrollbereich. Verlauf und Eingabefuß behalten ihren Platz. Auch bei gesperrten Schaltern bleibt der Bereich bedienbar. |
| Der Produktions-CSS-Build ersetzt `light-dark()` durch Hilfsvariablen, die den zur Laufzeit gesetzten persönlichen Darstellungsmodus nicht verfolgen. Dadurch werden Glasflächen, Schatten und Hintergrundverläufe ungültig; im dunklen Modus entsteht helle Schrift auf dem hellen Dokumentgrund. | Das CSS-Buildziel erhält die native Farbfunktion, die die persönlichen Inline-Tokens ohnehin voraussetzen. Die Browserprüfung kontrolliert nun den vollständig gebauten Seitenrahmen sowie tatsächlich bemalte Hintergründe, Glasflächen und Farbwechsel. |

Bestehende Berechtigungen, Mandantentrennung, bestätigte Vorschlagsübernahme, Versionsprüfung und Rücknahme bleiben Bestandteil der Abläufe. Der Begleiter lädt gezielte berechtigte Ausschnitte; er überträgt nicht die gesamte Datenbank an das Modell. Trefferzahlen werden ausdrücklich nicht als Gesamtbestand behandelt.

## Verifikation

- `pnpm check`: 0 Svelte-Fehler, 0 Svelte-Warnungen und erfolgreiche TypeScript-Prüfung.
- `pnpm test --maxWorkers=4`: 489 bestandene Tests in 78 Dateien.
- `pnpm test:integration`: 107 bestandene Prüfungen mit echtem lokalem PostgreSQL. Dazu gehören Berechtigungen, Mandantentrennung, Anwendungskommandos, Kostenreservierung, Zwischenspeicherung und SDK-Werkzeugtransport.
- `pnpm build`: Hauptanwendung und Worker erfolgreich gebaut. Die Browserprüfung verwendet die gebaute Hauptanwendung, keinen abweichenden Entwicklungsbuild.
- `pnpm security:check`: Quellenprüfung für 1.181 Repositorydateien bestanden; Geheimniswerte werden dabei nicht ausgegeben.
- Der mechanische Designscan für die beiden geänderten Svelte-Komponenten meldet 21 Hinweise und keine Warnungen. Die Hinweise betreffen überwiegend bereits dokumentierte Typografie und sind kein Nachweis von 21 Produktfehlern.

Der abschließende gemeinsame Browserlauf besteht mit **17 von 17 Fällen**. Er umfasst `agentic-interactions.spec.ts`, `appearance.spec.ts`, `assistant-read-tools.spec.ts`, `assistant-suite.spec.ts`, `companion-continuity.spec.ts`, `studio-quality.spec.ts` und drei gezielte Fälle aus `companion-flows.spec.ts`. Geprüft wurden reale Rollen, Vorschlagsübernahme und Rücknahme, Versionskonflikte, Seitenwechsel während einer Antwort, Datenabfragen, begrenzter Verlauf, abgeschalteter und privater Seitenbezug, Einheiten und Katalogmaterialien in Rückfragen, sechs Akzentpaletten, Hell/Dunkel/Gerätemodus sowie Desktop und mobile Ansichten bis 320 × 640 Pixel. Die jeweiligen Axe-Prüfungen sind erfolgreich; Tastatur und Überlaufen werden zusätzlich geprüft. Die Ausführung verwendet lokales Microsoft Edge mit Playwright; die mobilen Ansichten sind simulierte Viewports, keine Prüfung auf einem physischen iPhone.

Die beiden frisch erzeugten Planungs-PDFs haben je fünf Seiten. Vorderansicht, Seitenansicht, Grundriss, Stückliste und offene fachliche Angaben wurden gerendert und visuell kontrolliert. Die Studiofälle prüfen außerdem echte Speicherung, erneutes Laden, Maße, Konturen, Zoom, 3D-Kamera und Wandsichtbarkeit. Originale stehen lokal unter `work/final-studios`, gerenderte Kontrollseiten und Gesprächsansichten unter `work/companion-reliability`; ergänzende Bilder unter `work/agentic-review` und `.impeccable/review`. Alle diese Verzeichnisse bleiben von Git ausgeschlossen.

Nach der rein typbedingten Entfernung der redundanten inneren Bedingung wurden `pnpm check` und der Produktionsbuild erneut erfolgreich abgeschlossen. Beide Fälle aus `companion-continuity.spec.ts` bestehen zusätzlich auf diesem letzten Build.

| Grenze | Nachweis |
| --- | --- |
| Browser → Chat-API | Reale Anmeldung, schwebender Begleiter, Vollbild, gebundene Planrevision, Seitenwechsel und abschaltbarer Seitenbezug. Reine Darstellungsfälle kennzeichnen ihre abgefangene Chatantwort ausdrücklich als Stub. |
| API → Daten | Der Browserfall `assistant-read-tools.spec.ts` verwendet die echte Chatroute, Rechteprüfung und deterministische Planabfrage mit lokalem PostgreSQL. |
| Daten → Anbietertransport → Antwort | Derselbe Fall verwendet das echte OpenAI-SDK gegen den ausdrücklich lokalen synthetischen Transport. Antwort, Werkzeugnachweis und Nutzungsbuchung werden geprüft. Dies ist keine echte Modellqualitätsmessung. Die separaten 13 echten Modellfälle stehen unten. |
| Vorschlag → Kommandos → Daten → Anzeige | `assistant-suite.spec.ts` findet Kunden, legt einen echten Rechnungs-/Angebotsentwurf an und ändert eine andere Planvariante nach Vorschau. `agentic-interactions.spec.ts` prüft Änderung, gespeicherte Revision, beide Rücknahmewege und Sperren bei veraltetem Planstand. |

Eine frühe Runde enthielt einen Syntaxfehler im angepassten Test und einen älteren Vorschlagsstub ohne den aktuellen Planbezug; beides wurde im Test korrigiert. Ein weiterer Testselektor wurde auf die tatsächlich vorhandene Auswahlleiste umgestellt. Eine lokale Datenbank-Zeitüberschreitung unterbrach einen Fall. Der anschließende Verbindungstest war erfolgreich. Der im Browser gefundene tatsächliche Höhenfehler bei 320 × 640 Pixeln wurde in der Anwendung behoben; die anschließende Axe-Prüfung verlangte außerdem den eigenen Tastaturzugang zum Scrollbereich, wenn dessen Schalter während einer Anfrage gesperrt sind. Dieser Zugang wurde ergänzt. Die letzte Typprüfung erkannte eine durch den äußeren Kontextschutz bereits abgedeckte innere Bedingung. Sie wurde ohne Verhaltensänderung entfernt. Die Produktionsdienste wurden für diese mutierenden Prüfungen nicht verwendet.

## Echte Modellprüfung

Die Prüfungen verwenden den vorhandenen Entwicklungszugang am offiziellen OpenAI-Endpunkt, ausschließlich synthetische Eingaben und keine kostenpflichtige Bildgenerierung. Die gemeinsame bestehende Kostenbuchführung erhält für diese Läufe eine Obergrenze von 0,15 USD; sie beginnt nicht bei jedem Lauf von vorn.

| Lauf | Ergebnis | Anbieteraufrufe | Kosten nach hinterlegtem Preisprofil |
| --- | --- | ---: | ---: |
| Erste Datenwerkzeugprüfung | 2 von 3 bestanden; Materialsuche ausgelassen | 6 | 0,003780255 USD |
| Datenwerkzeugprüfung nach Korrektur | 3 von 3 bestanden | 6 | 0,003143895 USD |
| Planungsregression | 10 von 10 bestanden | 18 | 0,007041935 USD |
| Gesamter Durchgang einschließlich Fehleraufdeckung | 13 abschließend erfolgreiche Prüffälle | 30 | **0,013966085 USD** |

Die erfolgreichen Fälle prüfen berechnetes Steinvolumen, tatsächliche Materialquelle, unvollständige Katalogauszüge, wörtliche Inschriften, fehlende Maße, Zentimeter-/Meterumrechnung, unklare Maßgrundlagen, gezielte Textänderung, geschützten Wortlaut, reine Bedienhilfe, eingeschleuste Dokumentanweisungen und fehlende Katalogbelege. Insgesamt wurden 175.473 Eingabe- und 3.207 Ausgabetokens verarbeitet. Die Beträge beruhen auf der erfassten Anbieternutzung und dem konfigurierten Preisprofil, nicht auf einer unabhängig abgerufenen Rechnung.

Die lokalen Berichte stehen unter `work/ai-quality-companion-2026-11-17.json`, `work/ai-quality-companion-fixed-2026-11-17.json` und `work/ai-quality-companion-regression-2026-11-17.json`. Sie bleiben wie die Testzugänge von Git ausgeschlossen.

## Prüfgrenzen und Betrieb

Es bleiben höchstens zwei Anbieteraufrufe je Chat-Anfrage und höchstens zwei fachliche Leseaufrufe im begrenzten Werkzeugschritt. Es gibt keinen unbegrenzten Agentenloop und keine automatische Wiederholung unklar abgeschlossener bezahlter Arbeit. Der Gesprächskontext ist auf sechs abgeschlossene Nachrichten mit jeweils höchstens 1.800 Zeichen begrenzt; abgebrochene, fehlgeschlagene und noch offene Nachrichten werden nicht weitergereicht. Der laufende Gesprächszustand bleibt im Browser und übersteht keinen vollständigen Neuladevorgang.

Die Modellprüfung untersucht Text-, Geometrie- und Werkzeugverhalten. Sie belegt weder die Qualität neuer fotorealistischer Bilder noch eine fachliche Fertigungsfreigabe oder eine Nutzungsstudie mit Mitarbeitenden. Schreibvorschläge benötigen weiterhin die sichtbare Übernahme; verbindliche Geschäftsfreigaben behalten ihre eigenen Regeln.

Die verbindliche Auswahl eines einzelnen vorhandenen Werkzeugs folgt der dokumentierten [OpenAI-Funktionsauswahl](https://developers.openai.com/api/docs/guides/function-calling). Bewertet werden überprüfbare Ausgabe- und Werkzeugbedingungen statt einer Selbsteinschätzung des Modells; siehe [Agent evaluations](https://developers.openai.com/api/docs/guides/agent-evals).

Das CSS-Buildziel ist getrennt vom unveränderten JavaScript-Ziel auf Chrome/Edge 123, Firefox 120 und Safari/iOS 17.5 eingestellt. Diese Versionen unterstützen die bereits verwendete native Farbfunktion. Maßgeblich sind [Vites CSS-Buildoptionen](https://vite.dev/config/build-options.html#build-csstarget) und [MDNs Dokumentation zu light-dark](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark). Die Ursache wurde zusätzlich am erzeugten CSS und an den tatsächlichen Browserstilen nachgewiesen; vorher waren Hintergrund und Glasflächen dort transparent.
