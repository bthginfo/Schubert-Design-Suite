> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

**Usability-Test finance_b · 23.10.2026**

Felix, 28, neuer kaufmännischer Mitarbeiter im deutschen Steinmetzbetrieb; App-Zugang UX Felix Seidel, Rolle Finanzen. Simulierter Black-box-Test in der lokalen Suite, ausschließlich über die eigene Browser-ID. Laptop 1280 × 900. Rund zehn Minuten und etwa 76 Browserkommandos einschließlich Inspektionen, Screenshots und einem Locatorfehler. Der Umfang wurde durch Umwege bei Belegbezug, Berechtigungen und Formularsuche größer als der Zielbereich. Browserkontext geschlossen.

**Zielstatus**

| Ziel | Status | Tatsächliches Ergebnis |
|---|---|---|
| G1 Rechnungen und offene Forderungen des vorbereiteten Kunden | Teilweise | Rechnungen und Forderungsübersicht gefunden. Suche „finance_b“ und später „Linden“ ergab 0 Rechnungen. Gefundene Kundenakte mit Testweg 12 konnte ich dem vorbereiteten Auftrag nicht sicher zuordnen. Forderungsbestand auch ungefiltert leer; kein kundenbezogener Betrag prüfbar. |
| G2 Zahlungszuordnung oder Rechnungskorrektur verstehen | Teilweise | Zahlungsformular nur angesehen und abgebrochen. Hilfe nennt „Korrektur erstellen“ und unveränderliche ausgestellte Belege. Keine vorhandene Zahlung und kein passender ausgestellter Beleg gefunden; Folge- und Bestätigungsdialoge nicht geprüft. |
| G3 Übersicht, Filter, deutsche Zahlen, Quelle und interne Rückfrage | Teilweise | Zeitraum 01.10.–23.10.2026, EUR und Datenstand geprüft; Forderungsquelle übernimmt Stichtag und Währung sichtbar. Interner Stand gesichert, aber privater Dateispeicher fehlt. Eigene offene Prüfaufgabe TAS-2026-00001 mit vorbereitetem Auftrag angelegt. |

**Tatsächlicher Ablauf und Erwartungen**

