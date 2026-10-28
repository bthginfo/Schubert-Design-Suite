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

Bestanden: 449 Unit-Tests in 72 Dateien, 93 PostgreSQL-Prüfungen und alle sieben betroffenen Browserabläufe (drei neue Aufnahmetests, Büro-Fotoupload mit echtem Auftragsentwurf, Raumplanung aus Skizze mit Bildstudio-Übergabe, Inschriftänderung mit Undo, Kontextnavigation und mobiler Fokus). Abschließende Typprüfung ohne Fehler/Warnungen; Produktionsbuild und Zugangsdaten-Quelltextscan über 1.136 Dateien erfolgreich.

Visuelle Evidenz des synthetischen Regressionstests: [Desktop](multimodal-chat-2026-10-28/evidence/chat-desktop.png), [Mobil](multimodal-chat-2026-10-28/evidence/chat-mobile.png).

Die ebenfalls protokollierte einmalige PostgreSQL-Deadlock-Unterbrechung des Outbox-Auftrags `0d444fc4-785c-4031-ad76-26c52aece38c` wurde über den authentifizierten Jobstatus geprüft: zweiter Versuch erfolgreich, `completed` am 28.10.2026 um 11:51:43 UTC, `last_error: null`. Es liegt kein weiterhin gesperrter Dokumentauftrag vor.

## Veröffentlichung und vollständiger Live-Durchlauf

Anwendungscode `e9564a95198f455c5c0e0a61dabe589d68c2b8a8`, Vercel-Deployment `dpl_6Fp8TKt3AiAxQ6YdPVqRW38BocH8`: READY und Produktionsalias `schubert-design-suite.vercel.app` bestätigt. Keine Datenbankmigration oder Änderung am Dokumentworker erforderlich.

Am 28.10.2026 um 12:52 UTC wurde im vorhandenen synthetischen Büro-Grabmalplan mit Superadmin ein vollständiger frischer Browserdurchlauf geprüft. Neue Skizze tatsächlich hochgeladen, privat geprüft und vorbereitet; deutscher synthetischer Sprachtext über den echten Browser-Recorder aufgenommen; während der Aufnahme die getippte Nachricht ergänzt; anschließend Bild, Text und Diktat gemeinsam gesendet. Datei- und KI-Dienste wurden tatsächlich aufgerufen, ohne Anbieter-Stubs.

| Grenze | Ergebnis | Nachweis |
| --- | --- | --- |
| Browser → Datei-/Bildverarbeitung | Bereit | Neue Originalquelle `e609e00a-64be-4179-923a-17416f687377`, Seite 1 als tatsächliche Bildreferenz gesendet |
| Recorder → Audioinspektion → Spracherkennung | HTTP 200 | WebM/Opus, 47.842 Bytes, 9,06 Sekunden; Modell `gpt-4o-mini-transcribe-2025-12-15`; tatsächlicher Verbrauch 0,0002675 USD |
| Gemeinsame Nachricht → KI | HTTP 200 | Getippte matte Oberflächenvorgabe, diktierte 600/900 mm und ausgewählte Bildreferenz in derselben Anfrage |
| KI → sichtbare Antwort | Korrekt | Rundbogenstein mittig auf Sockel; Stein 600 × 900 × 120 mm und Sockel 700 × 140 × 180 mm; Inschrift richtig gelesen. Die KI unterscheidet die gewünschte matte Oberfläche von der reinen Linienzeichnung. Tatsächlicher Verbrauch 0,004228975 USD |
| Unverbindliche Prüfung → Plan | Unverändert | Vorher/nachher Rev. 4; keine Änderung vorgeschlagen oder angewandt |
| Desktop und Mobil | Bestanden | Desktop-Chat 1.000 × 952 px, Verlauf 438 px statt Composer 247 px; Mobil 390 × 844 px ohne horizontalen Überlauf, Senden im sichtbaren Bereich, keine Axe-Verstöße im Begleiter |

Browserkonsole und fehlgeschlagene Netzwerkanfragen: keine Einträge. Die gezielte Fehlerprüfung dieses Anwendungsdeployments fand im Nachtestfenster keine Laufzeitfehler. Das ist eine begrenzte Prüfung dieses Durchlaufs, keine Aussage über sämtliche historischen Fehler.

Maschinenlesbarer [Live-Nachweis](multimodal-chat-2026-10-28/evidence/production-result.json). Die Produktionsscreenshots mit sichtbarem Testplan liegen lokal unter `schubert-usability-2026-10-28/chat-production-desktop.png` und `chat-production-mobile.png`; sie werden nicht als zusätzliche öffentliche Kundenunterlagen veröffentlicht.
