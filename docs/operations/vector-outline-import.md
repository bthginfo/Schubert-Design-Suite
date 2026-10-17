# Originalkonturen aus SVG und DXF

Im Studio ein Natursteinbauteil oder eine Bearbeitung wählen und bei **Geometrie & Ausschnitte → SVG / DXF importieren** eine private Originalversion auswählen oder hochladen. Die Datei wird erst nach der unabhängigen Dateiprüfung verwendet. Die tatsächliche Einheit und die maximale geometrische Abweichung sind ausdrücklich zu bestätigen. Ein Import ersetzt weder Aufmaß noch Hersteller-, Rechte- oder Fertigungsfreigabe.

Die Vorschau unterscheidet getrennte gefüllte Bestandteile und ihre Löcher. Alle Bestandteile oder ein ausdrücklich ausgewählter Bestandteil können übernommen werden. Keine offene Linie wird unbemerkt geschlossen; sich schneidende oder nicht eindeutig zuordenbare Konturen werden abgelehnt. Die Kontur bleibt über Dateiversion, SHA-256, Parserstand, Einheit und Fehlergrenze mit den Originalbytes verbunden. Jede Speicherung prüft die normalisierte Geometrie erneut gegen diese Originalversion. Eine nachträgliche freie Konturänderung verliert den Originalnachweis und die dazugehörige fachliche Bestätigung.

## Unterstützter Umfang

| Quelle | Geometrie und Transformationen |
|---|---|
| SVG | Geschlossene Pfade mit M/L/H/V/C/S/Q/T/A/Z, Polygon, ausdrücklich geschlossene Polyline, Rechteck mit Rundungen, Kreis und Ellipse; relative Befehle, Gruppenmatrizen, Translation, Drehung, Skalierung, Scherung und physischer viewBox-Bezug |
| ASCII-DXF | LINE, ARC, CIRCLE, LWPOLYLINE mit Bulges, zweidimensionale POLYLINE/VERTEX, ELLIPSE, geklemmte positive gewichtete SPLINE/NURBS bis Grad 8 und interne BLOCK/INSERT-Instanzen mit Basisposition, Skalierung und Drehung |

Geraden und unter ihrer Transformation erhaltene Kreisbögen bleiben analytisch. Bézierkurven, Ellipsen und NURBS werden im endgültigen Millimeterraum mit einer begrenzten Abweichung angenähert. Der Benutzer wählt 0,02–5 mm; die Grenze enthält die Koordinatenquantisierung auf 0,01 mm. Sie ist ausdrücklich keine Fertigungstoleranz. Bei Mindestabstands- und Reststegprüfungen wird die Quellenabweichung konservativ berücksichtigt. Große transformierte Quellen erhalten keine bloße Fehlerschranke in Bildschirmpixeln.

SVG-Füllregeln `evenodd` und `nonzero` werden ausgewertet. Verschachtelte gleichgerichtete Unterpfade sind bei `nonzero` keine erfundenen Löcher. DXF-Linienketten werden nur an identischen normalisierten Endpunkten verbunden. Eine Verzweigung, Lücke, uneindeutige Überschneidung oder ein Widerspruch zwischen bestätigter Einheit und `$INSUNITS` stoppt den Import.

Moderne DXF-Dateien und SVG werden als gültiges UTF-8 gelesen. Für ältere DXF-Versionen werden ausdrücklich deklarierte unterstützte Windows-/ostasiatische Codepages ausgewertet. Unpassende Originalbytes werden nicht still durch Ersatzzeichen verändert. Eine gemeinsame DXF-Z-Ebene wird im Nachweis separat gespeichert; ihre Projektion in eine lokale Bauteilfläche bestätigt keine Einbauhöhe.

## Bewusste Abweisungen

Binär-DXF, externe Referenzen, nicht aufgelöste Blockraster, periodische oder nicht geklemmte Splines, negative NURBS-Gewichte, 3D-/abweichende OCS-Geometrie, mehrere Z-Ebenen und unbekannte geometrische Entities müssen vorher in eine dokumentierte unterstützte Originalfassung überführt werden. Der Import lässt solche Geometrie nicht unbemerkt weg. SVG mit Skripten, aktiven Ereignissen, externen Quellen, DTD/Entitäten, Masken, Clips oder geometrieverändernden nicht unterstützten CSS-Regeln wird nicht verarbeitet. Nicht instanzierte Definitionen und sichtbare Beschriftungen ergeben keine Fertigungskonturen.

Das Importlimit beträgt 8 MB Originalbytes, 1000 Konturbestandteile und 10000 Kanten. Sehr große Quellen sind in nachvollziehbare Teilartikel aufzuteilen; das System lockert dafür keine Fehlerschranke.

## Fachliche Bestätigung und Ausgabe

Die Übernahme ist zunächst ungeprüft. Ein technisch berechtigter Mensch kann sie mit einer unabhängigen verfügbaren Prüfdatei, akzeptierter Abweichung und begründetem Geltungsbereich bestätigen. Eine KI oder die Originaldatei selbst kann diesen Nachweis nicht ersetzen. Nutzungsrechte werden über die getrennten Katalog-/Assetfreigaben belegt.

Technische PDF, Stückliste, 2D, 3D und Blender verwenden dieselben Konturbestandteile einschließlich Löchern. Die PDF dokumentiert Quelle, Hash, Parserstand, Einheit, Fehlergrenze und tatsächlichen Prüfstatus. Die Stückliste zählt getrennte körperliche Teile und berechnet deren wirkliche Nettofläche und Volumen. Ein Fertigungspaket wird bei fehlenden erforderlichen Nachweisen gesperrt.

Implementierung: `packages/application/src/vector-outlines.ts`, `vector-imports.ts`, `packages/geometry/src/curve-import.ts`. Referenzgrundlagen: [W3C SVG-Pfade](https://www.w3.org/TR/SVG2/paths.html), [SVG-Implementierungshinweise](https://www.w3.org/TR/SVG/implnote.html), [Autodesk DXF-Referenz](https://help.autodesk.com/view/OARX/2026/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3).
