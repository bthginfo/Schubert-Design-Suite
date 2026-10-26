# KI-Bearbeitung, Papierzeichnungen und Büroentwürfe · 26.10.2026

Die KI kann berechtigte Entwürfe in beiden Planungsstudios und den angebotenen Bürobereichen vorbereiten. Die bisherigen festen sechs Planaktionen und die Bearbeitungssperren in „Prüfen“ und „Präsentieren“ sind entfernt. Wortlaut, Maße und Auswahl sind ausdrücklich wählbare Einschränkungen. Angeforderte Wortlautänderungen, zusätzliche Inschriften und Geburts-/Sterbezeichen `*` / `†` benötigen keine erneute Gestaltungsbestätigung. Historische Originalrevisionen bleiben erhalten; eine beauftragte Änderung am Bestand wird als neue geplante Fassung geführt.

## Bedienung

- **Foto / PDF** fügt private Dateien direkt im Chat hinzu; Einfügen von Bildern und Ablegen von Dateien werden ebenfalls unterstützt. Originalprüfung und lesbare Bildaufbereitung laufen mit Statusanzeige. Pausierte Vorbereitung lässt sich mit demselben Original fortsetzen. Bei einem Seitenwechsel ist die alte Bildseite nicht mehr sendefähig.
- **Antwort senden** übermittelt ausgefüllte Rückfragen direkt. Fehler und Abbruch erhalten die Antworten; es gibt keinen zweiten Übernahme-Schritt und keinen automatischen kostenpflichtigen Wiederholungsaufruf.
- Zusammengehörige Kunden-, Auftrags- und Planungsentwürfe werden über die normalen Fachaktionen angelegt. Die Vorschau zeigt verständliche Feldnamen, neue Beziehungen und den neuen Plan. Nach der Anwendung führen Links direkt zu den erzeugten Akten. Originale bleiben über Dokumentverknüpfungen auffindbar.
- Eine Skizze kann als ungeprüfte, unskalierte Vorlage in eine neue Grabmal- oder Raumplanung aufgenommen werden. Lesbare, ausdrücklich vorgegebene Maße werden als ungeprüfte Planmaße übernommen. Aus Bildpixeln entstehen keine bestätigten Abmessungen.
- Bildwünsche öffnen das vorhandene Bildstudio mit übernommener Beschreibung und dem aktuellen gespeicherten Planstand. Die tatsächliche Kosten- und Rechteprüfung bleibt dort erhalten.
- Rückgängig arbeitet auch für komplexe KI-Änderungen. Der Server erstellt eine neue Revision des unmittelbar vorigen Stands und verweigert das Überschreiben späterer Arbeit. Tastatur-Rückgängig wartet einen bereits laufenden Speichervorgang ab.

## Fachliche und technische Prüfung

Der serverseitige Aktionskatalog bindet Änderungen an sichtbare Datensätze und Versionen. Zusammengesetzte Entwürfe verwenden dieselben Handler, aktuellen Mitgliedschaften, Rollen, Modulschalter, Versionsprüfungen, Audit- und Outbox-Einträge wie manuelle Arbeit; ihre Erstellung ist atomar und wiederholbar ohne doppelte Datensätze. Auch der Abruf eines bereits ausgeführten zusammengesetzten Ergebnisses prüft aktuelle Fachrechte erneut. Datei- und Vorschauversion, Hash, Seite, Scanstatus und Hersteller-Nutzungsumfang bleiben gebunden. Zurückgezogene Quellen lassen die gesamte Erstellung zurückrollen.

Die Normalisierung ergänzt editierbare Entwurfswerte und echte lokale Kennungen, hält wörtliche Namen von Kennungsersetzungen getrennt und gleicht bei geänderter Steinform die zugehörigen treibenden Planmaße ab. Zusammengehörige Planbefehle werden gemeinsam validiert und übernommen. Eine technische Bestätigung, Rechnungsausstellung, Veröffentlichung, Zahlung, Rollenänderung oder externe Nachricht wird damit nicht als KI-Aktion freigegeben.

## Nachweise

