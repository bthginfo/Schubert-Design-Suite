# Studio-Abnahme: Grabmal, Raum und Planungsbibliotheken

Stand: 17. Oktober 2026. Geprüft wurde die tatsächliche Anwendung unter `http://127.0.0.1:5173` mit dem persönlichen Planer-Testkonto, PostgreSQL und privaten Dokumentoriginalen in einem getrennten synthetischen Mandanten. Herstellerreferenzen sind keine erfundenen Produktfreigaben. Es wurden keine echten Kundendaten und keine kostenpflichtigen Bildgenerierungen verwendet.

## Ergebnis und Nachweise

Die folgenden acht protokollierten Browsergruppen enthalten zusammen **95 ausgeführte Prüfungen**. Die Datenprüfungen lesen den tatsächlich gespeicherten PostgreSQL-Kopf; sie prüfen beispielsweise die Weltposition nach einem Mauszug und dessen Wiederherstellung nach Rückgängig. Zusätzlich bestanden **14 gezielte SQL-Bibliotheksfälle**, **89 Geometrie-/Katalog-/Pakettests in 14 Testdateien** und **6 Python-Renderervertragstests**. Die direkte TypeScript-Prüfung endete ohne Fehler. Die direkte Svelte-Prüfung vor den letzten Kameraergänzungen hatte 0 Fehler/0 Warnungen; der Komponentenparser prüfte danach alle 24 Studio-Komponenten mit 0 Warnungen. Den abschließenden Gesamtcheck und Produktionsbuild protokolliert die zentrale Projektabnahme separat.

| Browsergruppe | Ausgeführt | Gesicherter Nachweis |
| --- | ---: | --- |
| Produktfilter, Hersteller, Rücksetzen und Abbruch | 6 | [Bibliothek](studio-evidence/studio-library-ui-qa-result.json) |
| Bearbeitung entfernen, Rückgängig/Wiederholen und getrenntes Rohmaß | 8 | [Bauteile](studio-evidence/studio-new-controls-qa-result.json) |
| Anfangsstärke, Gefälle erstellen/ändern, Fehler und Rückgängig | 5 | [Fläche und Gefälle](studio-evidence/studio-surface-controls-qa-result.json) |
| Benannte Revision, historische Sperre und neue Variante | 6 | [Revisionen](studio-evidence/studio-revisions-qa-result.json) |
| Gebundene Wandbewegung, Wand teilen und Rückgängig | 6 | [Wandformulare](studio-evidence/studio-wall-form-qa-result.json) |
| Mehrfachauswahl, globale Bewegung, Sperren, Öffnungen und Raumgrenzen | 18 | [Formularrunde](studio-evidence/studio-final-controls-all-result.json) |
| 2D/3D, Kamera, Zoom, Raster, Panels und Variantenvergleich | 28 | [Ansichtsrunde](studio-evidence/studio-views-qa-result.json) |
| Native Maus, Fanghilfe, Quellen, Konzeptquote und echte Downloads | 18 | [Abschlussrunde](studio-evidence/studio-final-artifacts-qa-result.json) |

Die Quellen dieser JSON-Nachweise sind die tatsächlich ausgeführten lokalen Abnahmeskripte und ihre überprüften Antworten. Fehlgeschlagene Zwischenversuche wurden korrigiert und erneut ausgeführt; unvollständige Durchläufe werden nicht als abgeschlossene Prüfgruppe gezählt. Die drei Ansichtswechsel, beispielsweise, werden innerhalb einer gemeinsamen Prüfung verglichen und nicht zusätzlich einzeln zum Gesamtwert addiert.

## Praktisch geprüfte Bedienung

### Raum, Wände und Öffnungen

