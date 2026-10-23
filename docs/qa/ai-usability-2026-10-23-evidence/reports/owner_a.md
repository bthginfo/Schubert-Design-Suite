> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Nutzertest owner_a · Inhaber/Steinmetzmeister

Simulierte Testperson: Andreas, 55, Geschäftsführung; begrenzte Bürozeit. Test am 23.10.2026, Desktop 1440 × 1000. Sitzung 2026-10-23T13:07:24.934Z bis 2026-10-23T13:16:51.802Z (rund 9½ Minuten), etwa 69 Browseraktionen einschließlich Inspektion, Screenshots und Schließen. Tatsächliche Nutzung ausschließlich über Browser-ID owner_a. Keine Anwendungssourcen, APIs, Datenbanken oder fremden Berichte gelesen.

## Zielstatus

| Ziel | Status | Ergebnis |
| --- | --- | --- |
| G1 Morgenüberblick | Teilweise erreicht | Einsätze, Zieltermine und wirtschaftliche Warnsignale gefunden. Eine nachvollziehbare Priorisierung der wichtigsten offenen Aufgaben gelang nicht. |
| G2 Vorgangskette | Erreicht mit Umweg | Kunde, angenommenes Angebot, Auftrag, fehlende Planung und vorhandener Rechnungsentwurf konnten zusammengeführt werden. |
| G3 Studios und Freigabegrenzen | Erreicht | Beide Studios praktisch geöffnet; eigene Entwürfe angelegt, Proberaum übernommen, Freigabegrenzen gelesen und ins Tagesgeschäft zurückgekehrt. |

Meine drei nächsten Handlungen aus dem sichtbaren Datenstand:

1. **Aufmaß und Planungszuständigkeit für AUF-2026-00008 klären.** In der Auftragsakte stehen „Aufmaß offen“ und „Noch nicht geplant“, Verantwortlicher und Zieltermin fehlen. Die auf diesen Auftrag gefilterte Studioübersicht zeigt 0 Planungen.
2. **Eine bestätigte Restschätzung für AUF-2026-00008 anfordern.** Quelle: Auswertungen → Daten & Grundlagen, konkrete Karte zu diesem Auftrag. Ohne diese Grundlage würde ich seine Wirtschaftlichkeit nicht beurteilen.
3. **Bankanfangsbestand beziehungsweise Kontowährung mit dem Büro prüfen.** Quelle: Auswertungen → Fälligkeit & Liquidität. Erwarteter Bestand ist dort „Noch nicht bestätigt“, die fehlende Grundlage wird ausdrücklich genannt.

Zusätzlich fand ich in „Alle Aufträge“ für die acht UX-Aufträge AUF-2026-00013 bis 00020 den Zieltermin 26.10.2026. In Heute standen Montage-/Werkstatteinsätze am Testtag um 07:00. Ich kann daraus keine Aussage ableiten, dass keine weiteren dringenden Vorgänge existieren. Die offene Aufgabe „Neue Anfrage bearbeiten“ konnte ich wegen fehlendem verständlichem Zuständigen und fehlendem Quellenlink nicht fachlich einordnen.

## Nachvollzogener Bestandsvorgang

KD-2026-00031 **Synthetischer Integrationstest 1d9d13** → **TEST-AN/26/0125**, angenommen, 200,00 € netto / 238,00 € brutto → **AUF-2026-00008**, Entwurf → **keine Planung zu diesem Auftrag** → Rechnung **Nicht auszustellender Prüffall**, Entwurf, 238,00 € brutto, Fällig am 23.10.2026.

Ich kam aus einer Restschätzungswarnung zum Auftrag, dann zum Kunden. Der Kundenreiter „Verknüpfte Vorgänge“ bot keine bestehenden Vorgänge. Die Angebotssuche nach „1d9d13“ ergab 0 Treffer. Die Suche nach dem Vorhabentitel ergab 12 gleichnamige Angebote. Mit dem Änderungszeitpunkt 12:28 fand ich TEST-AN/26/0125; seine Akte bestätigte den richtigen Kunden- und Auftragslink. Vom Auftrag aus waren Planung und Rechnungen klar gefiltert erreichbar.

Der sichtbare Stillstand liegt beim noch unbestätigten Auftrag, dem offenen Aufmaß und der fehlenden Planung. Der Rechnungsentwurf ist keine ausgestellte Rechnung; ich habe keine Prüf-, Bestätigungs- oder Freigabeaktion an Bestandsdaten ausgelöst.

