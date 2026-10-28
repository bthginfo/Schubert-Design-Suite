# Nachtest: gemeinsamer Bild-, Text- und Spracheingang

Ergänzung zum [Rollen- und Planungstest](usability-role-planning-2026-10-28.md). Ausschließlich synthetische Testdaten; kein Kundenversand.

| ID | Befund | Korrektur |
| --- | --- | --- |
| C01 | Allgemeine Dokument-/Bildfehlermeldung bei Audioinspektion | Produktionsprotokoll: `AUDIO_INSPECTION`, HTTP 422, 28.10.2026 11:51:40 UTC. Audiofehler nennen jetzt Aufnahmeformat, Lesbarkeit, Dauer oder Größe und den nächsten Schritt. Die frühere Aufnahme ist nicht gespeichert und nachträglich nicht untersuchbar. |
| C02 | Leere, unvollständige oder extrem kurze Browseraufnahme gelangt bis zum Worker | Vollständigen Container einschließlich letztem Recorder-Chunk im Browser dekodieren. Leere/unlesbare Aufnahmen und weniger als 0,25 Sekunden vor Upload und Kostenreservierung ablehnen. Serverseitig Mindestdauer nach unabhängiger Inspektion prüfen. Zwei Minuten und 2,8 MB bleiben die Aufnahmegrenzen. |
| C03 | Verspätete Mikrofonfreigabe und konkurrierende Starts | Start sperren, laufende Freigabe abbrechbar anzeigen, Anfrage und Arbeitskontext prüfen und verspätet gelieferte Mikrofonspuren sofort beenden. |
| C04 | Schmaler Chat mit großer separater Einstellungsfläche | Chat standardmäßig bis 1.000 px breit und nahezu fensterhoch, mit sichtbarer Verkleinerung. Zusammenhängender Verlauf und kompakte Eingabe. Einstellungen als gezielt geöffnetes Panel; kompakte Seitenhilfe bleibt schmal. |
| C05 | Bilder versteckt; Texteingabe während Aufnahme gesperrt | Kompakte Anhänge mit Status, Vorschau, Prüfung und Entfernen direkt an der Nachricht. Tippen und Datei hinzufügen bleiben während des Diktats möglich. Erkannter Text ergänzt die aktuelle Nachricht; Bilder bleiben ausgewählt und werden gemeinsam gesendet. |
| C06 | Verlorene Aufnahme nach Audiofehler; Kostenrisiko bei blinder Wiederholung | Nach eindeutigem Fehler vor dem Anbieteraufruf explizite Wiederholung anbieten. Keine automatische Wiederholung und kein solcher Button nach unbestätigtem Anbieterausgang. Aufnahme nur im Arbeitsspeicher bis Schließen, Kontextwechsel oder neuem Gespräch halten. Text und Anhänge bleiben erhalten. |

## Prüfung

Die drei neuen Browserprüfungen verwenden den echten Browser-Recorder und eine synthetische Tonquelle; Dateiverarbeitung und Modellantworten sind dort ausdrücklich Transport-Stubs. Geprüft: gemeinsam gesendete Quellen und Nachricht, Erhalt nach Audiofehler, explizite Wiederholung, leere Aufnahme ohne Serveraufruf und verspätete Mikrofonfreigabe nach Abbruch. Desktop 1.440 × 1.000 und Mobil 390 × 844, sichtbarer Senden-Button, kein horizontaler Überlauf und Axe-Prüfung im Begleiter.

Zusätzlich echte Produktionsprüfung: Browser-WebM mit Opus, 48 kbit/s und 2,34 Sekunden wurde vom Dokumentdienst mit HTTP 200, passender Dauer und SHA-256 geprüft. Eine deutsche Sprachprobe wurde vom tatsächlichen `gpt-4o-mini-transcribe-2025-12-15` erkannt: „Bitte verwende die hochgeladene Skizze. Der Grabstein soll 600 mm breit und 900 mm hoch sein.“ Ein identischer erneuter Abruf lieferte HTTP 200 aus dem vorhandenen Ergebnis, ohne neue Kosten. Die konkrete frühere Benutzeraufnahme wird damit nicht als reproduziert ausgegeben.

Bestanden: 449 Unit-Tests in 72 Dateien, 93 PostgreSQL-Prüfungen und alle sieben betroffenen Browserabläufe (drei neue Aufnahmetests, Büro-Fotoupload mit echtem Auftragsentwurf, Raumplanung aus Skizze mit Bildstudio-Übergabe, Inschriftänderung mit Undo, Kontextnavigation und mobiler Fokus). Abschließende Typprüfung ohne Fehler/Warnungen; Produktionsbuild und Zugangsdaten-Quelltextscan erfolgreich. Produktionsfreigabe und abschließende Live-Nachweise werden nach Veröffentlichung ergänzt.

Visuelle Evidenz des synthetischen Regressionstests: [Desktop](multimodal-chat-2026-10-28/evidence/chat-desktop.png), [Mobil](multimodal-chat-2026-10-28/evidence/chat-mobile.png).

Die ebenfalls protokollierte einmalige PostgreSQL-Deadlock-Unterbrechung des Outbox-Auftrags `0d444fc4-785c-4031-ad76-26c52aece38c` wurde über den authentifizierten Jobstatus geprüft: zweiter Versuch erfolgreich, `completed` am 28.10.2026 um 11:51:43 UTC, `last_error: null`. Es liegt kein weiterhin gesperrter Dokumentauftrag vor.