- Projekt und Variante erneut geladen; gespeicherte Maße und Beziehungen bleiben erhalten. Der Ausgangsraum und der Nachbarraum haben je 6 m² und verwenden dieselbe gemeinsame Wand.
- Änderung einer durch ein 2000-mm-Abstandsmaß gebundenen Wand wird verständlich abgelehnt. Nach ausdrücklichem Entfernen der Bindung verschiebt das Formular beide Knoten konsistent; Flächen ändern sich auf 5,97/6,03 m². Zwei gespeicherte Rückgängig-Schritte stellen Geometrie und Bindung wieder her.
- Teilung mitten durch eine Tür wird abgelehnt. Teilung bei 1500 mm zwischen Tür und Nische erzeugt einen realen gemeinsamen Knoten, aktualisiert Raumgrenzen und bezieht die nachfolgende Nische korrekt auf die neue Wand. Rückgängig stellt ursprüngliche Wand, Nischenabstand und Raumgrenzen wieder her.
- Türbandseite und Öffnungsrichtung geändert und rückgängig gemacht. Tür/Fenster/Nische gewechselt. Eine zuvor nicht vorhandene Nischentiefe von 60 mm wird wirklich gebunden; Rückgängig entfernt auch diese optionale Bindung.
- Unzulässige Raumgrenzen und leere ergänzte Wandabschnitte erzeugen reparierbare Meldungen ohne neue Revision. Eine geschlossene zyklische Neuordnung lässt sich speichern und exakt zurücknehmen.
- Wandkern, Schichtaufbauten, Fertigfußboden, T-/schräge Wandanschlüsse, geöffnete Wandkörper und ein Nischenrücken werden aus dem kanonischen Modell abgeleitet. Die Formeln und tatsächlichen Volumina der schwierigen Anschlussfälle sind zusätzlich durch Geometrietests geprüft.

### Naturstein, Beläge und Bearbeitungen

- Waschtisch-/Arbeitsplattenbauteil mit 1000 × 600 × 100 mm, Blindbohrung und Gehrung gespeichert. Das Entfernen einer gespeicherten Bohrung entfernt weder den Stein noch die andere Bearbeitung. Rückgängig und Wiederholen funktionieren nach Autosave.
- Ein zu kleines Rohmaß wird ohne neue Bindung abgelehnt. 1010 × 620 × 110 mm werden separat vom Fertigmaß gespeichert. Eine neue optionale Rohmaßbindung lässt sich nach dem Speichern vollständig zurücknehmen.
- Neue Belagsfläche behält ihre ausdrücklich eingegebene Anfangsstärke von 18 mm, auch wenn noch kein geprüftes Material vorliegt.
- Fugenpunkt erstellt und einer Fläche zugeordnet. Löschen des Fugenpunkts entfernt die schwache Flächenzuordnung; Rückgängig stellt beides wieder her. Ein fachlicher Bezug lässt sich auf das tatsächlich gewählte Element umstellen.
- Gefälle mit 1000/20 mm erstellt und auf 1250/25 mm geändert. Lauflänge 0 und identische Endpunkte werden abgelehnt. Freie sechs Punktkoordinaten erzeugen auch ein tatsächlich nach Y gerichtetes Gefälle; Rückgängig stellt die ursprüngliche Ebene wieder her.
- Kontureditor praktisch geprüft: Linie teilen, Kreisbogen bearbeiten, ungültigen Bogen im Entwurf korrigieren, Loch hinzufügen/entfernen, Mindestpunktzahl, Speichern und Rückgängig. Gruppenbezug, Duplikat, Phase, Beschriftung, Lage und Löschen/Rückgängig wurden ebenfalls durchgespielt.

### Auswahl, Fanghilfe und Ansichten

- Zwei Elemente per sichtbarem Mehrfachauswahl-Schalter gewählt. Ein globaler X-Versatz von 25 mm verschiebt beide genau einmal, auch bei unterschiedlichen übergeordneten Bezügen. Gemeinsame Knoten werden atomar behandelt; ausgewählte Kinder werden nicht doppelt verschoben.
- Alle sperren/entsperren speichert beide Zustände. Bewegungsfelder werden bei gesperrter Auswahl deaktiviert. Drei Rückgängig-Schritte nach Autosave stellen ursprüngliche Positionen und Sperren wieder her.
- Echter Mauszug zeigt Fangmarkierung und einen benannten kanonischen Endpunkt mit Millimeterkoordinaten. Maus loslassen speichert die neue Weltposition; Rückgängig nach Autosave stellt den exakten Ausgangspunkt wieder her. Echtes Verschieben der Ansicht verändert den SVG-Ausschnitt und keine Revision.
- Front, Seite und Grundriss ergeben unterschiedliche tatsächliche Projektionen. Vergrößern, Verkleinern und Einpassen ändern bzw. restaurieren den SVG-Ausschnitt. Raster/Fangen und die responsive Panelklappe sind praktisch geprüft.
- Alle 13 Kameraaktionen für Zoom, Drehen, Pan und Vorn/Seitlich/Oben ändern die gerenderte WebGL-Ausgabe. Der globale Zoom zeigt die tatsächliche Kameradistanz an, beispielsweise 125 %. Einpassen stellt 100 % her. Es gibt einzelne Knöpfe als Alternative zum Ziehen. Die Bearbeitungswerkzeuge bleiben über 2D und Formulare erreichbar; in der 3D-Kameravorschau sind die 2D-Werkzeuge entsprechend deaktiviert.
- Variantenvergleich lädt tatsächliche Revisionsköpfe und Mengen. Zwei Pläne haben denselben Koordinatenausschnitt, Maßstab und gekoppelten Zoom. Unterschiede führen zum aktuellen Element. Fehlende revisionsbezogene Zustimmungen und nicht belegte Kosten werden sichtbar benannt.
- Lesbare Prüfpunkte nennen Bauteil/Feld statt interner Maß-UUID und öffnen das betreffende Eingabefeld. Die fehlerhafte Zeichenkodierung am Originalzeichenknopf und englische Entwurfsbadges wurden korrigiert.

