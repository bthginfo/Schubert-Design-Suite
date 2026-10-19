# Gestaltung im Planungsstudio

## Stein und Inschrift

1. Ein Grabmalprojekt öffnen und **Stein / Sockel** wählen. Die 14 Grundformen sind frei bearbeitbare Entwürfe. Breite, Höhe und Stärke in Millimetern eintragen. Bei gerundeten Ecken beziehungsweise flachem Bogen lässt sich der Radius beziehungsweise die Bogenhöhe direkt angeben.
2. Den Stein auswählen und **Inschrift ergänzen** öffnen. Entwurfsschrift, wörtlichen Text, Farbe, Zeichenhöhe und Abstand festlegen. Ein neuer Textblock wird mittig auf der ausgewählten Fläche angeordnet.
3. Die sichtbare Inschrift auf dem Stein ziehen. **Am Raster einrasten**, **An Objekten fangen** und **Raster anzeigen** sind unabhängig schaltbar. Alt setzt das Einrasten während des Ziehens kurz aus. Die angezeigte Rasterweite kann beim Herauszoomen größer sein als das unveränderte Fangraster.
4. Für feine Korrekturen die Inschrift auswählen: Pfeiltasten bewegen um 1 mm, Umschalt und Pfeiltaste um 10 mm. Alternativ die u-/v-Werte eintragen. **Auf Stein zentrieren**, Ausrichtung und Drehung stehen im Eigenschaftenbereich.
5. **3D** zeigt die gespeicherte Anordnung. **Vollbild** vergrößert das gesamte Studio; **Vollbild beenden** führt zurück. Wenn der Browser Geräte-Vollbild verweigert, bleibt der vergrößerte Arbeitsbereich innerhalb der App verwendbar.

Die sechs lokal ausgelieferten Entwurfsschriften sind Noto Serif, Cinzel, Lora, Cormorant Garamond, Great Vibes und Montserrat unter SIL OFL. Eine Herstellerbildreferenz besitzt weiterhin ihre eigene Kennung und Bestellangaben. Die Entwurfsschrift stellt keine Originalkontur einer ausgewählten Herstellerschrift dar. Herstellerbestätigte Originalzeichen, technische Freigabe und Bohrdaten werden getrennt geprüft. Die technische PDF behält ihre klare Trennung zwischen maßhaltigem Körper und Schriftanforderungen.

## Freie Konturen und Radien

Unter **Geometrie & Ausschnitte** kann die Grundform eines Steins oder einer Fläche ersetzt werden. Position, Material und Stärke bleiben erhalten. Eine neue Grundform ersetzt bestehende Ausschnitte und setzt Kantenbearbeitungen zurück, wenn sich deren Kantenbezug ändert. Die Aktion lässt sich rückgängig machen.

**Ecken runden und Radien einstellen** bearbeitet eine einzelne Ecke, eine Fase oder den Radius eines vorhandenen Kreisbogens. Zu große Radien werden mit einer verständlichen Meldung abgelehnt. Andere Konturteile bleiben erhalten. Für beliebige Koordinaten, eigene Ausschnitte und getrennte Bestandteile steht zusätzlich der vollständige Kontureditor bereit. Manuelle Konturänderungen heben die frühere unveränderte SVG-/DXF-Originalableitung auf.

Ein geometrischer Eckenradius beschreibt die Außenkontur. Die Bearbeitung der physischen Steinkante wird daneben als Kantenprofil zugeordnet. Beide Angaben erfüllen unterschiedliche Zwecke.

## Materialreferenzen

Die Steinbibliothek enthält 96 öffentlich belegte Handelsnamen aus acht Lieferantenrubriken und 16 Gesteinsbezeichnungen. Suche nach Name oder Herkunft und Filter nach Gesteinsart stehen bei der Materialauswahl zur Verfügung. Quellenlink und Recherchestand bleiben sichtbar. Eigene Materialstände können weiterhin ergänzt werden.

Die CC0-Muster zeigen repräsentative Strukturen, keine zugesicherten Fotos der konkreten Lieferplatte. Verfügbarkeit, Maße, Oberfläche und technische Eigenschaften bleiben bis zur Prüfung offen. Es gibt keine erfundenen Preise oder Freigaben. Reale Plattenfotos und bestätigte Herstellerdaten gehören zum jeweiligen Material-/Produktstand.

## Betrieb und Quellen

- Formen, Raster und Textlayout werden im Browser berechnet, ohne KI-Anfragen.
- Die vorhandene gebündelte Studioabfrage liefert Materialdaten mit; die Suche arbeitet danach lokal. Die Abfrage bleibt begrenzt und berücksichtigt zusätzlich die tatsächlich referenzierten Versionen.
- Die Kataloganlage ist mandantenbezogen, protokolliert und wiederholbar. Die 192 Material-/Versionszeilen entstehen in zwei Sammeloperationen.
- Schriftdateien und Texturen werden beim Build aus festen Quellen geladen und anhand gespeicherter SHA-256-Werte geprüft. Zur Laufzeit lädt der Browser lokale, cachefähige Dateien.
- Fachrecherche: [IBS Naturstein](https://ibs-cad.net/produkte/ibs-naturstein/), [SignumNext](https://www.zss.de/produkte/signumnext/signumnext.php), [Palette CAD: Bodenfliesen](https://help.palettecloud.net/palettecad/release/deu/Content/Verfliesen_Bodenfliesen.htm). Die Verbesserungen betreffen sichtbare Schrift, präzise Platzierung, bearbeitbare Konturen und nachvollziehbare Materialwahl.
- Faktenquelle: [ROSSITTIS Steinlexikon](https://rossittis.de/steinlexikon). Texturen: [ambientCG CC0-Lizenz](https://docs.ambientcg.com/license/). Lizenztexte und Dateihashes sind im Quellbestand enthalten.
