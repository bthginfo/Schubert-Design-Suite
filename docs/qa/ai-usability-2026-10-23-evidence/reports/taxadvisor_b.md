> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest: taxadvisor_b

23.10.2026, ca. 13:22–13:29 UTC; UX Paul Jansen, gelegentlicher Kanzleizugang „Steuerberatung“, Laptop 1280 × 900. Black-box-Test mit rund 48 Browseraktionen; Browser geschlossen. Keine echte menschliche Nutzerstudie.

## Zielstatus

| Ziel | Ergebnis |
| --- | --- |
| G1 Finanzzugang und Belegzustände verstehen | **Teilweise.** Auswertungen, Zahlungen, offene Forderungen, Rechnungseingang, Dokumente, E-Rechnungsprofile und DATEV-Übergaben geöffnet. Rechnungs- und Auftragsquellen waren ausdrücklich nicht freigegeben. Erreichbare Listen enthielten keine Datensätze; offene versus ausgestellte Belege konnte ich deshalb nicht an einem Beleg vergleichen. |
| G2 Konkreten Testkunden und Zeitraum finden | **Teilweise.** Zeitraum 01.10.2026 bis 23.10.2026 erfolgreich ausgewertet. Einen konkreten Testkunden konnte ich nicht identifizieren: „Kunden & Projekte“/Auftragsquelle war gesperrt, Dokumente und E-Rechnungsprofile waren leer. Die globale Suche nach dem zuvor sichtbaren Begriff „Synthetischer“ führte zur gefilterten Dokumentenliste ohne Treffer. |
| G3 Prüfungsansicht und angebotenen Download sichern | **Erreicht, mit eingeschränkter fachlicher Aussage.** CSV der leeren offenen Forderungen nach erneuter persönlicher Anmeldung tatsächlich heruntergeladen. Dokumenten- und DATEV-Ansicht gefunden. Ein vollständiges Berichtspaket blieb wegen fehlender Speicherkonfiguration aus. Keine Übergabe/Abgabe ausgelöst. |

## Erwartungen und tatsächlicher Weg

Ich erwartete hinter „Quellenvorgänge öffnen“ den Ursprung der Kennzahl. Nach Einstieg und Schließen der Einführung öffnete ich Auswertungen, änderte den Beginn auf 01.10.2026 und klickte „Auswerten“. Der angewendete Zeitraum erschien als deutscher Klartext; die Quellverknüpfungen enthielten den gewählten Zeitraum. „Daten & Grundlagen 36“ erklärte fehlende Kostensätze und Restschätzungen.

Die Rechnungsquelle führte zur Berechtigungsmeldung. Über „Büro“ → „Alle Bereiche“ fand ich offene Forderungen. Der Statusfilter bot beim leeren Bestand nur „Alle Status“; Escape schloss ihn. „Export“ erklärte Bereich und CSV-Format, verlangte meine Anmeldung erneut und bot anschließend „CSV herunterladen“. Der Download wurde gespeichert: receivables.csv (`evidence/taxadvisor_b/1792761950692-receivables.csv`). Der Dateiinhalt wurde nicht separat geöffnet oder fachlich geprüft.

Dokumente waren ebenfalls leer. Die globale Suche ließ sich mit Enter auslösen. Über Auswertungen → Auftragskosten und „Beauftragter Nettowert … Quellenvorgänge öffnen“ versuchte ich den vorhandenen Auftragswert nachzuvollziehen; auch hier war der Bereich gesperrt. Danach öffnete ich „Gesicherte Stände & Übergabe an die Kanzlei“, sicherte genau einmal den internen Auswertungsstand und las dessen Exportstatus. DATEV-Übergaben, E-Rechnungsprofile und Rechnungseingang enthielten keine Einträge.

## Befunde

1. **P2 · Quellenversprechen endet an der Berechtigungsgrenze (Produkt).** Die Auswertung bietet „direkter Weg zu den Ursprungsbelegen“ und klickbare Rechnungs-/Auftragsquellen. Beide führten zu „Dieser Bereich ist nicht freigegeben“. Die Sperre ist verständlich und wird nicht als Defekt gewertet; störend ist der angebotene Weg ohne vorherigen Hinweis auf meinen eingeschränkten Zugang. Für mich endet damit die Nachvollziehbarkeit der 2.400,00 € Auftragswert. Erwartet: erreichbare Lesequelle oder Einschränkung schon an der Kennzahl. Evidenz: Auswertung 0002 (`evidence/taxadvisor_b/0002-1792761804961.png`), gesperrte Auftragsansicht 0008 (`evidence/taxadvisor_b/0008-1792762019321.png`), Browserprotokoll zu Rechnungs-/Auftragsklick.

