# Rollenbasierter Usability-Test · 28.10.2026

Zwei KI-Subagents haben die tatsächliche Anwendung als Mitarbeiter eines deutschen Steinmetzbetriebs durchgespielt: einmal Büro mit wenig digitaler Routine, einmal operative Planung. Beide Rollen arbeiteten über die Oberfläche und prüften ihre Befunde nach der Korrektur erneut. Dazu kam eine visuelle Prüfung der Dialoge, mobilen Ansichten, Quellen und des sechsseitigen Grabmal-PDFs durch den Hauptagenten. Dies ist ein KI-getriebener Rollentest, kein Test mit menschlichen Beschäftigten.

Die Testdatenbank wurde vorher privat gesichert. Bestehende Testdaten bleiben erhalten. Neue Geschäftsvorgänge sind als TEST UAT markiert; keine technische Freigabe oder Veröffentlichung wurde als Testerfolg erzeugt. Für diese Änderungen ist keine SQL-Migration erforderlich.

## Aufgaben und Korrekturen

| Bereich | Behobener Befund und nachgeprüftes Verhalten |
| --- | --- |
| Kundenakte | Am Auftrag verknüpfte Originale erscheinen auch in der richtigen Kundenakte und Dokumentliste. Personalunterlagen, fremde Kunden und nicht zugewiesene Aufträge bleiben ausgeschlossen. Technische KI-/Grundriss-Vorschaudateien werden nicht als weitere Kundenunterlagen mitgezählt; Geschäfts-PDFs bleiben sichtbar. |
| Anfrage → Angebot | Titel, Kunde und Kundenwunsch stammen aus der berechtigten Originalanfrage. Die Quelle bleibt sichtbar; Texte sind bearbeitbar. Preise, Termine und Leistungen werden nicht erfunden. |
| Angebotsformular | Kunde und Vorhaben stehen zuerst. Währung, späterer Auftragsbezug und weitere Termine sind optionale Angaben. Aus Kundenlisten führt ein klarer Rückweg zur Kundenübersicht. |
| Preisfehler | Der tatsächliche Serverfehler benennt Position und Feld. Auf Mobilgeräten werden Eingabe, Fehlerbezug und Fokus am Einzelpreis angezeigt. Ein ungültiger Preis verändert den gespeicherten Stand nicht; Korrektur und Neuöffnen funktionieren. |
| Kunden-Uploads | Der Upload in einer gefilterten Dokumentliste zeigt den serveraufgelösten Kunden und legt die Datei in dieser Akte ab. Chat-Uploads erhalten bei passenden Bearbeitungsrechten den geöffneten Kunden-, Auftrags- oder Planungskontext. Eine URL-Zeichenfolge wird nicht als Uploadziel übernommen. |
| Maßeinheiten | Erklärung und Eingaben stimmen mit mm, cm oder m überein. Die Stele 80 × 120 × 16 cm bleibt intern 800 × 1200 × 160 mm. Ein reiner Anzeigewechsel erzeugt keine neue Planrevision. |
| Inschrift | Namen und Daten stehen vor Gestaltung und Bestellangaben. Der Trägerstein ist benannt; Natursteinbibliothek und Schriftmaterial sind getrennt. Gespeicherte Wortlautänderung, Undo, Neuöffnen und 3D zeigen die richtigen Namen sowie `*` und `†`. |
| Raum und Tür | Raum-Material ist als Bodenbelag erklärt. Eine Vorschau aus der echten Geometrie zeigt gewählte Wand, Start A, Ende B und Messrichtung. Der Abstand bezieht sich ausdrücklich auf die vorhandene Wandachse. Mobile Ansicht ohne horizontalen Überlauf. |
| Quellen prüfen | Die vorbereitete Bildseite lässt sich groß in einem angekündigten neuen Tab öffnen. Der Link bindet die private Dokumentversion; Namen, Zeichen und Maße sind tatsächlich lesbar. |
| Dateiprüfung | Unterbrochene Prüfaufträge können mit demselben Original fortgesetzt werden. Der Command prüft aktuelle Rechte, Dateistand, Version und Jobbindung. Aktive Scanner-Leases werden nicht zurückgesetzt; gesperrte Dateien können weder erneut freigegeben noch heruntergeladen werden. |
| Hintergrundverarbeitung | Alte Benachrichtigungsereignisse ohne sichtbares Aggregat blockieren neue Datei- und Druckjobs nicht mehr. Neue Uploads und Vorschauen starten gezielt ihren eigenen Job. |
| KI-Kontext und Kostenanzeige | Eine angehängte Zeichnung ergänzt die Fachanleitung, statt die Büroanleitung für Aufträge und neue Pläne zu ersetzen. Die Kostenanzeige verwendet dieselben Modelle, Preise und Grenzen wie die tatsächliche Reservierung. Vorhandene gespeicherte Limits werden nicht angehoben. |

Ausführlicher [Backoffice-Rollenbericht](backoffice-usability-2026-10-28.md). Der Operations-Test und die vollständigen lokalen Protokolle liegen unter `work/usability-2026-10-28/operations/`.

