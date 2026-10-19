# Abhängigkeiten und Quellen

Direkte installierte JavaScript-Versionen und Lizenzangaben stehen in `dependencies.json`, der vollständige aufgelöste Abhängigkeitsbaum in `pnpm-lock.yaml`. Der Paket-Audit am17.10.2026 meldete keine bekannten Schwachstellen (0kritisch/hoch/mittel/niedrig). Das ist eine datierte Registerabfrage und ersetzt keine spätere Aktualisierung.

Die Anwendung verteilt keine zugekauften Herstellerkonturen oder Bohrdaten. Schubert-Marken-/Strassacker-Referenzen sind mit beobachteter Quelle und Datum gespeichert. Eine öffentliche Vorschau gewährt keine automatische Nutzungs- oder Weitergabeberechtigung. Konkrete Assets benötigen den jeweiligen Rechte- und Genauigkeitsnachweis.

## Isolierte Dokumentverarbeitung

- factur-x7.7: [Projekt und Lizenz](https://github.com/akretion/factur-x); EN16931-XML, Hybrid-PDF und festgelegte Validatorpakete.
- WeasyPrint70.0: [Projekt](https://github.com/Kozea/WeasyPrint), BSD-Lizenz; Drucklayout und PDF/A-Erzeugung.
- pdfplumber0.11.10, pypdf6.21.1, pypdfium2 5.14.0, Pillow13.0.0: Paketlizenzen werden in der Python-Installation mitgeführt.
- SaxonC-HE13.1.0: [Saxonica](https://www.saxonica.com/), Mozilla Public License2.0 für die verwendete HE-Verteilung; offizielle XSLT-Regelprüfung.
- KoSIT XRechnung-Konfiguration2026-08-31 / CII+UBL / EN16931 CEN1.3.16 / DE2.6.0: [offizielles Release](https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/tag/v2026-08-31). Downloadarchiv SHA256 `2530cd107c414511c5d0462ec10f886910395abfca820db82e83d70bf01221a8`; Lizenz-/Hinweisdateien bleiben im installierten Paket erhalten.
- veraPDF1.30.3: [Projekt](https://verapdf.org/), unabhängige PDF/A-Prüfung; Lizenzdateien der Distribution bleiben erhalten.
- ClamAV1.4.3 mit datierten Virensignaturen sowie Tesseract/ffmpeg aus dem Containerpaketbestand. [ClamAV](https://www.clamav.net/), [Tesseract](https://github.com/tesseract-ocr/tesseract), [FFmpeg](https://ffmpeg.org/). Es wird kein Erfolg bei nicht verfügbarer Signatur-/Dateiprüfung vorgetäuscht.

## Renderer und Schriften

Die Gestaltungsvorschau verwendet Noto Serif, Cinzel, Lora, Cormorant Garamond, Great Vibes und Montserrat unter SIL Open Font License 1.1. Vollständige OFL-Texte stehen in `apps/web/static/planning-fonts/*-OFL.txt`; das Manifest enthält feste Quellen und SHA-256. Diese Entwurfsschriften werden nicht als Herstelleroriginale ausgegeben.

Repräsentative Gesteinsstrukturen von ambientCG sind nach [CC0 1.0](https://docs.ambientcg.com/license/) auch innerhalb kommerzieller Anwendungen weitergebbar. `apps/web/static/planning-materials/manifest.json` führt Kennungen, Quellen und Hashes. Der Build prüft die Dateien vor der lokalen Auslieferung. Die Texturen sind keine behaupteten Originalabbildungen bestimmter Lieferplatten.

Handelsnamen, Gesteinsbezeichnungen und Herkunftsangaben aus dem ROSSITTIS-Steinlexikon werden als Fakten mit Quellenhash, Datum und Link geführt. Lieferantenfotos, Marketingtexte und technische Freigaben werden nicht übernommen.

Blender4.5.14 wird als isolierter Prozess aus der offiziellen Distribution verwendet, SHA256 `9ba871ff2ecd36526b77432745980b7e6664ecd0c7ca11c48849073dcfe06da3`. Die Distribution enthält ihre Lizenzdateien. Blender steht unter GPL; korrespondierende Quellen und Lizenzinformationen: [Blender-Lizenz](https://www.blender.org/about/license/), [offizielle Releases](https://download.blender.org/release/Blender4.5/), [Quellcode](https://projects.blender.org/blender/blender). Die eigenständige Prozessanbindung macht kein Hersteller-CAD-Modell zu einem frei lizenzierten Asset.

Die eingebetteten Planungsschriften führen ihre Lizenz in `packages/documents/src/planning-fonts.LICENSE`. Die Weboberfläche verwendet das installierte Inter-Paket; dessen OFL-Dateien werden mit dem Paket bereitgestellt. Bei einer Weitergabe des vollständigen Quellbestands oder der Container sind diese Lizenzhinweise und die jeweiligen mitgelieferten Texte zu erhalten.
