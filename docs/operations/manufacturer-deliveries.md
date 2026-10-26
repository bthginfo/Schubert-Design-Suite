# Deutsche Herstellerdaten übernehmen

Stand: 26.10.2026. Für Duravit ist eine manuelle, versionierte CSV-Übernahme vorbereitet. Der Betrieb hat nach eigener Auskunft noch keine Bezugsquelle. Ein vollständiger Datenbestand oder automatischer Herstellerfeed ist deshalb **nicht** eingerichtet.

## Quelle beschaffen

Das [offizielle deutsche Duravit-Downloadcenter](https://pro.duravit.de/pro/html/default/downloadcenter.de-de.html) beschreibt unter anderem CAD-Daten, Bilder und technische Unterlagen. Es belegt weder einen vollständigen maschinenlesbaren Artikelbestand noch die Nutzungsrechte für eine konkrete Datei. Einen deutschen Artikel-/CAD-Export beim Hersteller oder autorisierten Lieferanten beziehen und die erlaubte Verwendung dokumentieren. Artikelnummern als Text erhalten. Keine US-, Schweizer oder französischen Sortimente ergänzen.

## Im Tool

1. Mit Berechtigung für Herstellerbibliothek **und** Katalog die Herstellerbibliothek öffnen. Standardmäßig besitzt der Superadmin den Zugang; zusätzliche Benutzerberechtigungen werden über die bestehende Administration vergeben.
2. „Duravit-DE · Artikeldaten importieren und aktualisieren“ öffnen. Einen UTF-8-CSV-Export mit höchstens 500 Artikeln und 650 KB wählen. Größere Lieferungen aufteilen.
3. Artikelnummer und Bezeichnung sowie vorhandene Maßspalten ausdrücklich zuordnen. Die Einheit der Originaldaten festlegen. Leere Maße bleiben unbekannt; Preise, technische Freigaben und Bestellvollständigkeit werden nicht abgeleitet.
4. Die Quelldatei privat hochladen. Vor der Vorschau muss die tatsächliche Dateiprüfung abgeschlossen sein. Eine nicht verfügbare Prüfung erzeugt keinen erfolgreichen Import.
5. Die Vorschau erstellen und neue, geänderte und unveränderte Artikel prüfen. Die belegte Planungsnutzung der Quelldatei ausdrücklich freigeben; ohne diese Quellenfreigabe bleibt die Katalogübernahme gesperrt. Die Datei wird dadurch nicht für KI freigegeben. Bei Änderungen werden bisherige und neue Maße gegenübergestellt. Erst „Geprüfte Referenzstände übernehmen“ ändert den Katalog.
6. Bei einer späteren Lieferung erneut prüfen. Veraltete Vorschauen werden abgewiesen. Frühere Artikelversionen und damit verbundene Planrevisionen bleiben erhalten. Ein fachlich freigegebener aktiver Artikelstand wird nicht durch eine bloße Referenzlieferung ersetzt.

Der Dateihash bindet die geprüften CSV-Bytes an die gescannte Originalfassung. Er beweist keine Herstellerautorschaft und ersetzt keine fachliche Quellenprüfung. Die Oberfläche übernimmt keine angebliche Vollständigkeit aus der Zahl importierter Artikel.

## CAD, Fotos und Rechte

Die CSV erzeugt Artikelreferenzen mit bekannten Außenmaßen. Sie erzeugt **kein** Originalmodell und keine technische oder rechtliche Freigabe. CAD-Originale und Bilder werden über die bestehende Herstellerbibliothek mit Artikelbezug, Originaldatei, Quelle und erlaubter Verwendung ergänzt. Geprüfte technische Katalogmodelle benötigen weiterhin die vorhandenen Geometrie-, Rechte- und Freigabenachweise. Eine Quaderhülle bleibt als Referenz erkennbar.

Für den Nachweis „alle Herstellermodelle“ fehlen ein verbindlicher deutscher Soll-Bestand, eine fortlaufende Bezugsquelle, Nutzungsrechte und ein Abgleich der tatsächlich verfügbaren Originale. Ohne diese Eingaben bleibt die Abdeckung unbekannt.
