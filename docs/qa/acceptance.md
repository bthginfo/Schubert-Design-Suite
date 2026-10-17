# Ausführliche technische und UX-Abnahme

Stand: 17.10.2026. Alle Geschäftsvorgänge in diesen Tests verwenden ausdrücklich synthetische, getrennte QA-Daten. Produktive Kunden-, Bank-, Mitarbeiter- oder Herstellerdaten werden dadurch nicht freigegeben.

## Gesamtstand

Die vollständigen Fachbereiche sind implementiert: CRM, Angebote/Aufträge, Rechnungen und E-Rechnungen, Zahlungsausgleich und DATEV, Lieferanten/Einkauf, Lager/Inventur, Dokumente/Import, Grabmal- und Raumstudio, Kundenportal, Personal/Disposition/Zeiten, Assistent, Controlling, Administration, Datenschutz und Wiederherstellung. Ein sichtbarer Dialog ersetzt keinen Integrationsnachweis. Die nachstehenden Prüfungen unterscheiden tatsächliche Datenbank-/Provideraufrufe und ausdrücklich kontrollierte Fehlerantworten.

Der abschließende lokale Stand umfasst 202 erfolgreiche automatische Tests in 36 Dateien. Zusätzlich wurden 15 echte PostgreSQL-Integrationsfälle zu Mandantentrennung, Berechtigungen, Transaktionsabbruch, Idempotenz, Event-/Auditfolgen, Zeit-/Offlinekonflikten und unveränderlichen Geschäftsständen ausgeführt. Der abschließende Gesamtcheck endete mit null Fehlern und null Warnungen. Die Hauptanwendung und ihre privaten Queue-Funktionen wurden auf Vercel vollständig gebaut und praktisch geprüft.

## Oberflächen, Bedienbarkeit und Schaltflächen

[Ausführliches Frontendprotokoll](frontend-verification.md) dokumentiert die tatsächlich ausgeführten Formulare, Bestätigungen, Tastatur-/Dialogzustände, Rollenansichten, Downloads, Offlineaktionen und Ansichten bei 375, 768 und 1440 CSS-Pixeln. Jede verbindliche Aktion wartet auf die Serverantwort. Finanz- und Fremdaktionen verlangen eine konkrete Vorschau beziehungsweise Freigabe; unbekannte Ergebnisse bleiben sichtbar.

Geprüft wurden unter anderem Kunden/Anfragen, Angebotspositionen und Alternativen, Annahme mit genauer Originalversion, direkte und angebotsgebundene Aufträge, Nachträge, Liefer- und Abnahmebelege, Teilzahlung und Gutschriftenverrechnung, Preisversionen mit Undo, Bankimport, Berichtssnapshots und rollenabhängige Exporte, eigene Profildaten, Konfiguration, Aufgaben und Mitteilungen. Dialoge halten den Tastaturfokus und stellen ihn beim Schließen zurück. Hilfetexte erklären insbesondere fehlende Fachgrundlagen, unbekannte Werte und nächste Schritte.

Die Studios haben ein separates [Abnahmeprotokoll](studio-verification.md): 95 protokollierte Browserfälle, 14 isolierte reale SQL-Fälle, 89 gezielte TypeScript-Tests und 6 Python-Vertragstests. Enthalten sind Auswahl/Mehrfachauswahl, echte Zeiger- und numerische Bearbeitung, Sperren, gemeinsame Raumtopologie, Öffnungen/Nischen, Undo, Quellen-/Konturimport, Produktfilter, Revisionsvergleich, Kameraansichten, Freigaben, gebundene PDF/BOM/SVG-Ausgaben sowie tatsächliche Cloud-Renderverarbeitung. Unveränderte Revisionen werden wiederverwendet. Es gibt keine künstliche monatliche Renderstückzahl.

## Tatsächlich ausgeführte Geschäfts- und Infrastrukturprüfungen