## Befunde

### owner_a-F1 · P2 · Kundenakte zeigt unter Verknüpfte Vorgänge keine bestehenden Vorgänge

**Erwartung:** Vom bekannten Kunden aus seine bestehenden Angebote, Aufträge und Rechnungen öffnen und den hängenden Vorgang erkennen.

**Beobachtung:** Die Kundenakte KD-2026-00031 zeigte im Reiter Verknüpfte Vorgänge nur den Hinweis, Verknüpfungen über die Übersicht zu öffnen, und Zur Übersicht. Dort standen Kundendaten und Aktionen zum Anlegen neuer Vorgänge. Das bestehende Angebot und der bestehende Auftrag wurden nicht aufgelistet. Diese Beziehungen waren später in der Angebots- und Rechnungsakte sichtbar.

**Auswirkung:** Ich musste zur Angebotsliste wechseln. Suche nach dem eindeutigen Kundennamensbestandteil 1d9d13 lieferte 0 Einträge. Erst Titelsuche mit Vergleich des Änderungszeitpunkts führte zum richtigen Angebot. Für einen kurzen Morgenblick ist dieser Umweg erheblich.

**Weg:** Auftrag AUF-2026-00008 aus einer Auswertung öffnen. → Kundenlink Synthetischer Integrationstest 1d9d13 öffnen. → Verknüpfte Vorgänge wählen. → Über Büro/Angebote erst Kundennamensbestandteil, dann Titel suchen. → Angebot TEST-AN/26/0125 öffnen; dort bestätigt sich der Kunden- und Auftragsbezug.

**Ort:** `/customers/3766613f-7dea-4b9c-a465-b8c7fe562600` · Kategorie product · Sicherheit high.

**Evidenz:** 0005-1792760979341.png (`evidence/owner_a/0005-1792760979341.png`); Beobachtete Suche /quotes?q=1d9d13 mit 0 Einträgen; Beobachtetes Angebot /quotes/b696f83f-f0c8-4ed8-9534-d40ee2f28865.

**Anregung:** Bestehende Vorgänge in der Kundenakte mit Nummer, Status und direktem Link anbieten.

### owner_a-F2 · P2 · Aufgabe nennt eine Kennung als Verantwortlichen und bietet die Originalanfrage nur als Textpfad

**Erwartung:** Bei einer offenen Anfrage erkennen, wer zuständig ist, und die zugrunde liegende Anfrage direkt lesen können.

**Beobachtung:** In Neue Anfrage bearbeiten stand unter Verantwortlich eine lange Kennung. Beschreibung und Untertitel enthielten /inquiries/5447cec8-5e19-47fc-82fa-8f719893e1c2 als normalen Text, keinen Link. Auftrag und Fälligkeit waren leer. Verknüpfte Vorgänge enthielt nur eine allgemeine Rückverweisung auf die Übersicht.

**Auswirkung:** Ich konnte weder die Person zuordnen noch die Anfrage über einen sichtbaren Link öffnen. Beginnen und Erledigen waren deutlich angeboten, obwohl mir der Inhalt zur Entscheidung fehlte; ich habe beide unberührt gelassen.

**Weg:** Heute > Aufgaben ansehen. → Erste sichtbare Neue Anfrage bearbeiten öffnen. → Übersicht und Verknüpfte Vorgänge lesen. → Zur Übersicht zurückkehren.

**Ort:** `/tasks/c81200eb-3eaf-46c1-9d68-09496ee4aa17` · Kategorie product · Sicherheit high.

**Evidenz:** 0003-1792760903569.png (`evidence/owner_a/0003-1792760903569.png`).

**Anregung:** Zuständigen mit Namen und verknüpfte Originalanfrage als benannten Link anzeigen.

### owner_a-F3 · P2 · Auftragsliste zeigt bei acht UX-Aufträgen Kundenschlüssel statt Kundennamen

**Erwartung:** Beim Abgleich von Auftrag und Zieltermin den Kunden ohne Öffnen jeder Akte erkennen.

**Beobachtung:** In Alle Aufträge stand bei den acht UX-Aufträgen AUF-2026-00013 bis 00020 in der Spalte Kunde derselbe lange Schlüssel. In Heute wurden die dazugehörigen Kundennamen lesbar angezeigt. Andere ältere Zeilen der Auftragsliste zeigten ebenfalls lesbare Kundennamen.