## Echte Integrationsnachweise und offene Grenze

Der Dokumentpfad wurde mit privaten Blob-Originalen, dem unveränderten Dokumentworker, echtem ClamAV 1.4.3 und tatsächlichen deutschen OCR-/PDF-/PNG-Vorschauen geprüft. Der Scanner akzeptiert die saubere Testskizze und sperrt die harmlose EICAR-Antivirenprobe. Hash, Originalversion, Seite und tatsächliche Bildgröße wurden verglichen. Ein pausiertes Original erreichte über den normalen Wiederaufnahme-Command `available`, anschließend die Vorschau `completed` und die Oberfläche „Bereit für die KI“. Es wurden keine Scan- oder Fertigmeldungen simuliert.

**Die vollständige Live-Modellkette „Skizze → KI → Grabmalplan“ ist weiterhin offen.** Im lokalen Entwicklungszugang fehlt ein verwendbarer OpenAI-Zugang. Die Rollen konnten deshalb keine echte Modellantwort auslösen. Die Produktion besitzt einen getrennten Zugang; er wurde nicht in die Testumgebung kopiert. Die automatisierten KI-Regressionen verwenden ausdrücklich kontrollierte Modellantworten, aber wirkliche Commands, Transaktionen, Rechte und Planrevisionen. Diese Tests belegen keine Handschrifterkennung oder erfolgreiche Live-Modellinterpretation.

Die echte OCR las das `†` der Testskizze als unsicheren „+“-Kandidaten mit Confidence 0,4735. Das private Bild enthält das richtige Zeichen unverändert. Ein späterer Live-Modelltest muss deshalb Maße, Namen und `*`/`†` am Bild und am Nutzerauftrag prüfen. OCR bleibt ungeprüfte Quellinformation; daraus entsteht kein bestätigtes Aufmaß.

## Abschlussprüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Svelte und TypeScript | 0 Fehler, 0 Warnungen |
| Unit-Tests | 434 bestanden in 70 Dateien |
| PostgreSQL | 88 Integrationsprüfungen bestanden, einschließlich 13 neuer Prüfungen für Dateiwiederaufnahme, Zugriffe, verwaiste Ereignisse, Angebotsquelle und unveränderte Beträge |
| Browser | 80 verschiedene Szenarien abgedeckt: 79 bestanden im großen 80er-Lauf; der verbliebene Test benötigte die explizite Navigation von Hilfe zu Chat. Nach der Testkorrektur und der zusätzlichen Vorschau-Bereinigung bestanden alle 13 betroffenen Szenarien gegen den finalen Produktionsbuild, inklusive beider echter Worker-Tests. Kein einzelner fehlerfreier 80er-Lauf wird behauptet. |
| Produktionsbuild | Erfolgreich |
| PDF | Sechsseitiger tatsächlicher UI-Download geprüft; Vorderansicht und wörtlicher Inschriftenplan gerastert und visuell kontrolliert. Anna Müller, `* 1948`, `† 2025` im Inschriftenplan enthalten. |
| Quellprüfung | Zugangsdatenprüfung bestanden; Anforderungszuordnung unverändert verifiziert. |

Der große Browserlauf verwendet einen frisch gestarteten Produktionsbuild über `vite preview`. Die zuvor während paralleler Änderungen beobachtete Vite-HMR-Fehlerseite wird dadurch von den eigentlichen Laufzeitprüfungen getrennt. Testkorrekturen betreffen außerdem die explizite Chat-/Kachelnavigation, getrennte Playwright-Ausgabeverzeichnisse sowie wiederholbare Erwartungen an Onboarding und PostgreSQL-Dezimalformate.

## Visuelle Belege

- [Kundenakte nach echtem Chat-Upload und Scan](usability-2026-10-28/evidence/chat-upload-kundenakte.png)
- [Angebot aus echter Anfrage](usability-2026-10-28/evidence/angebot-aus-anfrage.png)
- [Preisfehler mit Fokus auf Mobilgerät](usability-2026-10-28/evidence/preisfehler-mobil.png)
- [Inschrift zuerst bearbeiten](usability-2026-10-28/evidence/inschrift-bedienung.png)
- [Wand und Messrichtung mobil](usability-2026-10-28/evidence/tuerposition-mobil.png)
- [Großansicht der tatsächlichen Bildreferenz](usability-2026-10-28/evidence/skizze-grossansicht.png)
- [Synthetische Testskizze](usability-2026-10-28/evidence/testskizze.png), [tatsächlicher Grabmal-PDF-Download](usability-2026-10-28/evidence/grabmal.pdf), [Dateigrößen und SHA-256](usability-2026-10-28/evidence/manifest.json)

Private Anmeldesitzungen, Geheimnisse und vollständige Netzwerkmitschnitte gehören nicht zu den veröffentlichten Belegen. Die genaue Commit-/CI-/Vercel-Zuordnung wird nach dem Release lokal in `work/usability-2026-10-28/release.json` festgehalten.
