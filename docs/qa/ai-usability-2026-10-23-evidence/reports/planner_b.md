> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzungstest: planner_b

Lea Keller, 31, neue Planerin im deutschen Steinmetzbetrieb; keine Schulung in dieser App. Tatsächliche Bedienung der lokalen Oberfläche als „UX Lea Keller“, ausschließlich Browser-ID `planner_b`. Test am 23.10.2026, etwa 12:44–12:53 UTC (14:44–14:53 Uhr Deutschland), Laptopansicht 1280 × 900. Rund 76 Browserbefehle einschließlich Inspektionen, Tastaturversuchen und Wiederanmeldungen. Dies ist ein simulierter Einzeltest, keine Untersuchung mit einer realen Testperson.

## Ergebnis der Aufgaben

| Ziel | Stand | Beobachtetes Ergebnis |
| --- | --- | --- |
| G1: Bad anlegen | Erreicht | `UX planner_b · Bad` mit lichten Innenmaßen 4200 × 3200 mm, Höhe 2600 mm, Wandstärke ohne Belag 200 mm. Türöffnung 900 mm in Wand 1; ergänzte Entwurfsannahmen: Höhe 2100 mm, Abstand längs der Wand 600 mm, links/nach innen. |
| G2: Waschtischplatte und Quelle | Erreicht | Eigene Platte 1200 × 550 × 30 mm, Material „Bianco Carrara C · Katalogreferenz“. Die Oberfläche bot `https://rossittis.de/material/bianco-carrara-c`, Stand 2026-10-19, als Lieferantenreferenz. „Wunschmaß / Noch zu prüfen“ und ein separates Aufmaßformular waren unterscheidbar. Quelle nur in der App gefunden, nicht extern geprüft. |
| G3: KI im aktuellen Schritt | Teilweise; Umgebung begrenzt | Begleiter für „Raum & Aufmaß“ und später „Bauteile & Material“ geöffnet. Auswahlkontext wechselte von Badtür zu Waschtischplatte; vorbefüllte Hilfsfrage und Bearbeitungsgrenzen passten zum Schritt. Eine Tiefe von 550,5 mm wurde eingegeben und anschließend auf 550 mm zurückgestellt. Anfrage/Antwort und Übernahmeprüfung waren wegen fehlender Anbietereinrichtung nicht möglich. |
| G4: Prüfen, sichern, Ausgabe | Teilweise | Prüfstand mit 17 offenen Punkten gelesen. Technische Freigabe blieb gesperrt; keine Zustimmung oder Freigabe ausgelöst. Revision 8 war synchronisiert und nach Wiederanmeldung wieder vorhanden. Sechsseitiges Planungs-PDF heruntergeladen und geprüft; Material-ID statt Materialname und fehlende lichte Innenmaße schränken seine Vorzeigbarkeit ein. 3D-Vorschau lud ebenfalls. |

Gespeicherte Planung: `/studio/7af1fd34-53bc-4664-baed-639dbba2dfaa`, Entwurf 1, Revision 8. Platte im Entwurf bei X 1600 / Y 2700 / Z 850 mm, Drehung 0. Kein bestätigtes Baustellenaufmaß; keine technische Freigabe.

## Die drei wichtigsten Produktbefunde

### planner_b-F1 · P2 · PDF zeigt technische Material-ID statt ausgewähltem Stein

**Erwartung vor der Ausgabe:** Die vorzeigbare Entwurfsunterlage nennt den gewählten Stein und lässt die zuvor gefundene Referenz wiedererkennen.

**Beobachtung:** Die Eigenschaften der Platte zeigten „Bianco Carrara C · Katalogreferenz“ sowie den Lieferantenlink mit Standdatum. Nach „Bilder & Exporte öffnen“ → „Planungs-PDF herunterladen“ enthielt Seite 4 dagegen „Natursteinbauteil · Materialstand: 1940063e-75a2-4de7-9a94-9dbb3709d611“. Der Materialname und die Lieferantenreferenz erschienen im Text der sechs PDF-Seiten nicht. Die Stückliste auf Seite 4 wurde auch visuell geprüft.

**Auswirkung:** Eine andere Person kann die Materialwahl aus dem PDF nicht fachlich verständlich nachvollziehen. Für eine Besprechung müsste ich den Materialnamen und die Quelle zusätzlich mitgeben.

**Evidenz:** `work/ai-usability/evidence/planner_b/1792759822055-Planung.pdf`, besonders Seite 4. Route: eigene Planung, Schritt Präsentieren. Sicherheit: hoch. Vorschlag: Handelsname und verständlichen Materialstand mit Quellenbezug ausgeben; die interne ID höchstens zusätzlich anzeigen.