**Auswirkung:** Der Blick auf die Zieltermine 26.10.2026 half, aber die Kundenzuordnung blieb in der Liste unverständlich und uneinheitlich.

**Weg:** Aus dem Raumstudio Heute wählen. → Alle Aufträge öffnen. → Kundenspalte der UX-Aufträge und älteren Synthetischer Angebotsablauf-Zeilen vergleichen.

**Ort:** `/orders` · Kategorie product · Sicherheit high.

**Evidenz:** 0014-1792761387671.png (`evidence/owner_a/0014-1792761387671.png`); 0001-1792760845118.png (`evidence/owner_a/0001-1792760845118.png`).

**Anregung:** Den lesbaren Kundennamen in jeder Auftragszeile konsistent auflösen und bei Bedarf verlinken.

### owner_a-F4 · P2 · Morgenübersicht und Aufgabenliste erklären die Dringlichkeit offener Aufgaben nicht

**Erwartung:** Als Inhaber morgens erkennen, welche zwei oder drei offenen Aufgaben heute zuerst Aufmerksamkeit benötigen und weshalb.

**Beobachtung:** Heute zeigte zunächst 43 offene Aufgaben und vier Aufmerksamkeitskarten mit allgemeinen Titeln beziehungsweise einem technischen Testtitel. Auf den Karten fehlten Fälligkeit, Priorität und zuständige Person. Die Aufgabenliste bot Nummer, Aufgabe, Status und Zuletzt geändert, aber keine Dringlichkeitsspalte; die geöffnete Anfrage hatte keine Fälligkeit und Priorität Normal.

**Auswirkung:** Ich konnte konkrete Folgearbeiten aus Auftrags- und Auswertungsakten ableiten, aber die wichtigsten offenen Aufgaben nicht zuverlässig auswählen. Ich musste mehrere Bereiche öffnen und selbst zusammenführen.

**Weg:** Heute und Das braucht Aufmerksamkeit lesen. → Aufgaben ansehen öffnen. → Spalten und die erste Neue Anfrage bearbeiten prüfen.

**Ort:** `/ und /tasks` · Kategorie product · Sicherheit high.

**Evidenz:** 0001-1792760845118.png (`evidence/owner_a/0001-1792760845118.png`); 0003-1792760903569.png (`evidence/owner_a/0003-1792760903569.png`); Beobachtete Aufgabenliste /tasks.

**Anregung:** Dringlichkeit mit Fälligkeit, Priorität, Zuständigkeit und konkretem Vorgangsbezug im Morgenüberblick begründen.

### owner_a-F5 · P2 · Wiederholte Kostensatzwarnungen nennen weder Betroffene noch einen Prüfweg

**Erwartung:** Eine wirtschaftliche Warnung einem Mitarbeiter oder einer Berechnungsgrundlage zuordnen und gezielt zur Klärung weitergehen.

**Beobachtung:** Unter Auswertungen > Daten & Grundlagen erschienen zahlreiche gleichlautende Karten Berechnungsgrundlage ergänzen mit Interner Kostensatz fehlt. Auftragsmarge unvollständig. und Prüfung erforderlich. Diese Karten enthielten keinen erkennbaren Namen und keinen Link. Die danach aufgeführten Restschätzungswarnungen nannten dagegen konkrete Auftragsnummern und Grundlage prüfen.

**Auswirkung:** Ich verstand die allgemeine Ursache der unvollständigen Marge, konnte aus den wiederholten Kostensatzkarten jedoch keine konkrete einzelne Klärung beginnen. Die langen Wiederholungen erschwerten das Scannen.

**Weg:** Auswertungen öffnen. → Daten & Grundlagen 36 wählen. → Kostensatzkarten mit den anschließenden Restschätzungswarnungen vergleichen.

**Ort:** `/reports` · Kategorie product · Sicherheit high.

**Evidenz:** Beobachteter Bildschirmtext /reports, Reiter Daten & Grundlagen 36; 0004-1792760928089.png (`evidence/owner_a/0004-1792760928089.png`).

**Anregung:** Warnungen nach Ursache bündeln und betroffene Personen beziehungsweise Grundlagen mit einem Prüfweg nennen.

### owner_a-F6 · P3 · Wandstärke wirkt mit Unbekannt offenlassbar, ist beim Rechteckraum aber Pflicht

**Erwartung:** Den gemessenen Innenraum zunächst als unvollständigen Entwurf aufnehmen können oder vor dem Absenden klar erfahren, dass neue Wände eine Wandstärke voraussetzen.