### Revisionen, Quellen und Fehlerpfade

- Benannter Stand hängt eine eigene unveränderliche Revision an, ohne alte Planungen oder Zustimmung zu verändern. Historische Stände sperren Änderungen; „Zum aktuellen Stand“ stellt die Bearbeitung wieder her. Neue Variante kopiert genau den ausgewählten gespeicherten Stand.
- Fachunterlage auf ihre konkrete private Originalversion verknüpft, entfernt, nach Autosave rückgängig gemacht und den Ausgangszustand wiederhergestellt.
- PDF-Quellplan: tatsächliche private Seitenvorschau 1440 × 1019 px, Seite 0, gebundene Original-/Vorschauversion. Kalibrierung und unabhängiges Kontrollmaß ermöglichen einen geometrischen Importvorschlag. Wand und 900-mm-Öffnung wurden übernommen. Der Quelltext `3.200` wurde mit ausdrücklicher Einheit als 3200 mm übernommen; alle 11 importierten Maße bleiben ungeprüft. [Quellplan-Nachweis](studio-evidence/source-import-live-result.json).
- SVG-Bézier/Mehrfachkontur mit Loch sowie native DXF-Kreise/Blockinstanz importiert. Einheit wird ausdrücklich bestätigt; falsche Zentimeterbestätigung wurde abgelehnt, Millimeter akzeptiert. DXF: zwei getrennte Teile, ein Loch, Nettofläche 7747,12328692 mm², zwei Stück in der BOM. Die Originalversion, der Hash, Quelldateneinheiten und die gewählte 0,05-mm-Kurvenfehlergrenze bleiben dokumentiert. [DXF-Nachweis](studio-evidence/dxf-import-live-result.json).
- Native DXF-Polyline, Kreisbogen, Ellipse, geklemmter Spline und interne Blocktransformation werden über den kontrollierten Parser verarbeitet. Nicht geschlossene, widersprüchliche, geneigte/mehrdeutige oder nicht unterstützte dynamische Inhalte werden mit einer konkreten Fehlermeldung zurückgewiesen. Das ist eine bewusst ausgewiesene Importgrenze; es gibt keinen stillen Genauigkeits- oder Einheitenwechsel.
- Direkte API-Versuche gegen gesperrte Wandknoten, Nachbarwände, gebundene Kernstärke, Steinstärke, abhängige Bearbeitung und gesperrten Host wurden jeweils mit HTTP 422 abgewiesen; gespeicherter Kopf unverändert. [Wandsperre](studio-evidence/studio-lock-wall-proof.json), [Steinsperre](studio-evidence/studio-lock-stone-proof.json).

## Bibliotheken und Produktdaten

Die 34 Hersteller- und 80 Schriftreferenzen sind ein nachvollziehbarer Ausgangsbestand. Reale freigegebene Herstellerartikel, Materialkennwerte, Originalglyphen oder Lieferzusagen wurden daraus nicht erfunden.

Die 14 SQL-Fälle prüfen tatsächlich die produktive Suchfunktion gegen isolierte temporäre Tabellen: wörtliches `%`/`_`, Hersteller, Dezimalkomma, Größenintervalle, Oberfläche, Einbauart, Tiefe, Höhe, belegte Verfügbarkeit, abgelaufene/manipulierte/quarantänisierte Quellen, alte freigegebene SKU-Fassung, umgekehrtes Intervall, 30er-Suchgrenze, Rechte und Tenant-/Rechtsträger-RLS. Es wurden keine Produktfreigaben dauerhaft in Geschäftstabellen angelegt. [Suchnachweis](studio-evidence/studio-catalog-search-qa-result.json).

Die tatsächliche Studio-SQL-Abfrage wurde zusätzlich mit 85 temporären Bibliotheksfassungen geprüft: die ausdrücklich gebundene ältere Nicht-Kopf-SKU behält ihre eigenen 450 × 350 × 700 mm und die gebundene Materialfassung bleibt auch außerhalb der üblichen ersten 80 Zeilen verfügbar. Geschäftsdaten-/Freigabeanzahlen bleiben unverändert. [Gepinnte Fassungen](studio-evidence/studio-pinned-library-qa-result.json).