| Bereich | Tatsächlicher Nachweis | Ergebnis |
|---|---|---|
| Rechnungsfolge | Abschlag, Teilzahlung, echte Teilleistung, Gutschrift, Schlussrechnung, Korrektur und unveränderliche Originale | Bestandene echte PostgreSQL-/private Blob-/PDF-Strecke; [Werte](evidence/finance.json) |
| Finanzergänzungen | Gemischte 19/7-Prozent-Gruppen, öffentlicher Empfänger, BT-29, Mahnung/Streitfall, DATEV mit Originalen | Vier Fälle bestanden; [Nachweis](evidence/billing-extended.json) |
| E-Rechnung | Factur-X PDF/A mit eingebettetem CII und zusätzlich genaue XRechnung-UBL; XSD, CEN- und deutsche Schematronregeln | Offizielle Validatoren tatsächlich ausgeführt, fehlender Pflichtkontakt negativ geprüft; [Nachweis](evidence/xrechnung.json) |
| Dokumentdienst | Echter Virenscan, EICAR-Sperre, OCR/Quellenvorschau, Audioinspektion, sichtbare Konzeptkennzeichnung | Cloud-Dienst tatsächlich aufgerufen; [Nachweis](evidence/document-capabilities.json) |
| Lager/Inventur | Konkurrierende Einzelstückreservierung, Zuschnitt mit Rest/Verschnitt und Wertfortführung, widersprüchliche Rohzählungen, Stichtagsbewegungen | Vier echte isolierte Fälle bestanden; [Nachweis](evidence/inventory.json) |
| ZIP/Altdaten | Privates ZIP mit sicherer Inventarisierung ohne ungewollte OCR, explizite Einzelübernahme/Ausschluss, Abschluss, Dubletten, Cutover-Sperre und Freigabe | Sechs echte Fälle bestanden; [Nachweis](evidence/imports.json) |
| Historische Rechnungen | Originaldatei und Originalnummer/-datum, offene Anfangsposten, wiederholter Import und Cutover-Summen | Drei echte Fälle bestanden; [Nachweis](evidence/historical-import.json) |
| Einstellungen | Steuer-/DATEV-Grundlagenwechsel entzieht alte Freigabe, frische Bestätigung, deaktiviertes Modul sperrt direkte Commands, abgeschlossene Inventur unveränderlich | Vier echte Fälle bestanden; [Nachweis](evidence/configuration.txt) |
| Mail | Freigegebene exakte Anlagenversion, verlorene Antwort, Fencing, unbekannter Ausgang, Wiederentwurf mit Nachweis, fehlende SMTP-Konfiguration | 22 tatsächliche PG-Zustandsprüfungen einschließlich terminalem Autorisierungsfehler; null SMTP-Aufrufe, kein behaupteter Empfang |
| Datenschutz | Zweckbindung/Rechtsperre, konkrete Freigabe, tatsächliche private Dateientfernung und unabhängiger Löschbeleg | Reale Browser-/Worker-/Blob-Strecke; Einzelheiten im Frontendprotokoll |
| Backup/Restore | Verschlüsselter unabhängiger Blob-Store, PostgreSQL-Readonly-Rolle, signiertes Manifest, Originalhashes, spätere Löschbelege, isolierter Restore | 197 Tabellen, 2676 Zeilen, 375 Fremdschlüssel, 36 Originale; RPO 62 s, RTO 97 s im konkreten Test; [Nachweis](evidence/restore.json) |
| Produktionsschema | Alle 32 Migrationen inklusive Checksummen, eingeschränkte Sicherungsrolle, Maintenance wieder getrennt | Tatsächlich nachgelesen; keine Besitzerverbindung im Hauptserver |

Die Mengen-/Zeitangaben sind Messungen dieser synthetischen Testbestände. Sie sind keine allgemeine SLA, keine fachliche Rechtsfreigabe und keine Aussage zu beliebig großen Archiven.

## Bewusst konkrete Grenzen der Abnahme

- SMTP wird vom Betreiber nachgetragen. Senden bleibt bis zur gültigen Verbindung gesperrt; eine tatsächlich angenommene Nachricht oder Inboxzustellung wurde nicht vorgetäuscht.
- Fachpersonen müssen Bank-/Steuer-/DATEV-/Vertrags-/Aufbewahrungsgrundlagen bestätigen. Ein Kanzlei-Testimport und echte Einkaufs-/Lieferantenbelege ergänzen die technischen Prüfungen.
- Herstelleroriginale, Nutzungsrechte, genaue Glyphen-/Bohrdaten und personengebundene Fertigungsqualifikation sind echte Betriebsdaten. Synthetische Geometrietests verleihen keine Herstellerfreigabe.
- Offline wurde mit echten Browsern/IndexedDB und konkurrierenden Tabs sowie kontrollierten Netzwerkantworten geprüft. Physische Android-/iOS-Geräte, tatsächliche Speicherverdrängung, Service-Worker-Wechsel mit ausstehender Outbox und Bedienung mit Screenreader gehören zur anschließenden Geräte-/Mitarbeiterabnahme.
- Private Originale und Archive sind mit Versionen, SHA-Nachweisen und Anwendungssperren gesichert. Auf ausdrücklichen Nutzerwunsch bleibt es bei Neon und Vercel Blob; providerseitiges Object Lock wird nicht behauptet.
- Personenbezogene aktuelle Stammdaten und frei löschbare Dokumente haben geprüfte Erasure-/Restore-Sperren. Gesetzlich aufzubewahrende unveränderliche Finanzoriginale bleiben innerhalb ihrer geprüften Frist erhalten; eine pauschale Löschung aller historischen Finanzinhalte wird nicht behauptet.

## Veröffentlichung

