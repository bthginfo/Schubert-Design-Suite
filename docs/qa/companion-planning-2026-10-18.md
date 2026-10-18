# Begleiter, Planung und Bedienung — 18.10.2026

## Geprüfter Umfang

- Begleiter als Desktop-Seitenbereich und mobiles Fenster mit geschütztem Fokus. Seitenhilfe funktioniert ohne KI. Vorbereitete Fragen füllen zunächst nur das Eingabefeld. Gespräche bleiben während der Sitzung je Kontext erhalten; höchstens sechs kurze Beiträge werden für den nächsten Aufruf übermittelt. Aktuelle Berechtigungen und Revisionen bleiben serverseitig maßgeblich.
- Ein erster rechteckiger Raum oder Grabmalstein kann nach vollständigen Maßangaben als prüfbarer, editierbarer Vorschlag entstehen. Fehlende Maße werden nicht geraten. Speicherung erfordert die ausdrückliche Bestätigung; vorhandene Varianten und veraltete Revisionen sind geschützt.
- Einführung auf tatsächlichen Seiten mit hervorgehobenen Bedienelementen, Fortsetzung, Neustart, Rollenfilter und abschließender Darstellungsauswahl. Fehler bleiben sichtbar; die Darstellung wird beim Abschluss atomar gespeichert.
- Monats-, Wochen- und Tagesdisposition mit überlappenden Einsätzen und Mitarbeiterfilter. Manuelles Nachtragen ist vor dem weiterhin vorhandenen Timer angeordnet. Kompakte Bereichsnavigation, lesbare Akkordeons, umbrechende Aktionen und hell/dunkel passende Auswahlfarben.
- Monatsdiagramme mit Nullbasis, Belegverknüpfung, Tastaturbedienung, zugänglicher Tabelle und ausdrücklichen Datenlücken. Keine gefüllten Balken als Ersatz für fehlende Werte.
- Planungen sind über die gesamte berechtigte Sammlung suchbar und werden mit begrenzten Folgeseiten geladen. Der Detailabruf lädt keine unnötige Projektliste. Sichtbare Wände lassen sich umschalten, ohne die gespeicherte Geometrie zu ändern.
- Bildstudio für gespeicherten Plan oder vorhandenes Foto, private Uploads, konkrete Bildseite, Qualität und Format, Nutzungsbestätigung, Kostenvorschau und erneute Bearbeitung fertiger Bilder. Planvorlagen werden deterministisch aus der gespeicherten Revision erstellt. Keine automatische kostenpflichtige Wiederholung bei unklarem Ergebnis.
- 28 veröffentlichte Grundmodelle von antoniolupi, Duravit und Kaldewei mit Originalquellen und nachvollziehbaren Abmessungen. Dies ist eine erste belegte Auswahl, kein vollständiger Herstellerkatalog. Unbekannte Maße, Preise und Verfügbarkeit bleiben offen; Quellenreferenzen ersetzen keine technische Freigabe.

## Technische Nachweise