Eine Verfügbarkeitsauskunft ist datiert, quellhashgebunden, unabhängig prüfbar und auf einen unveränderlichen Produktstand bezogen. Sie ist keine Lagerreservierung. Fehlende oder abgelaufene Belege bleiben unbekannt.

## Grabmal und wörtliche Inschrift

Das separate Grabmalprojekt wurde tatsächlich erstellt, gespeichert, neu geladen und in 2D/3D sowie PDF/BOM geprüft. Die 800 × 1200 × 150-mm-Stele bewahrt wörtliche Namen und Sonderzeichen wie Müller, Groß und Élise. Strassacker-Schriftreferenzen werden als solche verwendet; Shopbilder erhalten keine erfundenen Zeichenbreiten oder Bohrpunkte. Die Einfassung besteht aus vier echten Einzelsteinen mit einer ausdrücklich eingegebenen 5-mm-Fuge; vier Körper und vier BOM-Zeilen stimmen überein. [Persistierter Grabmal-/Raumnachweis](studio-evidence/studio-final-qa-result.json).

## Reale Renderausgabe und private Archivierung

Der tatsächliche Studioaufruf über die Hauptanwendung wurde durch den bereitgestellten Vercel-Renderer mit Szenenadapter **`schubert-scene/1.0.3`** verarbeitet, nicht nur durch einen Healthcheck.

| Bindung | Geprüfter Wert |
| --- | --- |
| Job | `ec983fb3-be27-4c95-8ba6-a0df99859154`, completed, Fence 1 |
| Revision | `40dce8f0-7852-4bcf-a503-bfec40475ce3` |
| Revisionshash | `d162672051a49de2a5e8ea3ce05c82fd18007bf5b18e2a6b325174fd1a9fdc79` |
| Private Bildversion | `c1017fc6-5cb6-4903-b866-3a101986b303` |
| Natürliche Auflösung | 1440 × 1080 px, 1.069.334 Bytes |
| Bild-SHA-256 | `b45ae71daa78d2e7a2682671df11f7ade4763009d38518c72290cc98c8b9551a` |
| Manifest-SHA-256 | `485e07a2dd104007a893b3c7351ae7c73d557be6834bf5ec00dee881b96014dc` |

Gesicherte Bild-, Masken- und Protokollversionen sind an Quelljob, Revision, Hash und aktuelle Fence gebunden. Das authentifizierte Original wurde unabhängig mit HTTP 200 heruntergeladen und hat denselben Hash. Der Worker erhielt nur kurzlebige private Uploadfähigkeiten für den konkreten Job-/Fence-Pfad. Der produktive Rücktransport benutzt keine instanzlokalen `/tmp`-Artefakte. [Cloudnachweis](studio-evidence/cloud8-app-render-qa-result.json).

Die native **3840 × 2880**-Ausgabe wurde separat mit Blender 4.5.14 LTS und Adapter 1.0.3 tatsächlich lokal in 367,442 Sekunden berechnet und visuell auf schrägen/T-Wandanschluss, Tür, Nischenrücken, Schichten, Blindbohrung, rückseitige Tropfnut und Gehrung geprüft. Dies war ein synthetischer Renderprüfstand, kein behauptetes freigegebenes Kundenprojekt. [Lokale 4K-Abnahme](studio-evidence/render-local-4k-summary.json). Ein privater Transporttest übertrug außerdem tatsächlich 6.983.339 Bytes in nativer 4K-Größe, prüfte einen getrennten Leser und verweigerte fremden Pfad, falschen MIME-Typ, Übergröße, abgelaufene Fähigkeit und Überschreiben. [Privater 4K-Transport](studio-evidence/render-blob-qa-result.json).

Der Paketcode verlangt technische PDF, unveränderliche BOM und tatsächliches finales 4K-Bild derselben Revision sowie Manifest/ZIP, bevor er „bereit“ veröffentlicht. Ein Konzeptbild erfüllt diese Bedingung nicht. Die Fence-/Manifest-/Dimensions-/Hash- und Freigabeprüfungen sind automatisiert getestet. Ein positives, fachlich freigegebenes Geschäftspaket mit echten lizenzierten Originalen wurde mangels dieser betrieblichen Eingaben nicht vorgetäuscht.

