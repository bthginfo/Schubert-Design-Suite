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

- 278 Unit-Tests in 50 Dateien bestanden.
- 34 echte PostgreSQL-Prüfungen bestanden. Zusätzlich geprüft: 31 gleich datierte Projekte über zwei Seiten ohne Duplikate; Suche nach älteren Projekten; mehr als 25 Monatszuordnungen; Überlappungen und Datumsgrenzen; gespeicherte Raum-/Grabmalvorschläge mit Versionskonflikt; idempotenter Herstellerimport, Mandantentrennung, unveränderliche Quellen und gesperrte Fertigungsfreigabe.
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

Die erste tatsächliche Erstentwurfsanfrage mit Luna wurde nach dem Anbieteraufruf wegen eines ungültigen Vorschlagsformats abgewiesen. Kein Plan wurde geändert; 0,000243 USD wurden als tatsächlicher Verbrauch erfasst. Erstentwürfe erhalten deshalb ein eigenes strikt strukturiertes Antwortfeld mit vollständigen Maßangaben. Ziel und Basisrevision werden ausschließlich aus dem aktuellen Serverkontext gebunden. Abgewiesene Modellvorschläge werden als ungültige Antwort markiert, ohne automatische kostenpflichtige Wiederholung. 278 Unit-Tests bestanden, einschließlich der Bindung und abgelehnter unvollständiger Maße.

## Tats?chliche Live-Abnahme nach der Formatkorrektur

Zwei neue Erstentw?rfe wurden auf der Produktivadresse mit gpt-6-luna angefragt, ausdr?cklich ?ber den Vorschlagsendpunkt ?bernommen und nach erneutem ?ffnen als bearbeitbare Geometrie best?tigt: rechteckiger Raum und stehender Grabmalstein ohne Inschrift. Erfasste Kosten anhand der Anbieternutzung und hinterlegten Preise: 0,00022105 USD und 0,0002138 USD.

Aus den beiden gespeicherten Revisionen wurden anschlie?end echte Bildauftr?ge mit gpt-image-2.5-flare erzeugt, privat gespeichert und ?ber die authentifizierte Anwendung heruntergeladen. Beide Ergebnisse haben 1536 ? 1024 Pixel in mittlerer Qualit?t. Das Raumkonzept (0,032375 USD) und das Grabmalkonzept (0,02755 USD) wurden visuell auf Materialstruktur, plausible Beleuchtung, saubere Bildausgabe und Konzeptkennzeichnung gepr?ft. Dies belegt diese zwei Ausgaben; es ist keine Garantie ma?haltiger oder geometrisch identischer Modellbilder.

Die anschlie?ende Pr?fung korrigierte au?erdem die Auswahl automatisch erzeugter Komponenten im Begleiter und die Zuordnung gro?er Fotovorlagen zum Bildauftrag. Chat-Vorschauen bleiben auf 512 Pixel begrenzt, Fotobearbeitung nutzt bis 1440 Pixel. Bereits vorbereitete ?ltere Bildvorlagen bleiben mit derselben Quellen- und Hash-Pr?fung verwendbar. 278 Unit-Tests und 34 PostgreSQL-Pr?fungen bestanden.

## Live-Fotobearbeitung und Kostenabschluss

Der tats?chliche Browserablauf ?Dieses Bild weiterbearbeiten? wurde an dem zuvor erzeugten synthetischen Grabmalbild vollst?ndig durchlaufen: 1440-Pixel-Vorlage vorbereiten, sichtbares Quellbild pr?fen, ?nderungswunsch eingeben, Nutzungsrechte best?tigen, Kosten pr?fen, den einzelnen Auftrag ausdr?cklich best?tigen und gespeicherte Ausgabe abrufen. gpt-image-2.5-flare ?nderte den dunklen Stein und die Einfassung zu hellem Granit. Perspektive, Gartenumgebung und Bepflanzung blieben visuell weitgehend erhalten. Die Ausgabe mit 1536 ? 1024 Pixeln wurde gepr?ft; gesch?tzte Kosten anhand der tats?chlichen Anbieternutzung: 0,02672 USD. Dies war die Bearbeitung eines synthetischen Ausgangsbilds ohne Bestandsinschrift, kein Nachweis f?r den pixelgenauen Erhalt gesch?tzter Namensz?ge.

Die f?nf erfolgreichen Anbieteraufrufe dieser Abnahme (zwei Chatentw?rfe, zwei Planbilder, eine Bildbearbeitung) erfassten zusammen 12.442 Tokens und rund 0,08708 USD. Einschlie?lich des zuvor abgewiesenen Modellformats sind es rund 0,087323 USD. Der gesamte erfasste App-Monatsverbrauch lag beim Abschluss bei 0,098410 USD; offene Reservierung 0 USD. Die Betr?ge stammen aus hinterlegten API-Preisen und Anbietertokens, nicht aus einer finalen Anbieterrechnung.

Ein GitHub-Testlauf deckte eine Annahme des neuen Vorschautests auf: Eine frische CI-Datenbank enth?lt noch keine verf?gbaren PDF-/Fotodokumente. Der Test verwendet jetzt eigene klar synthetische Metadaten, pr?ft die tats?chlichen Befehle und entfernt sie im finally-Block. Keine Dateiverarbeitung oder externe Speicherung wird dadurch als erfolgreich simuliert. Alle 34 PostgreSQL-Pr?fungen liefen mit dieser isolierten Testgrundlage erfolgreich. Der erg?nzte Browserfall best?tigte au?erdem, dass erzeugte Komponenten-IDs tats?chlich an den Begleiter gesendet werden.