### planner_b-F2 · P2 · Eingegebene lichte Innenmaße fehlen in der Ausgabe

**Erwartung vor der Raumübernahme:** Die für das Bad eingegebenen 4200 × 3200 mm sind später einfach ablesbar und in der Besprechungsunterlage wiederzufinden.

**Beobachtung:** Der Raumdialog unterschied gut zwischen „Lichte Innenmaße“ und „Wandachsmaße“. Nach Übernahme zeigte der Grundriss 4.400 · Achse und 3.400 · Achse. Das PDF ergänzte geometrische Außenmaße von 4.600 beziehungsweise 3.600 mm. Die lichten 4200 × 3200 mm waren im gesamten ausgelesenen PDF-Text nicht vorhanden. Seite 1 wurde visuell geprüft. Seite 4 nannte ausdrücklich eine Raumfläche mit Bezug auf Wandachsen, kein lichtes Innenmaß.

**Auswirkung:** Ich muss die angeforderten nutzbaren Badmaße zurückrechnen oder zusätzlich erläutern. Die Beschriftung „Achse“ verhindert zwar ein stilles Verwechseln; sie ersetzt das gesuchte Innenmaß aber nicht. Dies ist keine Feststellung einer falschen Geometrie.

**Evidenz:** `0001-1792759579297.png` (Innenmaßdialog), `0002-1792759598183.png` (Grundriss nach Übernahme), `1792759822055-Planung.pdf`, Seiten 1 und 4, jeweils unter `work/ai-usability/evidence/planner_b/`. Sicherheit: hoch. Vorschlag: lichte Innenmaße zusätzlich anzeigen oder eine klar erkennbare Maßbezugswahl für Ansicht/PDF anbieten.

### planner_b-F3 · P3 · Grabmalbegriffe verunsichern bei der Waschtischplatte

**Erwartung vor dem Ergänzen:** Für eine Waschtischplatte erkenne ich eine rechteckige Platte als Grundform und dieselben Maßbegriffe beim Anlegen und Nachbearbeiten.

**Beobachtung:** Bei „Natursteinbauteil ergänzen“ war die Bauteilart „Waschtisch- / Arbeitsplatte“, die Grundform hieß jedoch „Gerade Stele“. Beim Aufklappen erschienen unter anderem „Spitzdach“, „Buchkontur“ und „Verjüngte Stele“. Ich ließ die gerade Form stehen; es entstand eine rechteckige Platte. Das Anlegefeld „Länge (mm)“ mit 1200 hieß später „Breite mm“; „Tiefe (mm)“ mit 550 wurde zu „Länge / Tiefe mm“, im Prüfstand zu „Höhe / Länge“. Auch der PDF-Hinweistext verwies auf Inschriftenplan/Friedhofsvorgaben.

**Auswirkung:** Als neue Planerin prüfte ich erst die Formauswahl, weil ich einen falschen Arbeitsbereich vermutete. Beim späteren Maßvergleich helfen die Werte mehr als die wechselnden Bezeichnungen.

**Evidenz:** Browseraktionen „Steinbauteil ergänzen“, „Grundform“ und Platte übernehmen; `0004-1792759701918.png`, `0008-1792759804925.png` und PDF unter `work/ai-usability/evidence/planner_b/`. Sicherheit: hoch. Vorschlag: „Rechteckige Platte“ und durchgehend Länge/Tiefe/Stärke für diesen Bauteiltyp verwenden; Hinweise auf Raumplanung abstimmen.

## Was gut funktionierte

- Die Einführung ließ mich direkt „Grabmal oder Raum planen“ wählen und mit „Hier selbst ausprobieren“ selbstständig weiterarbeiten. Der anfangs blockierte Klick auf die Navigation war ein eigener Bedienversuch hinter dem sichtbaren Tourdialog, kein Appdefekt.
- Die vier Arbeitsschritte und ihre jeweils passende Hauptaktion führten vom Raum zu Bauteil, Prüfung und Ausgabe. Der Hinweis zu Millimetern und die Erklärung der lichten Innenmaße waren fachlich hilfreich.
- Wunschmaße waren ausdrücklich unbestätigt. „Neues Aufmaß erfassen“ öffnete eine getrennte Version mit Messmethode, Messdatum, Evidenz und Toleranzen; es wurde ohne erfundenen Nachweis abgebrochen.
- Der Begleiter benannte Arbeitsschritt, Auswahl und gespeicherte Grundlage. Im Bauteilschritt stand nach der Änderung „Letzte Änderungen werden vor dem Senden gespeichert“. „Nur Auswahl“ und „Maßwerte geschützt“ waren nachvollziehbar; Vorschläge wurden als vor Anwendung zu prüfende Änderungen angekündigt. Mangels Anbieter konnten diese Zusagen nicht praktisch geprüft werden.
- Prüfstand und PDF trennten Entwurf von fachlicher Freigabe. 17 offene Punkte verhinderten die Fertigungsfreigabe, während das Weiterarbeiten möglich blieb.
- Synchronisationsstand und Revision waren sichtbar. Nach neuer Sitzung fand ich die eigene Planung oben in der Liste und öffnete Revision 8 erneut. Dezimalkomma 550,5 wurde im Zahlenfeld akzeptiert; der Endstand 550 mm ist im PDF belegt.
- Tab, Escape und Strg+S wurden versucht. Escape schloss die aufgeklappte Evidenzauswahl; die Sitzung blieb bedienbar. Die Oberfläche blieb bei 1280 px lesbar, zeigte allerdings eine dichte Planansicht mit schmalem Eigenschaftsbereich und vielen innerhalb dieses Bereichs zu scrollenden Feldern. Kein Mobiltest, da die Persona einen Laptop nutzt.

