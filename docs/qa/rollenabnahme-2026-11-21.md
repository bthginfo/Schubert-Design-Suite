# Rollen- und Bedienprüfung vom 21. November 2026

Die Prüfung verwendet synthetische Betriebsdaten, getrennte Anmeldungen und eine lokale PostgreSQL-Datenbank. Die Browser bedienen die gebaute Anwendung über ihre regulären Seiten und HTTP-Endpunkte. Finanzbelege, Mitarbeiterzeiten und Kundenkommunikation im produktiven Mandanten wurden für die Prüfung nicht verändert.

## Arbeitswege und Korrekturen

| Arbeitsbereich | Geprüfte Wege | Änderungen aus der Prüfung |
| --- | --- | --- |
| Büro und Einkauf | Kunde und Anfrage anlegen, Angebot mit Wahlposition speichern, Auftrag und Unterlagen öffnen, Lieferant und Katalogartikel finden | Gespeicherte Listenansichten berücksichtigen den aktiven Kundenfilter. Die erste Seite bleibt auch auf der letzten Ergebnisseite direkt erreichbar. Der Einkauf zählt tatsächliche Lieferanten. |
| Disposition, Werkstatt und Außendienst | Aufträge anhand ihrer Zuteilung öffnen, zwischen Kalenderansichten wechseln, Einsätze über Mitternacht anzeigen, Zeiten mobil und nachträglich erfassen | Disposition, Liste, Auftragsdetail und Export verwenden denselben Auftragsumfang. Stornierte Zuteilungen gewähren keinen Zugriff. Die Tageszahl umfasst auch Termine jenseits der Vorschau. Der Kalender berechnet Datum und Uhrzeit einmal je Einsatz. |
| Planung | Grabmal und Raum anlegen, Maße und Inschrift ändern, Varianten erneut öffnen, Kameras und Raster bedienen, Stücklisten und PDFs ausgeben | Das Studio reserviert Zeichenfläche auch bei niedrigen Fenstern. Auf schmalen Displays sitzt der Begleiter neben der Navigation und lässt die Zoomtasten frei. |
| KI-Begleiter | Daten und Quellen auswählen, den Seitenkontext wechseln, Aktionen vorbereiten, prüfen und anwenden, veraltete Bearbeitungsstände zurückweisen | Die Optionen für Unterlagen und Modell lassen im Studio den Dialogkopf und die Eingabe erreichbar. Die Bedienung wurde in beiden Studios geprüft. |
| Finanzen, Personal, Steuerberatung und Administration | Rollenspezifische Einstiege und erlaubte Seiten öffnen, nicht freigegebene Funktionen ausschließen | Der Einstieg führt zur jeweiligen Hauptaufgabe. Offene Forderungen sind nach Währung getrennt. Die technische Administration liest keine persönlichen Zeiten oder Aufgaben über ihr Dashboard. |
| Kundenportal | Mit einem eigenen Zugang anmelden, Nachricht senden und nach erneutem Öffnen sehen, zwischen Zugängen wechseln und abmelden | Die Browsersitzung wird nach der Anmeldung gesetzt. Ein anderer Portal-Link öffnet die richtige Anmeldung. Ein bereits geöffneter Tab erkennt den Wechsel des Zugangs, bevor er eine Nachricht für das falsche Vorhaben senden kann. |

Die Bereichsübersichten ermitteln ihre berechtigten Karten in einer Datenbankabfrage. Die Auswertungsseite lädt die ungenutzten Startseitenaggregate nicht mehr. Die Prüfung liefert keine Hochrechnung für den monatlichen Vercel- oder Neon-Verbrauch.

## Prüfumfang

| Prüfung | Ergebnis |
| --- | --- |
| Unit-Tests | 490 bestanden |
| PostgreSQL-Integration | 120 Prüfungen bestanden, einschließlich Rollenmatrix, Berechtigungen und Auftrags-Export |
| Serverseitige Seitenaufrufe | 401 Kombinationen aus Rolle und berechtigter Seite erfolgreich geladen |
| KI-Prüfung mit echten OpenAI-Aufrufen | 10 Planungsfälle und 3 Fachwerkzeugfälle bestanden. 25 Provideraufrufe, 137.272 Eingabetokens, 2.801 Ausgabetokens, geschätzte 0,01234484 USD |
| Browserabnahme | 102 unterschiedliche Szenarien abgedeckt. Die zusätzlichen Wiederholungen für mobiles Studio-Vollbild, Zoom und Begleiter wurden auf der korrigierten Fassung bestanden. |
| Privater Dateispeicher | Kundenskizze hochgeladen, tatsächlich gescannt, mit OCR aufbereitet, groß geöffnet und nach erneutem Öffnen in der Kundenakte gefunden. Die EICAR-Prüfdatei wurde gesperrt. Erneute Verarbeitung und Download wurden abgewiesen. |
| Planexport | Für Grabmal und Raum jeweils eine fünfseitige PDF erzeugt und die dargestellten Seiten geprüft |

Für zwei gespeicherte Planrevisionen wurde zusätzlich die lokale Blender-Vorschau mit 1.440 × 1.080 Pixeln erzeugt und visuell geprüft. Beide Ausgaben verweisen auf den erwarteten Revisionshash. Der Grabstein erscheint ohne bestätigte Hersteller-Schriftkonturen als neutraler Stein. Im interaktiven Studio wurde die sichtbare Entwurfsschrift separat mit einem Pixeltest geprüft. Der Raumtest zeigt die vier gespeicherten Wände. Die beiden Vorschauen belegen die Modellgeometrie.

Die 401 Seitenaufrufe verteilen sich auf Inhaber (74), Büro (47), Finanzen (46), Planung (38), Disposition (20), Werkstatt (23), Außendienst (24), Personal (15), Steuerberatung (26), Technikadministration (5) und Superadministration (83). Das externe Kundenportal hat einen eigenen Browsertest.

Die Browserprüfung deckt Desktop- und Mobilfenster, Hell- und Dunkelmodus, Tastaturfokus und automatische Barrierefreiheitstests ausgewählter Arbeitswege ab. Die KI-Browsertests verwenden reproduzierbare Antworten. Die ergänzende Modellprüfung ruft OpenAI mit synthetischen Daten auf. Für diese Abnahme wurde kein kostenpflichtiges fotorealistisches Bild erzeugt. Eine Vor-Ort-Erprobung mit Mitarbeitenden und physischen iOS-Geräten steht separat aus.
