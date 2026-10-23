# Finance-Nachtest · Karin, Buchhaltung

23.10.2026, Persona `finance_a`, Desktop 1440 × 1000. Ausschließlich sichtbare UI über den Browser-Broker; keine Anwendungssourcen, API- oder Datenbankzugriffe. Simulierter Testnutzer, keine menschliche Nutzerstudie. Browser nach Abschluss geschlossen.

| Prüfpunkt | Ergebnis | Tatsächlich beobachtet |
|---|---|---|
| Lieferantenakte und berechtigte Bezüge | PASS | Eigener Lieferant „UX finance_a Steinhandel“ gefunden. „Verknüpfte Vorgänge“ zeigt Bestellungen und Eingangsrechnungen, jeweils 0, sowie Hinweis auf freigegebene Fachbereiche und Link zu berechtigten Finanznachweisen. Kein Link auf eine nicht berechtigte Auftragsakte im Tab. |
| Suche und lesbare Namen | PASS | Rechnungssuche nach Kundenname „Synthetischer Integrationstest 870546“ findet genau einen Entwurf mit diesem Kunden. Auftragsreferenz im Rechnungsdetail nennt „AUF-2026-00032 · Synthetischer Angebotsablauf“, keine UUID. |
| Pflichtoriginal unmittelbar im Formular aufnehmen | PASS | Aus der Lieferantenakte „Eingangsrechnung erfassen“ geöffnet; Lieferant vorausgefüllt. Original-PDF direkt im selben Dialog ausgewählt und erfolgreich hochgeladen. |
| Eingaben während Upload behalten | PASS | Bezeichnung „UX finance_a · Inline Original Abschlussprüfung“, Belegnummer TEST-2026-A-RETEST, Netto 700,00, Steuer 133,00 und Brutto 833,00 bleiben unverändert. Anschließend lässt sich im Auftragsfeld „UX finance_a“ eintippen und der vorhandene eigene Auftrag auswählen. |
| Sicherheitsprüfung ehrlich darstellen | PASS / begrenzt | „finance_a-TEST-2026-A.pdf · Hochgeladen · Sicherheitsprüfung offen“, Schaltfläche „Prüfstatus aktualisieren“. Original noch nicht auswählbar. Keine tatsächliche Scanfreigabe verfügbar oder behauptet; vollständige Rechnungsspeicherung daher nicht durchgeführt. |
| Finanzstatus unterscheiden | PASS / begrenzt | Entwurf deutlich gelb; Detail trennt Status, Belegstatus, Ausgabestatus, Versand und Zahlung. Gespeicherte Summe 238,00 € korrekt lesbar. Ausgestellte/bezahlte Fälle in diesem Nachtest nicht geprüft. |
| CSV und KI-Antwort | Nicht geprüft | Kein weiterer Export und keine echte KI-Anfrage in diesem gezielten Nachtest. |

## Kleine verbleibende Beobachtungen

- P3: Lieferantenübersicht im Detail benennt das Organisationsfeld weiterhin „Kundentyp“. „Art“ oder „Lieferantentyp“ wäre fachlich passender.
- P3: Die noch leere Originalauswahl sagt weiterhin „Noch kein Eintrag auswählbar. Legen Sie die zugehörigen Stammdaten zuerst an.“ Das passt zu diesem Dateifeld nicht. Die unmittelbar folgende Inline-Aufnahme und Erklärung zur Quarantäne sind dagegen klar und funktionieren. Beide Punkte dem Hauptagenten gemeldet.

## Evidenz

Alle folgenden Screenshots tatsächlich visuell angesehen:

- [Berechtigte Lieferantenbezüge](../evidence/finance_a/0001-1792768633447.png)
- [Upload im geöffneten Rechnungsdialog, Sicherheitsprüfung und Beträge](../evidence/finance_a/0003-1792768681432.png)
- [Rechnungssuche nach Kundenname](../evidence/finance_a/0004-1792768763244.png)
- [Lesbare Auftragsreferenz und getrennte Statuskarte](../evidence/finance_a/0005-1792768777921.png)

## Datenänderungen und Grenzen

Eine harmlose bereits vorhandene synthetische PDF `work/ai-usability/synthetic/finance_a-TEST-2026-A.pdf` wurde als Original privat hochgeladen; sie bleibt bis zur echten Sicherheitsprüfung in Quarantäne. Kein Original wurde gelöscht, keine Prüfung simuliert. Das Rechnungsformular wurde nach Prüfung bewusst über den Schutzdialog „Ungespeicherte Eingaben verwerfen“ geschlossen. Kein Lieferant zusätzlich angelegt, keine Eingangsrechnung gespeichert, kein Fremdvorgang geändert, keine Rechnung ausgegeben, keine Zahlung oder Freigabe ausgelöst. Kein Beleg für Ende-zu-Ende-Scan oder echte KI-Antwortqualität.

## Gezielter Abschluss nach den beiden Textkorrekturen

Erneuter reiner UI-Nachtest am 23.10.2026, ohne neuen Upload oder gespeicherte Änderung:

- **PASS:** Eigene Lieferantenakte zeigt jetzt „Lieferantentyp“ / „Unternehmen“. [Angesehener Screenshot](../evidence/finance_a/0001-1792769299729.png).
- **PASS:** Das Originalfeld im Eingangsrechnungsdialog erklärt jetzt „Noch kein geprüftes Original auswählbar. Laden Sie die Datei hoch und warten Sie ihre Sicherheitsprüfung ab.“ Inline-Aufnahme und Quarantänehinweis bleiben sichtbar. Keine Stammdatenaufforderung mehr am Originalfeld. [Angesehener Screenshot](../evidence/finance_a/0002-1792769319615.png).

Die beiden oben dokumentierten P3-Beobachtungen sind damit im gezielten Abschluss behoben. Browser geschlossen; keine weiteren Datenänderungen.
