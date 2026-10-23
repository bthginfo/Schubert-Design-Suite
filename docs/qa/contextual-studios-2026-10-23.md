# Planung, KI-Kontext und Herstellerbibliothek — 23.10.2026

## Umfang

Beide Planungsstudios, aktuelle Formularentwürfe im Backoffice und die neue Herstellerbibliothek wurden überarbeitet. Die Szenarien wurden mit synthetischen Daten aus den Perspektiven Planung/Steinmetz, Büro und UX/UI durchgespielt. Das ist eine technische und gestalterische Szenarioprüfung, kein behaupteter Test mit externen Mitarbeitern.

| Perspektive | Geprüfte Aufgabe | Ergebnis der Überarbeitung |
|---|---|---|
| Steinmetz / Grabmal | Stein anlegen, Inschrift wörtlich erhalten, Maße ändern, erneut öffnen, prüfen und ausgeben | Vier verständliche Schritte; kompakte Formauswahl; Außenmaße und Stärke im Vordergrund; optionale Position und Fertigung; direkte Textgestaltung; aktuelle Prüfliste |
| Steinmetz / Raum | 4.200 × 3.200 mm lichte Innenmaße mit 200 mm Wandstärke, Tür, Ansichten und Stückliste | Innen- und Achsmaße getrennt; tatsächliche Wandachsen entsprechend versetzt; Achsflächen in der Stückliste benannt; Belagsflächen behalten ihre eigene Geometrie |
| Büro | Angebot mit Dezimalkomma und abgewählter Option erstellen, Entwurf prüfen und speichern | Abschnittswechsel, gezielte Pflichtfeldhilfe, eingeklappte Zusatzangaben und exakte Vorschau der gewählten Positionssumme |
| Superadmin | Herstellerunterlage beginnen, später fortsetzen, Nutzung festlegen, Zugriff vergeben | Eigener Bereich, getrennte Fähigkeit, private Originale, Dateiprüfung, Studiozuordnung und bewusste Planungs-/KI-Nutzung |
| UX/UI | Desktop und Mobilgerät, Hell/Dunkel, Tastatur, Fokus, Fehler und Rückkehr | Ruhige Hierarchie, freier Einstieg bei leeren Plänen, beschriftete Aktionen, erreichbare Dialogfüße, sichtbare Lade-/Fehlerzustände und reduzierte Bewegung |

## KI-Vertrag

- Vor dem Senden werden fokussierte Studioeingaben übernommen und offene Änderungen gespeichert. Ein Fehler, Konflikt oder historischer Stand verhindert die Anfrage. Der Server vergleicht Revision und Versionsnummer mit dem aktuellen Variantenkopf.
- Der Kontext enthält Studioart, Arbeitsschritt, Ansicht und echte Auswahl. Bei der Verdichtung haben ausgewählte Elemente, Bezugsbauteile, Wandknoten, Eltern und treibende Maße Vorrang. Herkunftsmaße bleiben erhalten; ausgelassene Inhalte werden gezählt.
- Geometrie und Gestaltung besitzen unterschiedliche Arbeitsanweisungen und zulässige Operationsarten. Prüfen und Präsentieren erzeugen keine Planänderungen. Änderungen bleiben Vorschläge mit ausdrücklicher Übernahme.
- Der Formularcheck erhält ausschließlich den aktuellen begrenzten Entwurf, Felddefinitionen und höchstens 20 Positionen. Alte gespeicherte Positionen, Empfängerlisten und interne Einzelkosten werden ausgeschlossen. Geänderte Eingaben kennzeichnen die vorherige Antwort als überholt.
- Bildkontext bleibt vollständiges JSON mit gültigen Unicode-Zeichen. Zu große Inhalte werden begrenzt oder vor dem Anbieteraufruf abgewiesen, statt mitten in einem Wert abgeschnitten zu werden.

## Herstellerdaten und Berechtigungen

Migration `0043_manufacturer_assets.sql` ergänzt einen durch Mandant und Rechtsträger begrenzten Bereich. Nur SuperAdmin erhält die Verwaltung automatisch. SuperAdmin kann die zusätzliche Fähigkeit `manufacturer_assets` gezielt erteilen und entziehen. Die Uploadbefehle erlauben damit ausschließlich Herstellerunterlagen; allgemeine Dokument- oder Administrationsrechte werden nicht mitvergeben.

Eine Unterlage besitzt eine konkrete Originalversion und einen SHA-256-Bezug. Bereitstellung benötigt eine verfügbare, geprüfte private Datei, eine ausdrückliche Nutzungsgrundlage und mindestens einen erlaubten Zweck. SVG/DXF erfordert eine deklarierte Originaleinheit. KI-Nutzung ist auf freigegebene PDFs/Bilder begrenzt. Bereitgestellte Metadaten werden auch auf Datenbankebene unveränderlich gehalten. Ausblenden entfernt die neue Auswahl; historische Quellen bleiben erhalten.

In beiden Studios führen PDF/Bild, SVG/DXF und KI-Referenz zu ihrem passenden Ablauf. Quelle und Einheit werden vorbelegt; Kalibrierung, Einheitenprüfung, Bildvorbereitung und technische Produktprüfung behalten ihre jeweiligen Fachschritte. Die Auswahl selbst startet keinen Modellaufruf. GLB-Dateien lassen sich ablegen und öffnen; eine automatische Umwandlung ungeprüfter GLBs in katalogisierte Fertigungsmodelle wird nicht behauptet.