## Umgebung und Testgrenzen

**KI:** „Noch nicht verfügbar“ und „OpenAI-Projekt, Modell und Kostenbudget noch einzurichten“ wurden in der Oberfläche/Inspektion ausgegeben. Nachricht, Sprache und Senden waren deaktiviert; zuständige Administration wurde genannt. Das ist ein Einrichtungslimit der Testumgebung. Keine KI-Anfrage wurde gesendet, keine Antwortqualität oder Änderungssicherheit erfunden. Im direkt betrachteten Panelbereich stand die Begründung nicht ständig im sichtbaren Ausschnitt; der lange Panelinhalt war gescrollt. Daraus leite ich keinen gesonderten Produktdefekt ab.

**Harness 1:** Direkt nach der Tourauswahl war der Broker vorübergehend nicht erreichbar (`ECONNREFUSED 127.0.0.1:9323`). Der Parent stellte die Infrastruktur wieder her; ein erneutes `start` setzte die Bedienung fort. Noch kein eigener Plan war angelegt. Keine verlorene App-Speicherung behauptet.

**Harness 2:** Der PDF-Download wurde tatsächlich gespeichert. Der nachfolgende SVG-Klick scheiterte mit „Target page, context or browser has been closed“. Laut Parent hatte der Broker den kurz für den Download geöffneten und anschließend automatisch geschlossenen Tab als Ziel übernommen. Das ist kein belegter Appfehler. Nach `close`/`start` war die gespeicherte Planung wieder auffindbar. Im App-Screenshot nach dem PDF-Klick war keine zusätzliche Erfolgsmeldung sichtbar; eine native Browser-Downloadanzeige erfasst der Testweg nicht zuverlässig, deshalb kein Defekturteil allein daraus. SVG wurde nicht erfolgreich geprüft.

**Weitere Grenzen:** Lieferantenreferenz nicht extern geöffnet; Materialeignung nicht bestätigt. Keine fachfremden Regelwerke geprüft. Kein KI-Rendering angefordert, keine Integration verändert, keine Produktionsfreigabe. Das PDF wurde auf ausdrücklichen Hinweis des Parents als eigene heruntergeladene Evidenz per Text und visueller Darstellung geprüft. Keine Anwendungssourcen, APIs oder Datenbanken verwendet. Eigener Browserkontext am Ende geschlossen.

## Zentrale Evidenz

- Einstieg/Tour: `work/ai-usability/evidence/planner_b/0001-1792759495297.png`
- Innenmaßdialog: `work/ai-usability/evidence/planner_b/0001-1792759579297.png`
- Angelegter Raum: `work/ai-usability/evidence/planner_b/0002-1792759598183.png`
- Begleiter, Raum/Aufmaß: `work/ai-usability/evidence/planner_b/0003-1792759634779.png`
- Platte nach Übernahme: `work/ai-usability/evidence/planner_b/0004-1792759701918.png`
- Begleiter nach Maßänderung: `work/ai-usability/evidence/planner_b/0007-1792759777932.png`
- Prüfstand: `work/ai-usability/evidence/planner_b/0008-1792759804925.png`
- Ausgabeansicht: `work/ai-usability/evidence/planner_b/0009-1792759819868.png`
- Tatsächlicher PDF-Download: `work/ai-usability/evidence/planner_b/1792759822055-Planung.pdf`
- Erneut geladene Revision 8, 3D: `work/ai-usability/evidence/planner_b/0002-1792759965238.png`

Einstieg, Raumdialog, Arbeitsansicht, Begleiter, Ausgabe und abschließende 3D-Ansicht wurden selbst visuell angesehen; zusätzlich die PDF-Seiten 1 und 4.