1. Einstieg auf „Heute“, auf 1280 × 900 gestellt und Einführung angesehen. Über die angebotene Stationsauswahl „7. Eine Rechnung sicher vorbereiten“ gewählt. Hinweis auf Entwürfe und getrennte verbindliche Schritte gelesen; „Hier selbst ausprobieren“ gewählt.
2. In Rechnungen nach „finance_b“ gesucht. Enter kurz ausprobiert, den angewandten Filter anschließend über „Anwenden“ geprüft: 0 Treffer. Erwartet hatte ich einen direkten Zugang zum vorbereiteten Vorgang.
3. Über „Kunden & Projekte“ nach „UX“ gesucht, „UX Familie Linden ux-20261023-c04396“ geöffnet und Testweg 12 gelesen. „Verknüpfte Vorgänge“ bot nur einen allgemeinen Hinweis zurück auf die Übersicht. Den Kundenbezug zum Auftrag konnte ich nicht bestätigen.
4. In Rechnungen zusätzlich „Linden“ gesucht: ebenfalls 0 Treffer. Statusauswahl geöffnet und mit Escape geschlossen; dort stand „validated“ zwischen deutschen Statuswerten.
5. „Zahlungen“ war leer. „Zahlung anlegen“ nur geöffnet. Hinweise zu tatsächlichem Bankbuchungstag, bestätigtem Betrag, Geschäftspartner und unzureichender Zuordnung allein nach gleichem Betrag gelesen. Über „Abbrechen“ zurück.
6. Auswertungen auf 01.10.2026 bis einschließlich 23.10.2026 gesetzt. Sichtbar: beauftragter Nettowert 2.400,00 €, fakturierter Nettowert 0,00 €, tatsächliche Zahlungseingänge 0,00 €, offene Forderungen 0,00 €. Die unterschiedlichen Zeitgrundlagen werden im Text erklärt.
7. Quellenlink „Offene Forderungen“ geöffnet. Aktive Auswahl zeigte EUR und Stichtag 23.10.2026. 0 Einträge. Nach „Alle Filter aufheben“ weiterhin leer; die leere ungefilterte Ansicht erklärt, dass bestätigte Einträge nach Prüf-/Buchungsschritt erscheinen.
8. CSV-Exportdialog angesehen: Bereich, Format, Bestandsumfang und erneute persönliche Anmeldung werden genannt. Abgebrochen, keine Passphrase eingegeben und keine Datei angefordert.
9. Mit Browser-Zurück zur gefilterten Auswertung. „Auswertungsstand sichern“ speicherte unmittelbar den automatisch benannten internen Stand „Controlling 2026-10-01 bis 2026-10-23“ und startete ein privates Exportpaket. Vorher war mir die zusätzliche Exportverarbeitung aus der knappen Schaltfläche nicht ausdrücklich erklärt; die folgende Statusmeldung machte sie deutlich. Kein Namensdialog wurde angeboten. Keine externe Übergabe und kein Versand ausgelöst.
10. Quellenlink beim beauftragten Nettowert geöffnet. Auftragsbereich meldete fehlende Freigabe. Dabei erschien die bereits verlassene Einführung wieder bei Schritt 1. „Für später schließen“ führte zu Datensatzkonflikt; „Ohne Speichern schließen“ funktionierte.
11. „Hilfe zu dieser Seite“ im Rechnungsbereich gelesen: nennt „Entwurf prüfen · Rechnung ausstellen · Korrektur erstellen“ und erklärt den Berichtigungsweg. Mangels passendem ausgestelltem Beleg keine Korrektur gestartet.
12. Eigene Aufgabe „UX finance_b · Rechnungsbezug Badumbau klären“ erstellt. Die Auftragssuche zeigte zunächst keinen auswählbaren Eintrag; ausdrückliche Suche „UX finance_b“ fand den vorbereiteten Auftrag, den ich auswählte. Die Beschreibung hält den fehlenden Belegbezug fest, ausdrücklich keine bestätigte Betragsdifferenz. Als offene Aufgabe TAS-2026-00001 gespeichert, weder begonnen noch erledigt. Danach erschien der Auftrag nur als Kennung.
13. Zur Auswertung zurückgekehrt und gespeicherten Stand geprüft: „Export benötigt eine Klärung“ / „Privater Dateispeicher ist noch nicht eingerichtet. Die übrigen Funktionen bleiben verfügbar.“ Ergebnis fotografiert, Browser geschlossen.

**Wichtigste Befunde**

- **finance_b-F1 · P2 · Produkt:** Quellenlink bei 2.400,00 € führt für Finanzen zu „Dieser Bereich ist nicht freigegeben“. Die Sperre ist fachlich verständlich; die Kennzahl verspricht jedoch eine Grundlage, die ich damit nicht prüfen kann. Erwartung: lesbare Quelle oder vorab erkennbare Einschränkung. Evidenz: Auswertung (`evidence/finance_b/0006-1792760583446.png`), Zielseite und wiederkehrende Einführung (`evidence/finance_b/0007-1792760701795.png`).
- **finance_b-F2 · P2 · Produkt:** „Verknüpfte Vorgänge“ in der Kundenakte enthält keine konkreten Vorgänge und keine eindeutige Aussage zu leerem oder gesperrtem Bestand. Erwartung: konkrete Rechnungen/Aufträge oder klarer Zustand. Folge: unabhängige Suchumwege; Kundenbezug bleibt unbestätigt. Evidenz: Kundenakte (`evidence/finance_b/0003-1792760464471.png`).
- **finance_b-F3 · P2 · Produkt:** Einführung erscheint nach dem Quellensprung wieder bei Schritt 1; Pausieren erzeugt „Der Datensatz wurde inzwischen geändert“. Erwartung: ruhiger fachlicher Wechsel und funktionierendes Pausieren. Folge: zusätzliche Unterbrechung; „Ohne Speichern schließen“ ist ein funktionierender Rückweg. Ursache nicht untersucht. Evidenz: Konflikt (`evidence/finance_b/0007-1792760701795.png`).
- **finance_b-F4 · P2 · Produkt:** Nach Auswahl des verständlichen Auftragsnamens zeigt die eigene Aufgabenakte nur c24233ac-6e8e-4793-9917-4a6f0ecff526, ohne Link. Erwartung: Name/Nummer und verständliche Zugriffsinformation. Folge: Bezug schwer zu kontrollieren, kein angebotener Weg zum Auftrag. Evidenz: Eigene Aufgabe (`evidence/finance_b/0009-1792760877617.png`).
- **finance_b-F5 · P3 · Produkt:** Rechnungsstatus „validated“ ist im deutschen Auswahlmenü unübersetzt. Als neuer Mitarbeiter muss ich seine Bedeutung erschließen. Evidenz: Statusauswahl (`evidence/finance_b/0004-1792760493882.png`).
- **finance_b-F6 · P2 · Umgebung:** Exportpaket bleibt wegen ausdrücklich nicht eingerichtetem privaten Dateispeicher unzugänglich. Keine Aussage zur Qualität oder Vollständigkeit einer Exportdatei möglich. Die Fehlermeldung benennt die Ursache verständlich. Evidenz: Exportstatus (`evidence/finance_b/0010-1792760913860.png`).