Die abschließende Codeprüfung hat die Dokumentbindung zusätzlich eingegrenzt: Ein Planer darf nur die tatsächlich bereitgestellte Dateiversion öffnen. Weitere, nicht bereitgestellte Dateien unter demselben Bibliothekseintrag werden weder über Suche noch Direktzugriff sichtbar. Uploads auf bereits bereitgestellte Einträge sind gesperrt. Auch direkt übermittelte Planquellen und Konturen behalten die Prüfung des erlaubten Nutzungszwecks.

## Ausgeführte Prüfungen

- Svelte-/TypeScript-Prüfung: ohne Fehler und Warnungen.
- Unit-Tests: 340 Prüfungen in 57 Dateien bestanden.
- PostgreSQL: 45 Integrationsprüfungen bestanden, darunter Live-Revision, veralteter Kontext, Formularumfang, Bibliotheksdelegation und Widerruf, Quarantäne, Nutzungszweck, Studiozuordnung, unveränderliche Quelle und Mandantentrennung.
- Produktionsbuild einschließlich gebundener Schrift-/Materialdateien und Worker erfolgreich. Für die lokale Cloud-Netzwerkumgebung wurde `NODE_USE_ENV_PROXY=1` verwendet.
- Anforderungsmatrix: 154 Fachabschnitte und 69 Szenarien zugeordnet; Quelltextprüfung auf Zugangsdaten bestanden. Die Matrix ist kein zusätzlicher fachlicher oder externer Providernachweis.
- Browserprüfung: alle **47 Fälle im gemeinsamen Abschlusslauf bestanden** (8,7 Minuten, Chromium). Echte Anmeldung, Befehle und PostgreSQL; neue Studio-/Büro-/Herstellerabläufe, Hell/Dunkel, mobile Schubladen und Vollbild, Tastatur/Fokus, WCAG-A/AA, Einführung, Suche, Feedback, Kalender, Offline-Zeit sowie echte PDF-/Stücklistenausgaben.
- Zwei tatsächliche Planungs-PDFs mit je fünf Seiten erzeugt. Grundriss, Ansichten, Maße, Maßstäbe und Stückliste wurden gerendert und visuell geprüft. Dabei wurden missverständliche Angaben zu Achsflächen und noch unbestätigten Planmaßen korrigiert.

Im breiten Browsertest wurden zwei weitere Bedienungsprobleme behoben: Die mobile Kopfzeile lässt mehr Platz für die Zeichenfläche; bei begrenzter Fensterhöhe bleibt eine vertikal erreichbare Mindesthöhe erhalten. Vor der Clientinitialisierung sind Bedienelemente noch nicht aktiv, damit frühe Klicks und Eingaben nicht verloren gehen. Eine gewählte KI-Quelle öffnet ihren Vorbereitungsbereich sofort. Der Positionssprung im Büroformular besitzt ein eigenes Ziel und setzt den Fokus auf die erste Leistung.

## Grenzen und Einführung

In dieser Arbeitsumgebung fehlen produktive OpenAI-, Blob- und Dokumentworker-Zugangsdaten. Kostenpflichtige Chatantworten wurden in den Browserfällen ausdrücklich am Transport simuliert. Der Quellen-Auswahltest verwendet klar synthetische Dateimetadaten; er behauptet keinen erfolgreichen Upload, Virenscan oder privaten Dateidownload. Die serverseitigen Dateisperren wurden separat mit PostgreSQL geprüft. Die Qualität neuer echter KI-Antworten und Bilder sowie ein vollständiger Datei-/Scanlauf benötigen die eingerichteten Betriebsverbindungen.

Die technische Zeichenfläche behält ihr helles Papier auch im dunklen Theme. Raumflächen und Bodenschichten folgen der bestehenden Achsgeometrie; diese Berechnungsregel wurde nicht stillschweigend auf lichte Flächen umgestellt. Automatisierte WCAG-Prüfungen und Browser bei 375/1440 Pixeln ergänzen die spätere Prüfung mit den tatsächlichen Geräten und Mitarbeitern.

## Sichtbare Nachweise

- Grabmalstudio: [Desktop](contextual-studio-evidence/memorial-desktop.png), [Mobil](contextual-studio-evidence/memorial-mobile.png).
- Raumstudio: [Desktop](contextual-studio-evidence/room-desktop.png), [Mobil](contextual-studio-evidence/room-mobile.png).
- Herstellerdaten: [fortsetzbarer Entwurf](contextual-studio-evidence/manufacturer-draft.png), [Auswahl im Raumstudio](contextual-studio-evidence/manufacturer-picker-room_plan.png).
- Büro: [ausgewählte Positionssumme am Desktop](contextual-studio-evidence/office-totals-desktop.png), [auf dem Mobilgerät](contextual-studio-evidence/office-totals-mobile.png).
- Echte Exporte: [Grabmal-PDF](contextual-studio-evidence/memorial.pdf), [Raum-PDF](contextual-studio-evidence/room_plan.pdf), [Revisions- und Hashnachweis](contextual-studio-evidence/pdf-evidence.json).

Vor dem produktiven Einsatz des neuen Bereichs muss Migration 0043 auf dem Zielsystem angewendet werden. Diese Arbeit enthält keine Produktionsmigration und keine produktive Veröffentlichung.
