# Suchauswahlen und Planungsarbeitsfläche

Stand: 19.10.2026. Ausgangspunkt ist Commit `adb482909eef9d57aba176c1cddcef608a30edc1`. Der konkrete Auslieferungsnachweis mit Commit, CI, aktivem Vercel-Stand und Live-Abnahme wird separat in `work/planner-release-acceptance.json` geführt. Er ist kein Bestandteil des öffentlichen Quellcodes und enthält keine Zugangsdaten.

## Umfang

- Alle 155 vorhandenen einfachen Auswahlen in 57 Svelte-Dateien erhalten eine gemeinsame Suchbedienung. Der ursprüngliche Select bleibt für Wertbindung, Optionen, Pflichtprüfung und Geschäftsaktionen maßgeblich. Die statische Prüfung bestätigt identische ursprüngliche Feldattribute und passende reaktive Werthinweise an sämtlichen Stellen.
- Tippen filtert lokal; es übernimmt keinen freien Text als fachlichen Wert. Escape und Tab bewahren die bisherige Zuordnung. Erst eine bewusste Auswahl übernimmt den tatsächlichen Eintrag. Unveränderte Werte lösen keine doppelten Eingabe-/Änderungsereignisse aus. Die numerischen Stationswerte der Einführung bleiben typgerecht.
- Gesperrte Optionen und über ein Fieldset gesperrte Eigenschaften bleiben gesperrt. Feldnamen, Hilfetexte und Fehlerbezüge sind an der sichtbaren Bedienung erreichbar. Pflichtfehler führen zum sichtbaren Feld. Bei fehlender Browserunterstützung bleibt die native Auswahl erhalten.
- Auswahlfenster nutzen die oberste Browserebene und bleiben innerhalb des zugehörigen Dialogs oder Studio-Vollbilds. Bestehende ausdrückliche Bestands-/Katalogsuche bleibt erreichbar; lokale Texteingaben lösen keine zusätzliche Datenbank- oder KI-Anfrage aus.
- Papier-, Arbeitsraum- und erhöhte Flächen unterscheiden sich deutlicher. Eine einzelne statische Hintergrundaufhellung und weiche Panelschatten schaffen Tiefe in Hell und Dunkel. Persönliche Akzente, Statusbedeutungen und technische Zeichenfarben bleiben erhalten.
- Das Studio erhält eine kompakte Projekt-/Speicherzeile, beschriftete Werkzeuge, zusammengefasste Darstellungseinstellungen und Projektaktionen. Elementliste und Eigenschaften sind getrennt ein-/ausblendbar. Auf kompakten Bildschirmen öffnen sie bewusst als Dialoge; der Plan bleibt zuerst erreichbar.
- Auswahl und Ziehen öffnen eine bewusst geschlossene Eigenschaftenleiste nicht erneut. Das verhindert einen Größenwechsel der Zeichenfläche während einer Bewegung. Die vorhandenen Maß-, Raster-, Fang-, Kontur-, Schrift-, Material-, Bild-, Quellplan-, Varianten-, Prüf-, PDF- und Stücklistenabläufe bleiben erreichbar.
- Natives Vollbild und die bei abgelehntem Browser-Vollbild verfügbare Ersatzansicht nutzen den gesamten Viewport ohne äußeres Editor-Scrollen. Seitenbereiche scrollen unabhängig. Die tatsächliche Vollbildart wird angezeigt. Der Begleiter erhält eine eigene freie Ecke bei den unteren Editoraktionen.
- Auf dem Handy werden nur im geöffneten Editor der Seitenabstand und der Testhinweis verdichtet. „Testbetrieb“ und der Hilfezugang bleiben sichtbar; die vollständige Erklärung bleibt erreichbar. Bibliothek und andere Arbeitsbereiche behalten ihren Kontext. Varianten und Revisionen liegen auf kleinen Bildschirmen im Projektmenü; Projektname und Speicherzustand bleiben lesbar.
- Geöffnete und geschlossene 3D-Kamerabereiche belegen eigenen Platz. Das Modell wird an die verfügbare Zeichenfläche angepasst. Das gilt auch für kurze Vollbildfenster und die mobile Ansicht.
- In mehrzeiligen PDF-Stücklisten liegt die Trennlinie jetzt zwischen den Einträgen. Mengen, Berechnung, Zeilenhöhe und Seitenumbrüche bleiben unverändert.

## Nachweise

| Prüfung | Ergebnis |
|---|---|
| Funktions-/Hilfslogik | 334 Tests in 56 Dateien bestanden |
| PostgreSQL | 39 Integrationsprüfungen bestanden; keine Schemaänderung erforderlich |
| Vollständige Auswahlmigration | 155 Stellen in 57 Dateien, keine fehlenden Aktionen, keine abweichenden Werthinweise und keine geänderten ursprünglichen Select-Attribute |
| Zugangsdatenprüfung | 613 Repository-Dateien bestanden |
| Typen/Svelte | Abschließender vollständiger Lauf nach der PDF-Linienkorrektur: 0 Fehler/0 Warnungen |
| Produktionsbuild | Abschließender Build nach der PDF-Linienkorrektur bestanden |
| Browser | Alle 41 unterschiedlichen Szenarien nach Korrekturen bestanden; Verlauf und Wiederholungen siehe unten |
| Visuelle Bestätigung | 29 abschließende Ansichten: kein horizontaler Überlauf, keine JavaScript-Fehler, keine kritischen/schweren Axe-Befunde; keine Geschäftsänderungen oder KI-Aufrufe |
| PDF-Exporte | Zwei tatsächliche repräsentative Exporte mit je fünf Seiten vollständig gerendert und visuell geprüft; nach der Linienkorrektur beide erneut erfolgreich ausgegeben und gerendert, beide korrigierten Stücklistenseiten visuell bestätigt |
| Unabhängige UX-Bewertung | Zweite vollständige Bewertung: PASS, disposition ship, 8/12; frische Prüfung durch separaten Agenten desselben verfügbaren Modellanbieters |
| Veröffentlichung | GitHub-CI, aktiver Produktionscommit und erreichbare Live-Seiten werden im separaten Auslieferungsnachweis erfasst |