Produktivadresse: [Schubert Design Suite](https://schubert-design-suite.vercel.app). Das GitHub-Repository enthält den geprüften vollständigen Quellbestand und eine erfolgreiche Qualitäts-Pipeline. Die Produktionsdatenbank hat alle 32 Migrationen; der Runtimezugang besitzt keine Besitzer-/RLS-Umgehungsrechte.

Tatsächlich auf der veröffentlichten Anwendung geprüft:

- Superadmin-Anmeldung, frische Passphrase bei technischen Einstellungen, bestehender OpenAI-Zugang ohne Anzeige des Geheimnisses, sichere spätere Austauschmöglichkeit. Öffentliche Schubert-Firmendaten sind vorbereitet; fachliche Freigaben wurden dadurch nicht erteilt.
- Luna-Verbindungstest und normale Assistenz aus dem tatsächlichen Arbeitsbereich: zwei abgeschlossene Aufrufe. Vertiefte Planprüfung mit Sol6.1 benennt im synthetischen leeren Entwurf fehlende Maße und schlägt keine geratenen Maße oder automatische Geschäftsänderung vor.
- Tatsächliche Sprachtranskription einer selbst erzeugten synthetischen Aufnahme von4,71Sekunden; der erkannte Text verlangt weiterhin Prüfung. Kein Personalgespräch wurde verwendet.
- Ein tatsächliches Konzeptbild mit GPT Image2.5 Flare: Kostenvorschau0,326905USD, Ausgabe1024×1024, tatsächlich0,007275USD. Die private gespeicherte Ausgabe enthält sichtbar „KI-Visualisierung · Konzept · keine technische Zeichnung“ und die gebundene Planrevision. Ohne Kostenbestätigung verweigert der Server den Start mit409.
- Alle fünf Live-KI-Aufrufe zusammen:0,011087USD bestätigt,0USD offen reserviert, Monatsbudget5USD. Diese konkreten Messwerte sind keine Preisgarantie für andere Aufgaben. Automatische Aufladung wurde durch die App nicht aktiviert.
- Neu hochgeladenes eigenes352-Byte-TXT: tatsächlicher privater Upload → Quarantäne → Cloud-Virenprüfung → Textauswertung → verfügbare Originalversion. Die beiden Verarbeitungsschritte wurden automatisch über die echte Vercel-Warteschlange abgeschlossen.
- Authentifizierter Originalabruf200 mit exakt passendem SHA; Bereichsabruf206 für16Bytes; unzulässiger Mehrfachbereich416; derselbe Originalabruf ohne Anmeldung401. Keine private API-Antwort wird im Service-Worker-Cache gespeichert.
- Tatsächlicher privater Archivtest und mehrere signierte verschlüsselte Produktionssicherungen in der getrennten Ablage abgeschlossen. Der erste Produktionsstand enthält203Tabellen,188Zeilen und ein Original. Spätere Stände enthalten die zusätzliche synthetische Abnahme. Die frühere isolierte Restore-Übung bleibt separat dokumentiert.
- Tägliche Nachholprüfung am authentifizierten tatsächlichen Vercel-Endpunkt erfolgreich. Der Runtimezugang benötigt dafür kein DELETE-Recht auf das Speicherjournal. Abgelaufene ungebundene Uploads werden erst nach bestätigter privater Anbieterentfernung freigegeben; registrierte Originale bleiben ausgeschlossen. Vier zusätzliche echte PG-/Blob-Fälle prüfen dies einschließlich wiederholter Fälligkeitsereignisse.
- Zwei zeitgleiche Bildanfragen mit verschiedenen Command-Schlüsseln erzeugen in der isolierten PG-Prüfung genau einen Auftrag vor jeder Anbieterübermittlung. Zwei Prüfungen bestanden, null Anbieteraufrufe; keine künstliche monatliche Renderstückzahl eingeführt.
- Tatsächlich aktivierter Service Worker, gecachte Offline-Zeitseite und Wiederöffnung von offline-time.html bei abgeschalteter Browserverbindung. Es wurden dabei keine produktiven Arbeitszeiten begonnen. Die bereits dokumentierten Offline-Aktions-/Konfliktfälle liefen im getrennten QA-Bestand.
- Sichtprüfung auf375Pixeln und am Desktop. Die zusätzlichen automatischen WCAG-A/AA-Prüfungen der tatsächlich geöffneten Haupt-, Einstellungs-, Integrations- und leeren Studioansichten wurden nach Kontrast-/Tastaturkorrekturen wiederholt. Sie ergänzen die beschriebenen Geräte-/Screenreaderprüfungen und ersetzen diese nicht.

[Produktionsnachlese ohne Geheimnisse](evidence/production.json), [Nachholprüfung](evidence/reconciliation.json), [Bild-Konkurrenzprüfung](evidence/visualization-concurrency.json). Die synthetische Live-Planung und ihr eigener Nutzungsnachweis sind deutlich als Abnahme ohne Fertigungsfreigabe bezeichnet.