Renderstatus wird ausdrücklich per Knopf aktualisiert. Es gibt keine automatische Render-Dauerabfrage und keine künstlichen Monats-/Stückgrenzen. Die technische Worker-Parallelität und die Wiederverwendung identischer Revisions-/Profilaufträge bleiben erhalten.

## Abschließende Unterlagen und Konzeptquote

Die letzte tatsächlich exportierte Raumrevision ist **117**, ID `7be21ea7-c4db-49d3-bba9-1ea5aabf53b0`, Revisionshash `a37c3b1c6f74ff1773bf5499ad2f2dad48a33c8309c28324578b1160aee288e0`.

| Originalexport | HTTP | Größe | SHA-256 |
| --- | ---: | ---: | --- |
| [Technische PDF](studio-evidence/studio-final-pdf.pdf), 13 Seiten | 200 | 56.603 B | `cb8bf564b1d8b75603b44551ce9331020235f470a2f3093c90a4ecc365032b56` |
| [BOM](studio-evidence/studio-final-bom.json) | 200 | 27.172 B | `44488852f78f98039ee157f579d41e60c012a9aee9e0ed7bf646aa2a2fc1b1f1` |
| [Vektor-SVG](studio-evidence/studio-final-svg.svg) | 200 | 33.315 B | `2789b7d5fb7819cececbc226099be27a7018926434a652809f289e38c265ec96` |

Grundriss, Rohmaß-/Bearbeitungsseite und technische Gefälle-/Anschlussseite wurden gerastert und visuell geprüft. Titel, Revisionsnummer, Modellhash, Maßstab, Maßeinheit, deutscher Status, Seitenzählung, separate Rohmaße und offene technische Zuordnungen sind enthalten. BOM-Mengen werden für Anschluss-/Freiraumpunkte nicht als erfundene Materialmengen ausgegeben.

Der Konzeptdialog wurde geöffnet, mit fehlenden Angaben abgewiesen, mit einer tatsächlichen eigenen synthetischen Nachweisversion bis zur Quote ausgefüllt und abgebrochen. Die Quote zeigte **„Maximale Reservierung – bis zu 0,32598 USD“** für GPT Image 2.5 mit Image 2 als Ersatzmodell. Dieser konkrete Wert war eine damalige Konfiguration, keine feste Preiszusage. Der Startknopf blieb ohne ausdrückliche Checkbox gesperrt. Eine Promptänderung entfernte die Quote. Die Anzahl der bezahlten Bildjobs blieb unverändert. Ein bezahlter Liveaufruf und dessen Anbieterergebnis wurden hier bewusst nicht als geprüft behauptet.

## Bewiesene Grenzen und betriebliche Voraussetzungen

- Eine Speicherauflösung von 0,01 mm und ausgewiesene Import-/Rendernäherungen sind keine Fertigungstoleranz oder Fachfreigabe.
- Konkrete Natursteinmaserung benötigt eine belegte Textur bzw. das reale Plattenfoto. Ohne diese Quelle bleibt die neutral dargestellte Geometrie ausdrücklich modellbasiert.
- Schriftbilder ersetzen keine lizenzierten Originalglyphen, Satzmetriken, Befestigungs-/Bohrdaten oder konkrete Lieferantenbestätigung. Fehlende Originale blockieren eine entsprechende finale Behauptung.
- Verbindliche Herstellungs-/Montagepakete benötigen eigene geprüfte Aufmaße, aktuelle Regeln, konkrete Material-/SKU-Fassungen, erlaubte Nutzungszwecke und tatsächliche revisionsgebundene Fach-/Kundenbestätigungen.
- Perspektivische Fotos ohne belegte Projektion sind Bildreferenzen. Erkannte Maßtexte, Kalibrierungen und importierte Geometrien bleiben bis zur ausdrücklichen fachlichen Bestätigung ungeprüft.
- Der Konzeptbilddienst benötigt eine verwendbare Anbieteranbindung und bestätigt vor jedem kostenpflichtigen Start die konkrete Reservierung. Eine Kundenfassung mit geschützter Bestandsinschrift benötigt anschließend das geprüfte Compositing mit unveränderten Originalpixeln.
- Die Cloud-Renderprüfung belegt eine reale 1440er-Appstrecke. 4K-Rendering und dessen private Übertragung wurden getrennt tatsächlich geprüft; eine zusätzliche Cloud-4K-Geschäftsfreigabe wurde nicht behauptet.

Diese Voraussetzungen können mit den implementierten Bibliotheks-, Quellen-, Prüf- und Freigabeabläufen erfasst werden. Sie werden nicht durch synthetische Softwaretests als geschäftlich vorhanden erklärt.