2. **P2 · Viele identische Datenlücken sind nicht zuordenbar (Produkt).** In „Daten & Grundlagen“ standen zunächst zahlreiche identische Karten „Berechnungsgrundlage ergänzen – Interner Kostensatz fehlt. Auftragsmarge unvollständig.“ ohne Person, Auftrag oder direkte Prüfaktion. Ich weiß, was fehlt, kann diese Meldungen aber keinem konkreten Fall für die Rückfrage zuordnen. Andere Meldungen weiter unten nannten dagegen eine Auftragsnummer und „Grundlage prüfen“. Erwartet: erkennbare Zuordnung oder zusammengefasster Hinweis mit Zuständigkeit. Visuell dominiert die Wiederholung die lange Seite. Evidenz: 0003 (`evidence/taxadvisor_b/0003-1792761836779.png`).

3. **P2 · Einführung erscheint erneut und scheitert beim Pausieren (Produkt, Ursache ungeklärt).** Die anfangs per Escape geschlossene Einführung erschien auf der gesperrten Rechnungsseite erneut. „Für später schließen“ zeigte nach „Wird gespeichert …“: „Der Datensatz wurde inzwischen geändert. Aktuellen Stand laden und Änderungen prüfen.“ Erst „Ohne Speichern schließen“ räumte den Dialog weg. Auf der späteren gesperrten Auftragsseite erschien Schritt 1 wieder. Erwartet: Meine Pause bleibt wirksam. Auswirkung: wiederholte Unterbrechung gerade bei der Orientierung nach einem gesperrten Ziel. Evidenz: 0004 (`evidence/taxadvisor_b/0004-1792761860986.png`), 0008 (`evidence/taxadvisor_b/0008-1792762019321.png`). Kein Rückschluss auf die technische Ursache.

4. **P2 · Gesicherter Bericht ohne herunterladbares Paket (Umgebung).** „Diesen Auswertungsstand sichern“ fror den Stand ein; anschließend erschien „Export benötigt eine Klärung – Privater Dateispeicher ist noch nicht eingerichtet. Die übrigen Funktionen bleiben verfügbar.“ Ich erwartete ein prüfbares Berichtspaket, konnte aber nur den Stand intern sichern. Die Erklärung ist klar. Dies ist eine Konfigurationsgrenze, keine bewertete fachliche Exportqualität. Evidenz: 0009 (`evidence/taxadvisor_b/0009-1792762049621.png`). Der Stand wurde automatisch als „Controlling 2025-10-23 bis 2026-10-23“, gespeichert 15:27 Uhr, angelegt; die direkte Sicherungsaktion bot kein Namensfeld für das Testpräfix.

## Was gut funktionierte und Grenzen

Die Hauptansicht war bei 1280 × 900 gut lesbar, mit klaren Kennzahlen und sichtbarer primärer Filteraktion. Beträge wie **2.400,00 €**, EUR, Datenstand und Zeitraum waren verständlich. Die Erklärung, dass offene Posten den heutigen Bearbeitungsstand zeigen, half bei der Einordnung. Fehlende Restschätzungen standen ausdrücklich als „Noch nicht bestätigt“. Der CSV-Dialog erklärte Umfang, erneute Anmeldung und Bereitschaft zum Download klar; der Download funktionierte. Ergebnisdialog 0006 (`evidence/taxadvisor_b/0006-1792761945670.png`).

Selbst angesehen: Einstieg 0001, Auswertung 0002, Datenlücken 0003, Pausierungsfehler 0004, CSV-Ergebnis 0006 und Exportgrenze 0009. Tastatur: Escape bei Einführung/Statusfilter und Exportdialog sowie Enter für die Suche. Keine mobile Prüfung, da Laptoprolle.

Die nativen Datumsfelder zeigten im Browser z. B. „10/23/2026“, während der angewendete Zeitraum deutsch formatiert war. Der Einfluss der Browser-Ländereinstellung wurde nicht isoliert; kein gesicherter allgemeiner Produktfehler. Die vielen leeren Listen beschränken die Aussage über Suche und Belegzustände. Keine konkreten Kunden-, Rechnungs- oder Originaldokumentdetails zugänglich geprüft, keine fachliche Freigabe vorausgesetzt. Keine KI-Antwortqualität bewertet, keine Steuerregeln ergänzt. Keine Buchungen, Abgaben, Integrationen oder vorhandenen Geschäftsdaten geändert; lediglich interne synthetische Berichtssicherung und lokaler CSV-Download.