- 277 Unit-Tests in 50 Dateien bestanden.
- 33 echte PostgreSQL-Prüfungen bestanden. Zusätzlich geprüft: 31 gleich datierte Projekte über zwei Seiten ohne Duplikate; Suche nach älteren Projekten; mehr als 25 Monatszuordnungen; Überlappungen und Datumsgrenzen; gespeicherte Raum-/Grabmalvorschläge mit Versionskonflikt; idempotenter Herstellerimport, Mandantentrennung, unveränderliche Quellen und gesperrte Fertigungsfreigabe.
- Svelte-/TypeScript-Prüfung ohne Fehler oder Warnungen; Produktions-Build erfolgreich.
- Reale Browserabläufe: Einführung einschließlich Fehler und mobiler Rollenführung; persönliche Darstellung; Feedback; Hilfe; Verbrauch; Nummernkreise; Monatsdisposition und Bereichsnavigation; manuelles Nachtragen und Offline-Timer; Grundriss/Grabmal mit erneutem Öffnen, 3D, Stückliste und echten PDF-Exporten.
- Begleiter: Seitenhilfe ohne Anbieteranfrage, explizites Senden, begrenzter Verlauf, Rückkehr zum ursprünglichen Gespräch, mobiler Fokus und automatisierte WCAG-A/AA-Prüfung. Nur die kostenpflichtige Chat-Antwort wurde in diesem gezielten Browsertest ausdrücklich simuliert; echte Anbieterprüfungen des vorigen Standes sind separat in acceptance.md dokumentiert.
- Bildstudio: echte serverseitige Kostenvorschau, widerrufene Vorschau nach Qualitätswechsel, Fotoauswahl und Nutzungsprüfung, sichtbarer Fehler und erreichbare mobile Rückkehr. Kein kostenpflichtiger Bildauftrag in diesem Testlauf. Die neue Bildqualität kann deshalb nicht aus den UI-Tests als fertig visuell abgenommen gelten.
- Zwei tatsächliche Planungs-PDFs mit je fünf Seiten geprüft. Keine Texte außerhalb der Seiten; gerenderte Ansichten, Maße und Maßstäbe visuell kontrolliert. Die bestehende Raumflächendefinition anhand der Wandachsen bleibt ausdrücklich von lichten Innenmaßen unterschieden.
- Repräsentative Ansichten bei 1440 und 375 Pixeln, einschließlich heller und dunkler Diagramme, Studioeingang und Herstellerliste, ohne horizontalen Seitenüberlauf oder schwere/kritische automatisierte WCAG-Befunde.
- Produktionsschema 41 und sämtliche Migrationsprüfsummen bestätigt. Die vorübergehende Neon-Verbindung am vorhandenen Wartungsprojekt wurde anschließend getrennt; es verblieben keine automatisch eingebundenen Datenbankvariablen dort.

## Unabhängige Designprüfung

Die frische Impeccable-Sichtprüfung bewertete 15 gültige Ansichten. Drei Befunde wurden korrigiert: kleine mobile SVG-Beschriftungen und schwer auffindbare spätere Monate; mobile Überlagerung durch Feedback; fehlende zentrale Produktdokumentation. Mobile Diagramme zeigen jetzt lesbare Monatszeilen mit proportionalen Balken und exakten Werten. Feedback hat einen eigenen Platz in der bestehenden unteren Navigation. PRODUCT.md hält bestätigte Produktanforderungen und Testgrenzen fest. Die fokussierte Nachprüfung bewertete alle drei Befunde als **resolved**, ohne sichtbare Regression aus diesem Korrektursatz, abschließend **ship**. Dieser Befund ist auf die geprüften Korrekturen begrenzt.

Zwei betroffene Browserabläufe wurden erneut bestanden, einschließlich tatsächlicher mobiler Feedback-Öffnung, ausgeblendetem Floating-Duplikat, 14-Pixel-Monatsbeschriftungen, zehn erreichbaren Monaten und automatisierter WCAG-Prüfung. Die bestehende Gestaltung wurde dokumentiert, ohne alte gestalterische Abweichungen zu neuen Regeln zu erklären.

## Grenzen und Betrieb

Die grafische KI-Ausgabe bleibt eine Konzeptdarstellung. Geschützte Bestandsinschrift benötigt vor Kundenverwendung das bestehende Verfahren zum Erhalt der Originalpixel und fachliche Kontrolle. Ein Foto darf nicht als vermessene technische Zeichnung ausgegeben werden. Physische Geräte, Screenreader und fachliche Betriebsfreigaben ergänzen die technische Abnahme.

Keine feste monatliche Renderstückzahl, kein neuer kostenpflichtiger Dienst und keine automatische Guthabenaufladung. Die bestehenden einstellbaren Geldbudgets bleiben aktiv. Persönliche Hilfe, Darstellung und Kalender verursachen keine Modellaufrufe. Der ausdrücklich gewünschte betriebliche Testdatensatz bleibt erhalten.

## Live-Nachprüfung des Modellformats

Die erste tatsächliche Erstentwurfsanfrage mit Luna wurde nach dem Anbieteraufruf wegen eines ungültigen Vorschlagsformats abgewiesen. Kein Plan wurde geändert; 0,000243 USD wurden als tatsächlicher Verbrauch erfasst. Erstentwürfe erhalten deshalb ein eigenes strikt strukturiertes Antwortfeld mit vollständigen Maßangaben. Ziel und Basisrevision werden ausschließlich aus dem aktuellen Serverkontext gebunden. Abgewiesene Modellvorschläge werden als ungültige Antwort markiert, ohne automatische kostenpflichtige Wiederholung. 277 Unit-Tests bestanden, einschließlich der Bindung und abgelehnter unvollständiger Maße.