| Prüfung | Ergebnis |
| --- | --- |
| Svelte / TypeScript | 0 Fehler, 0 Warnungen |
| Unit-Tests | 424 bestanden in 67 Dateien |
| PostgreSQL | 75 Integrationsprüfungen bestanden; einschließlich entzogener Fachrechte beim Receipt-Abruf, Papierquelle, atomarem Kundenauftrag, komplexem Plan-Undo und neuem Vorschlag nach bereits angewendetem Cache-Ergebnis |
| Browser | 77 verschiedene Szenarien abgedeckt: 74 bestanden im großen Lauf; danach alle 16 betroffenen Szenarien bestanden. Nach dem zusätzlich geprüften kalten Studiostart bestanden alle zehn betroffenen Szenarien erneut. Kein einzelner fehlerfreier 77er-Abschlusslauf wird behauptet. |
| PDF | Beide technischen Studio-PDFs und das konkrete PDF nach KI-Inschriftänderung erzeugt, gerastert und visuell geprüft; beide Namen sowie `*` / `†` exakt enthalten; deutsche Ausrichtung und offene Maßangaben geprüft |
| Produktionsbuild | Erfolgreich; keine neue SQL-Migration |
| Quellprüfung | Keine gefundenen Zugangsdaten; Anforderungsverfolgung unverändert vollständig |

Der große Browserlauf zeigte einen verlorenen Rückgängig-Tastendruck während des Speicherns, eine falsche Seitenleisten-Erwartung im Test und einen vorübergehenden HMR-Renderfehler des Entwicklungsservers. Rückgängig wartet jetzt auf den Speichervorgang; der Nachlauf nach sauberem Neustart bestand. Beim zusätzlichen Kaltstart wird die KI-Eingabe erst mit geladenem Planstand freigegeben. Angewendete oder abgelaufene Vorschläge werden auch bei der Budgetreservierung nicht erneut als ausführbares Cache-Ergebnis zurückgegeben. Es gibt weiterhin keinen automatischen kostenpflichtigen Wiederholungsaufruf.

Belege: [Auftrag aus Papierfoto mobil](ai-full-edit-2026-10-26/evidence/office-paper-order-mobile.png), [Bildübergabe](ai-full-edit-2026-10-26/evidence/sketch-image-handoff.png), [PDF der geänderten Inschriften](ai-full-edit-2026-10-26/evidence/ai-inscriptions.pdf), [wörtliche PDF-Prüfansicht](ai-full-edit-2026-10-26/evidence/ai-inscription-sheet.png), [Grabmal-PDF](ai-full-edit-2026-10-26/evidence/memorial.pdf), [Raum-PDF](ai-full-edit-2026-10-26/evidence/room.pdf). Dateigrößen und SHA-256 stehen im [Manifest](ai-full-edit-2026-10-26/evidence/manifest.json).

Lokale Protokolle und nach Veröffentlichung die genaue Git-/CI-/Vercel-Zuordnung liegen unter `work/ai-full-edit-2026-10-26/`. Produktion: https://schubert-design-suite.vercel.app.

Die PostgreSQL-Prüfungen verwenden die wirklichen Commands, Rollen, Revisionen, Dokumentverknüpfungen und Transaktionen. Der SDK-Test verwendet das echte OpenAI-SDK mit kontrollierter Offline-Antwort und prüft Anfragen, Normalisierung und Abrechnung; er behauptet keinen Live-Modellaufruf. Im neuen Browserablauf sind Upload-, Scan-/Vorschau- und Modelltransport als kontrollierte Testdaten abgegrenzt; die anschließende Fachaktion, Anmeldung, Speicherung, Dokumentanzeige und Rücknahme laufen gegen die echte lokale Anwendung. Ein solcher Test belegt keine Erkennungsquote für unbekannte Handschriften. Reale Herstellerfeeds und externe Freigaben werden nicht simuliert.

Bestehende Testdaten bleiben erhalten. Vor den Integrationsläufen wurde ein privates Datenbankbackup erstellt. Für diese Änderung ist keine SQL-Migration erforderlich.