**Stärken und visuelle Prüfung**

Neun gespeicherte Screenshots selbst angesehen: Einstieg, Rechnungsstation, Kundenakte, Statusauswahl, Zahlungsformular, Auswertung, Konflikt, eigene Aufgabe und Exportstatus. Große Überschriften, klar getrennte Karten und stabile Navigation waren am Laptop gut lesbar. Das Zahlungsformular bietet einen stets sichtbaren Abbruch und konkrete fachliche Hinweise. Berichtsbeträge nutzen deutsche Tausender- und Dezimaltrennzeichen; Bericht und Forderungsquelle weisen Datum, Währung und Filter nachvollziehbar aus. Die Einführung erklärt Entwürfe und bewusste Bestätigungen verständlich.

Die nativen Datumsfelder zeigten in diesem Browser „mm/dd/yyyy“ beziehungsweise „10/01/2026“ und „10/23/2026“, während die Berichtszeile „01.10.2026 bis 23.10.2026“ zeigte. Das ist eine beobachtete gemischte Darstellung. Browser-Locale oder Ursache habe ich nicht ausgelesen oder verändert; daraus wird kein gesicherter Produktdefekt abgeleitet. Datumswerte wurden über das native Datumsfeld gesetzt, nicht durch eine geprüfte deutsche Freitexteingabe.

**Grenzen und hinterlassene Ergebnisse**

Nur drei erlaubte Leitfäden gelesen, keine Sourcen, APIs, Datenbanken oder fremden Berichte. Bestehende Datensätze nur gelesen. Kein Betrag gebucht oder zugeordnet, keine Rechnung ausgestellt/korrigiert/storniert, keine Freigabe, kein externer Versand und keine DATEV-Abgabe bestätigt.

Hinterlassen wurden die eigene offene synthetische Prüfaufgabe TAS-2026-00001 und der automatisch benannte interne Auswertungsstand mit fehlgeschlagenem privatem Exportpaket. Keine Exportdatei heruntergeladen. Die später in der Liste sichtbare Aufgabe „Hintergrundverarbeitung benötigt Prüfung“ wurde nicht geöffnet oder verändert; ihr Zusammenhang mit meinem Export wurde nicht überprüft.

Leere Rechnungs-/Zahlungsbestände begrenzen G1 und G2; sie beweisen keinen fehlenden Beleg und keinen Rechenfehler. Die gefundene Kundenakte ist kein bestätigter Auftragspartner. Ein technischer Locatorfehler wegen gleich benannter Suchfelder wurde mit dem zuvor beobachteten Feldselektor behoben; kein Appfehler daraus abgeleitet. Enter und Escape wurden kurz verwendet, kein vollständiger Tastaturtest. KI nicht gestartet; keine Aussage zu Anbieter, Antwortqualität oder Korrekturfähigkeit. Keine mobile Prüfung. Zeitmarken in JSON reichen vom ersten gesicherten Screenshot bis unmittelbar nach dem Schließen.