### Browser- und Sichtprüfung

Der vollständige erste Browserlauf bestand 37 von 41 Szenarien. Vier Fehlschläge führten zu konkreten Korrekturen: eine beabsichtigt geänderte dunkle Papierfarbe im Test, ein tatsächlicher Platzkonflikt zwischen 3D-Kamera und Modell sowie zwei veraltete Erwartungen für die zusammengefassten PDF-Menüaktionen. Danach bestanden zehn von elf gezielt wiederholten Szenarien. Das verbleibende Szenario verwendete noch ein absichtlich ausgeblendetes mobiles Beschriftungselement zur Größenmessung. Nach Anpassung an die tatsächlich sichtbare Kamerasteuerung bestand auch dieser repräsentative Grabmal-/Grundrisstest. Die Prüfung, dass Modell und Bedienelemente einander nicht verdecken, bleibt erhalten. Damit sind alle 41 unterschiedlichen Szenarien durch erfolgreiche Läufe abgedeckt; es wird kein einziger durchgehend grüner 41er-Lauf behauptet.

Die Szenarien umfassen reale sichtbare Suchbedienung, deutsche Sonderzeichen, leere Treffer, gesperrte Felder, Tastatur/Fokus, unveränderte native Werte beim Tippen, Dialoggrenzen, natives und Ersatz-Vollbild, mobile Seitenbereiche, Schrift und Geometrie, Ziehen und Speichern, Revisionen, Kameraaktionen sowie tatsächliche PDF- und Stücklistenexporte. Die Suchtests bestätigen ausdrücklich null API-Anfragen während des Tippens.

Die erste gebündelte Sichtprüfung umfasste 28 reale Ansichten. Sie deckte den fehlenden zugänglichen Namen der kompakten Einpassen-Schaltfläche, eine unvollständige ARIA-Struktur bei leerem Suchergebnis und einen Fokuswechsel auf, durch den ein Pfeilklick eine Liste wieder öffnete. Alle drei Fehler wurden behoben und im Browser bestätigt. Aus der ersten unabhängigen Bewertung entstand ein gemeinsamer Korrektursatz für Handyaufteilung, vollständige Projekt-/Speicherinformationen, Tablet-Beschriftung und räumlich getrennte 3D-Kamerasteuerung.

Die abschließende Bestätigung umfasst 29 Ansichten des korrigierten Produktionsbuilds: Desktop, Tablet, Handy, Hell/Dunkel, geöffnete Suchfelder und Dialoge, Elementliste, Eigenschaften, Projektmenü, Varianten, beide Studios, natives Vollbild und Begleiter im Vollbild. Im gemessenen Beispiel bei 375 × 812 Pixeln hat die tatsächliche mobile SVG-Zeichenfläche rund 254 Pixel Höhe. Das native Desktop-Vollbild nutzt 1440 × 1000 Pixel ohne äußeren Scrollbereich; auch bei 1180 × 650 Pixeln bleiben Modell und Kamera getrennt.

Der Tastatureinstieg in die technische SVG-Anwendung ist absichtlich fokussierbar und besitzt einen echten Tastaturhandler. Eine einzelne begründete Svelte-Ausnahme betrifft ausschließlich die Einordnung dieses Anwendungscanvas; zugängliche Elementliste, Formularbearbeitung und Browserprüfungen bleiben bestehen.

### PDF-Prüfung

Die repräsentativen gespeicherten Revisionen enthalten eine abgerundete Stele mit Schrift und Bemaßung sowie einen Grundriss mit Wänden und Türöffnung. Jeweils alle fünf PDF-Seiten wurden gerendert und betrachtet: technische Ansichten, Stückliste und offene Prüfgrundlagen. Eine zu eng sitzende Trennlinie in der mehrzeiligen Stückliste wurde anschließend korrigiert. Beide gespeicherten Revisionen wurden am abschließenden Produktionsbuild erneut als PDF ausgegeben und mit je fünf Seiten gerendert. Beide korrigierten Stücklistenseiten sind visuell bestätigt; die Trennlinien berühren keine Beschriftung. Hinweise auf unbestätigte Maße und Materialnachweise gehören zum Entwurfsstand und stellen keine Fertigungsfreigabe dar.

## Betrieb und Grenzen

Es werden keine neuen Dienste, laufenden Abfragen, Animationen, Bildgenerierungen oder Datenbanktabellen eingeführt. Produktions-Beispieldaten bleiben erhalten. Verändernde Browsertests laufen ausschließlich lokal mit synthetischen Daten. Kostenpflichtige Modellaufrufe werden abgefangen. Diese Iteration testet keine kostenpflichtige photorealistische KI-Bilderstellung.

Die zuvor nachgewiesene Microsoft-Organisationssperre für das Live-Studio dieses Rechners wird nicht umgangen und nicht erneut unverändert angefahren. Die Planung wird am lokal ausgeführten Produktionsbuild entlang der getesteten Abläufe geprüft; erreichbare veröffentlichte Seiten werden zusätzlich kontrolliert. Geräteansichten im Browser ersetzen keine spätere Erprobung mit den tatsächlichen Baustellengeräten.