**Beobachtung:** Im Dialog Raum anlegen ließ ich Wandstärke ohne Belag leer; das Feld zeigte Unbekannt. Mit ausgefüllter Breite 2500,5, Tiefe 3000 und Höhe 2400 blieb In den Plan übernehmen im Dialog. Die sichtbare native Pflichtfeldmeldung markierte die Wandstärke. Erst nach Eingabe des eigenen Probewerts 120 wurde der Raum angelegt.

**Auswirkung:** Ein zusätzlicher Versuch war nötig. Bei einem echten unvollständigen Aufmaß müsste ich abbrechen oder die fehlende Stärke zuerst beschaffen. Ich habe ausschließlich für meinen synthetischen Proberaum einen Wert gewählt.

**Weg:** Eigenen Entwurf UX owner_a Morgenprobe Bad öffnen. → Raumgeometrie anlegen, Neues Rechteck mit vier Wänden, Lichte Innenmaße verwenden. → Breite, Tiefe und Höhe ausfüllen; Wandstärke leer lassen. → In den Plan übernehmen wählen und Pflichtfeldmeldung lesen. → 120 mm als Probewert eintragen und erneut übernehmen.

**Ort:** `/studio/c5e4bb92-ed2a-4701-a07a-3e583d6b3a41` · Kategorie product · Sicherheit high.

**Evidenz:** 0011-1792761283984.png (`evidence/owner_a/0011-1792761283984.png`); 0013-1792761344483.png (`evidence/owner_a/0013-1792761344483.png`).

**Anregung:** Pflicht für neue Wände vorab erklären oder einen ausdrücklich unvollständigen Entwurf unterstützen.


## Studios und KI

Ich legte **UX owner_a Morgenprobe Grabmal** ohne Auftragsbezug an. Die Schritte „Stein & Maße“, „Inschrift & Details“, „Prüfen“ und „Präsentieren“ machen den Arbeitsumfang verständlich. Unter Prüfen stand, dass der leere Plan eine technische Freigabe verhindert. „Kundenbestätigung von Text oder Gestaltung ersetzt keine technische Fachprüfung oder Genehmigung“ war eindeutig. „Fertigungsfreigabe vorbereiten“ war deaktiviert. Ich dokumentierte keine Zustimmung und bereitete keine Freigabe vor.

Im eigenen **UX owner_a Morgenprobe Bad** konnte ich Innenmaße oder Wandachsmaße unterscheiden. Ich übernahm ein Rechteck mit 2500,5 × 3000 × 2400 mm und der nur für diesen Proberaum gewählten Wandstärke 120 mm. Die Zeichnung zeigte 2.620,5 beziehungsweise 3.120 mm ausdrücklich als Achsmaße. Anschließend war der Stand „Synchronisiert“, Entwurf 1, Revision 2. Unter Präsentieren waren Planungs-PDF, Stückliste, technische Ansichten und Kundenvisualisierung erkennbar. Es wurde keine Ausgabe oder Visualisierung gestartet. Heute und Alle Aufträge waren direkt über die sichtbare Navigation erreichbar.

„KI für diesen Schritt“ im Grabmal-Prüfschritt öffnete den Begleiter mit „Aktueller gespeicherter Planstand · gesamter Plan“ und der Aussage, dass Hinweise vorbereitet werden und Planänderungen gesperrt sind. Die KI war sichtbar nicht eingerichtet (OpenAI-Projekt, Modell, Kostenbudget). Eingabe und Senden waren deaktiviert. Das ist ein **Umgebungslimit**, keine bewertete Antwortqualität. Ich habe keine Einrichtung verändert und keine KI-Ausgabe übernommen.

## Stärken

- Die linke Hauptnavigation bleibt im Studio sichtbar; Heute und der Rückweg zu Aufträgen funktionieren.
- Bei 1440 × 1000 sind Überschriften, Statuskarten und primäre Aktionen klar lesbar. Die Studios haben vier verständliche Arbeitsschritte.
- Angebotsakte verlinkt den passenden Kunden und Auftrag. Die gefilterten Wege vom Auftrag zur Planung und Abrechnung benennen den Auftragsbezug ausdrücklich.
- Auswertungen unterscheiden bestätigte Werte von fehlenden Grundlagen und erklären, dass offene Posten keine zugesicherten Zahlungseingänge sind.
- Im Grabmal-Prüfstand sind Kundenbestätigung, technische Fachprüfung und Genehmigung ausdrücklich getrennt; Fertigungsfreigabe bleibt bei leerem Plan gesperrt.
- Deutsche Dezimalangabe 2500,5 wurde im Raumstudio übernommen; gespeicherter Stand war als Synchronisiert, Entwurf 1 Rev. 2 erkennbar.
- Der KI-Begleiter benannte den aktuellen gespeicherten Planstand und gesamten Plan als Kontext, erklärte im Prüfschritt gesperrte Planänderungen und wies vor einer Eingabe auf die fehlende Einrichtung hin.

