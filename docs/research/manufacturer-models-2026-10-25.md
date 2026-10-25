# Herstellerdaten für beide Planungsstudios

Stand: 25. Oktober 2026. Recherche und Integrationsvorschlag für den deutschen Betrieb. Öffentliche Herstellerinformationen belegen verfügbare Datenarten, keine Schubert-Lieferverträge, vollständige Modellabdeckung oder erteilten KI-Nutzungsrechte.

## Ergebnis

Eine umfangreiche echte Herstellerbibliothek ist machbar. Dafür benötigen wir mehrere Datenkanäle: Artikelstammdaten, Originalgeometrien, technische Unterlagen und Bild-/Materialdaten. Ein einzelner universeller Download oder eine verifizierte freie API für sämtliche Schubert-Marken wurde nicht gefunden. Ein Katalogeintrag mit Außenmaßen ist noch kein originales 3D-Modell.

Der sinnvolle Einstieg sind autorisierte Serienpakete und Herstellerfeeds. Einzelne Dateien bleiben über die vorhandene Herstellerbibliothek ergänzbar. Für eine belegbar vollständige Abdeckung brauchen wir pro Hersteller eine aktuelle Artikel-/Variantenliste als Vergleichsgrundlage.

## Ausgangslage in dieser Anwendung

- Die Markenliste und deren Identitätsprobleme sind in [Master-Spezifikation, Kapitel 24](../master-specification.md#24-verifizierte-hersteller-startdaten-und-benötigte-betriebsangaben) dokumentiert. Die Quellenlabels auf Schuberts Website sind keine Liste aktiver Lieferverträge. Bisazza Mosaico ist ein Alias; Nero und K8 bleiben ungeklärt. Bei Zierath ist die aktuelle Identität separat zu prüfen.
- `catalog-public-data.ts` enthält 28 quellenbelegte Produktvarianten mit Grundmaßen: 15 Duravit, 12 KALDEWEI, eine antoniolupi. Ihre vereinfachten Hüllkörper dürfen nicht als originale Herstellerkonturen oder Meshes bezeichnet werden.
- Vorhanden sind private Originaldateien, Quellenangaben, Quarantäne, explizite Verwendungsrechte, versionierte Produktstände und die Auswahl in beiden Studios. Superadmin und ausdrücklich berechtigte Bibliotheksverwalter können Unterlagen hinzufügen.
- Nicht implementiert sind ein vollständiger Hersteller-Synchronisationsdienst und Konverter für sämtliche proprietären CAD-/BIM-Formate. Diese Recherche aktiviert keine externe Datenverbindung und importiert keine ungeprüften Dateien.

## Verifizierte Beschaffungswege

| Quelle | Tatsächlich belegt | Geeigneter nächster Schritt / Grenze |
|---|---|---|
| [Duravit Downloadcenter, Deutschland](https://www.duravit.com/de-de/professionals/downloadcenter/) | Filter nach Artikel, Serie, 2D-/3D-/BIM-Daten, Schablonen und Unterlagen; konkrete DWG-, DXF- und 3DS-Dateien. | Serien-/Artikelverzeichnis und freigegebene Pakete beziehen. Downloadanzahlen sind Dateianzahlen, keine Modell- oder Variantenabdeckung. Formate je Artikel prüfen. |
| [KALDEWEI, 3D und BIM](https://www.kaldewei.de/professionals/3d-und-bim-dateien/) | Hersteller verweist auf BIMobject; nennt RFA/GSM sowie Visualisierungsformate wie 3DS, MAX, SKP und VWX. | Passende Produktvarianten über den autorisierten Kanal beziehen; geeignetes Austauschformat oder Konvertierung vereinbaren. Daraus folgt keine GLB-Verfügbarkeit. |
| [antoniolupi Downloads](https://www.antoniolupi.it/it/download), [2D](https://www.antoniolupi.it/it/download/5e8c9e39309d8db0ffd8750a), [3D](https://www.antoniolupi.it/it/download/5e8c9e80309d8d5929d8750b) | Offizielle getrennte 2D-/3D-Kategorien, unter anderem Wannen, Sanitär, Armaturen und Accessoires; außerdem technische Datenblätter. | Kategoriepakete mit Artikelzuordnung prüfen. Die italienische Herstellerquelle belegt Originaldaten; für den Betrieb nur die in Deutschland angebotenen Artikelstände übernehmen. Paketinhalt und Lizenz sind noch nicht abgenommen. |
| [Dornbracht, Digital planen](https://www.dornbracht.com/de-de/professional/inhalt/digital-planen), [DE Downloadcenter](https://www.dornbracht.com/de-de/downloads/) | Serienpakete und technische Datenbank; 2D/3D-DXF, DWG und BIM-Pakete in mehreren Formaten. Der DE-Download verlangt Registrierung. | Bestehenden betrieblichen Fachzugang verwenden und Pakete beziehen. Kein Login wurde umgangen; keine US-Sortimente oder dortigen technischen Vorgaben übernehmen. |
| [ARGE BUILDING MASTERDATA, belegt durch KERMI](https://www.kermi.com/de/de/fuer-fachpartner/tools-apps/datanorm-ausschreibungstexte/) | Artikel-/Bilddaten, Excel/CSV, BMEcat 1.2, ARGE XML, DATANORM 4; KERMI nennt auch 3D-Badplanungsdaten und SHK-Connect für Katalogaktualisierungen. | Als Sammelkanal für teilnehmende SHK-Hersteller prüfen. Eine öffentliche Paketbeschreibung ist keine belegte allgemeine API-Berechtigung und ersetzt nicht die Prüfung der enthaltenen Geometrien. KERMI dient hier als Quellenbeleg, nicht als automatisch hinzugefügter Schubert-Lieferant. |
| [Zehnder Datenservice, Abschnitt Deutschland/Luxemburg](https://www.zehnder-systems.de/de/service-support/datenservice) | Konkretes Beispiel für getrennte Stammdaten, Fotos/Strichzeichnungen, VDI-3805-Links und 3D-Badplandaten; teilweise Fachpartner-Login. | Bestätigt die Trennung der Datenarten. Die ARGE-Plattform war mit dem Web-Lesewerkzeug nicht direkt lesbar; Mitgliedschaft, Export-/API-Zugang und Schubert-Markenabdeckung sind nicht als geprüft ausgegeben. |
| [Strassacker Herstellerseite](https://www.strassacker.com/de/), [offizieller Shop](https://shop.strassacker.com/) | Öffentlicher Hersteller-/Shopzugang; die bereits geprüften Auswahlreferenzen und Rastervorschauen sind in Kapitel 24 nachgewiesen. | Artikel, tatsächliche Lieferhöhen, Materialausführungen, Befestigungen und Originalkonturen vom Hersteller beziehen. Vorschaubilder bleiben Bildreferenzen; daraus entstehen weder CNC-Schriften noch geprüfte Befestigungsdaten. |

## Abdeckung des gesamten Markenspektrums

Die folgende Gruppierung ist ein Arbeitsvorschlag auf Basis der bereits belegten Kategorien, kein Nachweis vollständiger Downloadpakete aller Marken.

| Datenpaket | Marken aus dem bestehenden Quellenverzeichnis | Erforderliche Inhalte |
|---|---|---|
| Sanitär, Armaturen, Möbel und technische Einbauten | Duravit, antoniolupi, Agape, Dornbracht, VOLA, CEA, Zazzeri, Inbani, IdeaGroup, NevoBad, Devon&Devon, Cosmic, Effe | SKU/Variante, Maße, 2D-/3D-Originale, Einbaulage, Anschlüsse, Datenblätter. Weitere Portale und Berechtigungen je Hersteller noch prüfen. |
| Heizkörper, Leuchten und Spiegel | Tubes, Terma, Nimbus, Zierkon, Zierath | Variantenmaße, Anschluss-/Befestigungspunkte und Originalmodelle; bei Spiegeln/Leuchten technische Ausführungen getrennt halten. |
| Keramik, Mosaik, Naturstein und Außenflächen | 14oraitaliana, Mutina, Bisazza, SICIS, Living Ceramics, Godelmann, Mirage, Lithos Design, Aparici | Artikel-/Formatlisten, reale Stärke, Fugen-/Rasterinformationen, maßstäbliche Texturen. Reliefs und Formstücke benötigen zusätzlich echte Geometrie. Nicht jede ebene Fliese braucht ein eigenes großes Mesh. |
| Wandbeläge und Textilien | Glamora, Wall&decò, Londonart, Luiz | Motiv, Materialausführung, echte Wiederholungs-/Paneelmaße und freigegebene Bilder. Perspektivische Ambiente-Fotos eignen sich nicht als maßstäbliche Textur. |
| Offene Identitäten | Nero, K8; aktuelle Zierath-Zuordnung | Erst Quelle und Hersteller/Serie eindeutig klären, anschließend Datenlieferung zuordnen. Kein automatischer Merge mit einem ähnlich benannten Webtreffer. |

KALDEWEI und Strassacker sind zusätzlich für vorhandene Katalogdaten bzw. das Grabmalstudio relevant. Die Auflistung begründet keine Erweiterung des betrieblich freigegebenen Sortiments.

## Konkreter Integrationsvorschlag

1. **Herstellervereinbarung und Soll-Liste:** Deutschland-Sortiment, aktive Serien/SKUs/Varianten, Änderungsstände, Nutzungszwecke und Bezugskanal erfassen. Interne Anzeige, Kundenbilder, KI-Übermittlung und technische Weiterverarbeitung getrennt erlauben. Fehlt die Soll-Liste, lautet die Abdeckung „unbekannt“.
2. **Stammdaten einlesen:** Vorhandene geprüfte Artikelimportstrecke für passende CSV/DATANORM-Dateien verwenden. BMEcat/ARGE XML benötigen einen eigenen geprüften Adapter. Identität aus Hersteller + SKU + Variante bilden; GTIN ergänzen, wo tatsächlich vorhanden. Keine Maße oder Einkaufspreise aus Dateinamen ableiten.
3. **Originalpakete übernehmen:** Große Pakete asynchron mit Manifest verarbeiten. Original, Herkunfts-URL, Abrufzeit, Hash, Artikelbezug, Originaleinheit und Nutzungsnachweis privat aufbewahren. Erst nach Scan und Validierung bereitstellen; fehlerhafte oder unklare Zuordnungen in eine kurze Prüfliste legen.
4. **Geometrie für den Browser vorbereiten:** Erlaubte 2D-Formate in geprüfte Konturen, geeignete 3D-Austauschformate in GLB/glTF überführen. STEP/IGES, RFA/GSM, DWG und MAX benötigen formatabhängige Konverter und gegebenenfalls Herstellerexporte oder zusätzliche Softwarelizenzen. Ein Blender-Aufruf allein löst nicht alle Formate. Konvertierung isoliert und begrenzt ausführen; eingebettete Fremdreferenzen nicht ungeprüft nachladen.
5. **Maßhaltigkeit belegen:** Quell- und Zieleinheiten, Achsen, Ursprung, Bounding Box und mindestens bekannte Produktmaße vergleichen. Ansichtsmodell, vereinfachte Hülle, Ausschnittschablone und fertigungsgeeignete Kontur als unterschiedliche Datenqualitäten ausweisen. Eine schöne Darstellung bestätigt keine Fertigungstauglichkeit.
6. **Einfach im Studio verwenden:** Mitarbeiter suchen Hersteller/Serie/Artikel, sehen Vorschau, reale Maße und Quellenqualität. Technische Modelle werden maßhaltig platziert. Bilder können ausdrücklich als KI-Referenz gewählt werden. Ungeprüfte Modelle dürfen keine bestätigten Einbaumaße suggerieren.
7. **Aktuell halten:** Neue Hashes erzeugen neue Produkt-/Assetstände. Bestehende Planrevisionen bleiben an ihren Originalstand gebunden. Auslaufartikel verschwinden aus der neuen Auswahl, bleiben in alten Plänen lesbar. Nur dokumentierte Feed-/Exportwege synchronisieren.

## Empfohlene Reihenfolge und Abnahme

Zuerst Duravit, KALDEWEI, antoniolupi und Dornbracht für den Raumplan sowie Strassacker für Grabmale anbinden. Danach die übrigen Marken nach tatsächlicher Nutzung und Datenpaketen ergänzen; Oberflächen über Materialdaten statt wahlloser Modellimporte erschließen. Der Superadmin sieht je Hersteller: Soll-Varianten, importierte Artikel, geprüfte 2D-/3D-Daten, Bilder und offene Rechte/Zuordnungen. Die Planungsnutzer sehen diese Verwaltungsdetails nur, wenn sie für eine sichere Auswahl nötig sind.

Als vollständig gilt eine Lieferung erst nach Abgleich mit der vereinbarten Soll-Liste, repräsentativen Größen-/Achsentests und geklärten Nutzungszwecken. Die Anzahl heruntergeladener Dateien, ein Herstellerlogo oder ein KI-generiertes Ersatzobjekt erfüllt diese Abnahme nicht.