## Visuelle und Tastaturbeobachtung

Bei 1440 × 1000 wirken Überschriften, Statuskarten und die grüne Hauptaktion klar gegliedert. Die Hauptnavigation bleibt auch in den Studios vorhanden. Der technische Studio-Arbeitsraum wird mit geöffneten Element- und Eigenschaftsseiten dichter, bleibt aber durch die vier Arbeitsschritte orientierbar. Die langen Wiederholungen in den wirtschaftlichen Hinweisen erschweren dagegen den schnellen Überblick.

Selbst angesehen: Einstieg **0001**, Aufgabenhürde **0003**, Auswertungsansicht **0004**, Kundenverknüpfung **0005**, Studioeinstieg **0007**, Grabmal-Arbeitsansicht **0008**, Raum-Pflichtfeld **0011**, Auftragsliste **0014**. Weitere genannte Screenshots wurden vom Broker gesichert.

Tastatur: Escape schloss die Einführung; Enter im Angebotssuchfeld löste die Suche aus. Ein danach noch versuchter Tour-Schließen-Klick traf keinen vorhandenen Knopf mehr. Daraus wurde kein Appfehler abgeleitet. Mobile Darstellung wurde für diese Desktoprolle nicht geprüft.

## Grenzen und erhaltene Objekte

- Simulierter Black-box-Test einer synthetischen lokalen Umgebung, keine reale menschliche Feldstudie. Dauer der geöffneten Sitzung circa 9,5 Minuten. Nur Desktop 1440 × 1000 geprüft.
- KI war mit OpenAI-Projekt, Modell und Kostenbudget noch einzurichten deaktiviert. Keine KI-Antwortqualität oder tatsächliche KI-Übernahme bewertet; keine Integrationsänderung vorgenommen.
- Keine technischen Nachweise, Herstelleraussagen, rechtlichen Freigaben, Produktionsabläufe, Rechnungsprüfung oder Ausstellungen ausgelöst. Fachliche Richtigkeit der Planung nicht bewertet.
- Synthetische Bestandsdaten enthalten viele ähnliche Titel und fehlende Grundlagen. Fehlende Inhalte wurden nicht als Berechnungsfehler gewertet. Die Aufgabenanzahl änderte sich während der Sitzung von 43 auf 44; Ursache nicht untersucht.
- Escape schloss die Einstiegstour. Der anschließend noch versuchte Schließen-Locator war deshalb erfolglos; kein Appfehler daraus abgeleitet.
- Ein Klickversuch auf Speichern meldete einen Werkzeugfehler. Danach zeigte inspect den synchronisierten Stand Rev. 2 mit deaktiviertem Speichern. Nicht erneut gespeichert und keinen Datenverlust behauptet.
- Eine lokale Ausgabe wurde vom Werkzeug gekürzt und ließ sich in meiner Ergebnisdarstellung nicht als JSON parsen; die spätere sichtbare Feldbelegung bestätigte die Eingabe. Kein Appfehler daraus abgeleitet.
- Datumsfelder zeigten im Browser MM/DD/YYYY und die native Pflichtfeldmeldung erschien englisch. Browser-Locale als mögliche Umgebungsursache nicht geprüft; kein gesicherter App-Übersetzungsfehler.
- Eigene erhaltene Testobjekte: UX owner_a Morgenprobe Grabmal (leerer Entwurf) und UX owner_a Morgenprobe Bad (gespeicherter Rechteckraum). Beide ohne Auftragsbezug. Keine fremden Datensätze geändert oder freigegeben.

Der Browserkontext wurde mit `close {}` geschlossen. Wichtigste drei Punkte: bestehende Kundenverknüpfungen fehlen im dafür benannten Reiter; offene Aufgaben bieten keine verständliche Zuständigkeit und keinen direkten Quellenweg; die Auftragsliste zeigt bei mehreren aktuellen Vorgängen Kundenschlüssel statt Namen.
