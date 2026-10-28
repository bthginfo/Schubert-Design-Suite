# Planungsabläufe für Büro und operative Mitarbeitende · 28.10.2026

Agentengestützter Usability-Durchlauf auf der echten Anwendung, mit synthetischen Testkonten und Testplänen. Kein Test mit menschlichen Versuchspersonen. Ausgangsstand: `4975f6d`, Produktion `dpl_7rzsEfTiaQn9mDc8cWYrqQTTLFBh`.

## Aufgaben und Testdaten

- Büro und Mitarbeiter: jeweils Grabsteinplanung mit KI und hochgeladener grober PNG-Skizze sowie manuelle Badplanung.
- Skizze: Rundbogenstele 600 × 900 × 120 mm, Sockel 700 × 140 × 180 mm, synthetische Inschrift „MARIA MUSTER / 1950 - 2025 / In liebevoller Erinnerung“.
- Bad: lichte Innenmaße 3000 × 2400 mm, Höhe 2500 mm, Wandkern 115 mm; Entwurf bleibt ungeprüft.
- Gekennzeichnete Zugänge: `ux.backoffice.20261028@schubert.invalid` und `ux.operativ.20261028@schubert.invalid`. Passphrasen und Sitzungen gehören nicht in dieses Protokoll.

## Reproduzierte Findings und Änderungen

| ID | Schwere | Beobachtung / Reproduktion | Änderung | Nachtest |
| --- | --- | --- | --- | --- |
| U01 | Blockierend | Anmeldung als Büro, Studio öffnen: Navigation fehlt, direkter Aufruf zeigt „Planungszugriff fehlt“. | Planungsrecht standardmäßig für Büro; vom Benutzer am 28.10. ausdrücklich bestätigt. | Live: beide Planarten gespeichert; keine persönlichen Zusatzrechte. |
| U02 | Blockierend | Anmeldung als Mitarbeiter, gleicher Versuch: Planung vollständig gesperrt. | Planungsrecht standardmäßig für Mitarbeiter, ohne technische oder finanzielle Freigabe. | Live: beide Planarten gespeichert; keine persönlichen Zusatzrechte. |
| U03 | Blockierend | Leeren Grabsteinplan öffnen, PNG-Skizze hochladen/vorbereiten und konkrete Plananlage verlangen: Kostenlimitfehler vor dem Provideraufruf bei 0,02 USD. | Optionale Fachhilfen werden nur angeboten, wenn auch ihr zweiter Aufruf in das Limit passt. Sonst bleibt die normale Planung mit denselben Quellen und demselben Modell verfügbar. Einzelanfrage und Monatsbudget werden weiter geprüft. Auf ausdrücklichen Wunsch wurde der Rahmen auf 0,25 USD erhöht. | Grenztests bestanden; echte Skizzenanfragen mit beiden Rollen erfolgreich. |
| U04 | Mittel | Der Kostenfehler nennt weder kalkulierten Betrag noch Limit und empfiehlt ausschließlich kleinere Referenzen. | Echte Überschreitungen nennen Betrag, Limit, fehlenden Provideraufruf, erhaltene Eingaben und mögliche Prüfung durch die Administration. | Automatische Grenztests bestanden; Eingaben bleiben erhalten. |
| U05 | Mittel | Raum anlegen, Eigenschaften öffnen: unter X/Y/Z erscheint dreimal `isabled}/>`; die zugänglichen Feldnamen nennen auch bei cm/m immer mm. | Beschädigten Text entfernt und zugängliche Einheit an die sichtbare Auswahl gebunden. | Vier Browserabläufe mit Einheitenwechsel und Axe-Prüfung bestanden. |
| U06 | Blockierend | Nach Anhebung des Limits scheitern zwei echte KI-Versuche an erfundenem Sockel-Verwendungszweck bzw. nicht beschriebenen Schrift-/Positionsfeldern. | Zulässige Kategorien und Koordinaten werden dem Modell ausdrücklich mitgeteilt; gängige Sockelbezeichnungen werden normalisiert. Unbekannte Angaben bleiben gesperrt; Fehler bieten deutsche Wiederherstellung ohne interne Schemaausgabe. | Echte Vorschläge beider Rollen übernommen und erneut geladen. |
| U07 | Blockierend | Der echte Büro-KI-Nachtest liefert syntaktisch ungültiges eingebettetes Änderungs-JSON. | Für leere Grabmalvarianten liefert das Modell einen strikt strukturierten Gesamtentwurf. Der Server erzeugt die konkreten Bauteile; freie JSON-Befehle sind in dieser Antwort ausgeschlossen. | Beide echten Skizzenabläufe auf dem finalen Code bestanden. |
| U08 | Blockierend | Der echte Mitarbeiter-Nachtest verwendet dasselbe neue Maßkürzel für Stein und Sockel mit unterschiedlichen Werten; der Plan bleibt leer und eine interne Maß-ID erscheint als Fehler. | Der strukturierte Entwurf vergibt serverseitig eigene IDs. Bei freien Bearbeitungen bleiben lokale Maßbezeichnungen an ihr neues Bauteil gebunden. | Separate Stärken 120/180 mm gespeichert; Unit- und PostgreSQL-Prüfungen bestanden. |
| U09 | Hoch | Nach einer Auslieferung kann eine identische Anfrage noch konkrete Operationen aus dem vorherigen Antwortformat wiederverwenden; der bisherige Cache-Schlüssel berücksichtigt die geänderten Anweisungen und Schemas nicht. | Cache-Schlüssel bindet tatsächliche Anweisungen, Antwortschema und Version des Entwurfsbauers. Aktuelle Antworten bleiben kostenfrei wiederverwendbar. | PostgreSQL-Test mit altem Cache-Eintrag und anschließendem aktuellem Cache-Treffer bestanden; beide Live-Anfragen neu ausgeführt. |
| U10 | Mittel | Die PDF-Seitenansicht des ersten strukturierten Entwurfs zeigt 210 mm statt 180 mm Gesamttiefe: Vorzeichenfehler beim Zentrieren des Steins auf dem Sockel. | Korrekte Tiefenposition 30 mm; Stein reicht von 30 bis 150 mm innerhalb des 180-mm-Sockels. | Beide Live-Revisionen und finalen PDF-Seitenansichten bestätigen die zentrierte Position. |
| U11 | Mittel | Der Rundbogen wird für die Ansicht so abgetastet, dass sein Scheitel fehlt. Das PDF nennt 1039,95 statt 1040 mm Gesamthöhe. | Exakte Kreisbogen-Extrema in die Ansichtsabtastung aufgenommen, auch bei umgekehrter Laufrichtung. Die kanonische Geometrie bleibt erhalten. | Regressionstests und beide finalen PDFs: 1040 mm Gesamthöhe. |

Lokale Ausgangsevidenz: `C:/Users/vonin-ju/Documents/ChatGPT/mixed things/schubert-usability-2026-10-28/`. Bildschirmbilder 02/07 belegen KI-Eingabe und Fehler; 04/05 die Rollensperren; 06 das Bad samt Textartefakten. Eine Videoaufnahme war mangels ffmpeg nicht möglich; das Protokoll behauptet keinen vorhandenen Videobeleg.

## Prüfungen und Auslieferung

Der Benutzer hat am 28.10. größere KI-Anfragen ausdrücklich gewünscht. Das Standardlimit wurde im authentifizierten Konfigurationsdialog von 0,02 auf 0,25 USD pro Anfrage erhöht; Monatsbudget 5 USD. Das Modell bleibt gpt-6-luna. Die optionale Fachhilfe bleibt bei ausreichendem Kostenrahmen verfügbar.

Bestätigte lokale Prüfungen:

- `pnpm check`: keine Fehler und keine Svelte-Warnungen.
- `pnpm exec vitest run --maxWorkers 2 --testTimeout 15000`: 446 Tests in 71 Dateien bestanden. Ein anfänglicher 5-Sekunden-Timeout im unveränderten Vektorimport wurde gezielt und im abschließenden Gesamtlauf erfolgreich nachgeprüft.
- `pnpm test:integration`: 93 PostgreSQL-Prüfungen bestanden, einschließlich Speichern/Neuladen beider Planarten mit beiden Rollen, weiterhin gesperrter technischer Freigabe und Cache-Vertragswechsel. Entwicklungs- und Produktivdatenbank sind getrennt. Nur die Entwicklungsdatenbank wurde auf die bereits vorhandenen Migrationen 0043–0045 gebracht.
- Vier neue Browserabläufe bestanden: Büro auf Desktop, Mitarbeiter bei 390 × 844 px, jeweils Grabmal und Bad, mit echtem Speichern/Neuladen, Einheitenwechsel und automatischer Barrierefreiheitsprüfung ohne Verstöße im Studio. Drei bestanden im Gesamtlauf, der vierte im gezielten Nachlauf nach einem lokalen HMR-Fehler; ein vorheriger Kaltstart-Timeout wurde ebenfalls nachgeprüft.
- Vorher-/Nachher-Bildschirme liegen unter [Evidenz](usability-role-planning-2026-10-28/evidence/).

`pnpm build` und der Quelltext-Zugangsdatencheck sind erfolgreich. Die lokalen KI-Transporttests verwenden kontrollierte Providerantworten; zusätzlich wurden die nachstehenden Abläufe mit echten Modellaufrufen auf Produktion geprüft. Produktive Finanz- und Fertigungsfreigaben sind nicht Teil dieser Testpläne.

## Ergebnis auf Produktion

Anwendungscode beim Abschluss der Plananlage: `363b6a5aa4dc51d2227c3f6560047b7eb30905c6`, Deployment `dpl_946yWvoKSbB9G44hjZtLK4L2t8JL`, Zustand READY und öffentliche Produktionsdomain bestätigt. Beide Rollen besitzen im Live-Test leere persönliche Zusatzrechtslisten; das Planungsrecht kommt aus der Rolle. Der ergänzende Kundenbild- und Wandschalter-Nachtest folgt unten.

| Rolle | Gespeicherter Plan | Ergebnis / PDF |
| --- | --- | --- |
| Büro | [Grabstein](https://schubert-design-suite.vercel.app/studio/124c4dd0-bd77-49c2-8c5a-ab763d6f1dcb?variant=899424ab-c500-43ab-b06e-f0e03e8fd68d) | Revision 4, echte KI mit hochgeladener PNG-Skizze; [PDF](usability-role-planning-2026-10-28/evidence/office-grabstein-final.pdf). |
| Mitarbeiter | [Grabstein](https://schubert-design-suite.vercel.app/studio/ce02d28f-13bd-4bb7-9351-414ea5d53547?variant=227b5ae7-6191-4f90-9023-fd9671e6391b) | Revision 4, echte KI mit hochgeladener PNG-Skizze; [PDF](usability-role-planning-2026-10-28/evidence/operativ-grabstein-final.pdf). |
| Büro | [Bad](https://schubert-design-suite.vercel.app/studio/f2adddf1-554f-4704-af87-e07f24e92c9f?variant=ef5db28b-5b03-4cf3-8a6d-8c6d6d1556bb) | Revision 5, lichte Raummaße und Waschtischplatte 1200 × 550 × 30 mm; [PDF](usability-role-planning-2026-10-28/evidence/office-bad-final.pdf). |
| Mitarbeiter | [Bad](https://schubert-design-suite.vercel.app/studio/17c09035-0aa6-4684-ae57-81053881415f?variant=4f4ed6c2-f1ee-4620-8837-747549128efd) | Revision 5, gleicher manueller Ablauf; [PDF](usability-role-planning-2026-10-28/evidence/operativ-bad-final.pdf). |

Für den letzten Grabstein-Nachtest wurde jeweils die vorherige Teständerung über den regulären Wiederherstellungsbefehl zurückgenommen; die Historie bleibt erhalten. Danach erfolgten Upload, tatsächlicher KI-Aufruf, Prüfung der Vorschau, ausdrückliches Anwenden, Neuladen und 3D-Kontrolle erneut. Gespeichert sind je zwei Steine, vier Maßelemente, die exakte dreizeilige Inschrift und ein ungeprüfter Materialwunsch. Die Steinposition ist X=50, Y=30, Z=140 mm relativ zum Sockel.

Alle vier authentifizierten PDF-Exporte antworteten mit HTTP 200. Die Grabmal-PDFs haben sechs, die Bad-PDFs fünf Seiten. Front, Seite, Inschriftenwortlaut und Raumgrundrisse wurden geprüft; die finalen Grabmal-PDFs nennen 1040 mm Gesamthöhe und 180 mm Gesamttiefe. Die Texte und Maßangaben sind lesbar. Schrift- und Materialfreigaben bleiben ausdrücklich offen.

Die gezielte Prüfung der Fehler-/Fatal-Logs des finalen Anwendungsdeployments fand im Nachtestfenster keine Einträge. Das ist eine begrenzte Logprüfung, keine Aussage über sämtliche historischen oder fachlichen Fehler. Synthetische Testpläne und gekennzeichnete Testzugänge bleiben zur Nachvollziehbarkeit vorhanden.

## Ergänzung: Kundenbilder und 3D-Wände

Auf ergänzenden Benutzerwunsch wurden die echte fotorealistische Bildgenerierung mit dem Mitarbeiterzugang und ein direkt sichtbarer Wandschalter getestet. Finaler Anwendungscode dieser Ergänzung: `b2648a095011ff9c9232af439cc54d913b5995ae`, Deployment `dpl_2BwAuaq67h9X4dGBYSDkEy4AJa8q`, READY, Produktionsalias und im Browser geladener Stand bestätigt.

| ID | Befund / Wunsch | Änderung und Nachtest |
| --- | --- | --- |
| B01 | Das erste Grabmalbild wirkt fotografisch gut, ergänzt aber eine im Plan nicht vorhandene Einfassung. Die Standardvorgabe nennt Einfassung und Bepflanzung unabhängig vom tatsächlichen Entwurf. | Neutrale Bildvorgaben verwenden die geplanten Bauteile; Ergänzungen benötigen Planbezug oder einen ausdrücklichen Gestaltungswunsch. Die Vorgabenversion gehört zum Auftragsschlüssel. Ein erneuter echter Aufruf mit klarer Anweisung liefert nur Rundbogenstein und Sockel, ohne zusätzliche Einfassung. |
| B02 | Zum Abgleich einer generierten Inschrift fehlt im Bildstudio der gebundene Originalwortlaut. | **Inschrift mit dem Plan abgleichen** zeigt den Text aus der tatsächlichen Bildgrundlage, auch unabhängig vom aktuell bearbeiteten Planstand. Live geöffnet und mit der dreizeiligen Testinschrift abgeglichen. Das ist eine Vergleichshilfe, keine automatische Bildfreigabe. |
| B03 | Gewünscht ist ein unmittelbar erreichbarer Schalter für Wände in der 3D-Raumansicht; bislang nur unter „Darstellung“. | **Wände · Ein/Aus** sitzt direkt oben rechts in der 3D-Raumansicht. Desktop und 390 × 844 px geprüft, einschließlich Tastaturumschaltung. Wände verschwinden sichtbar, Boden und Platte bleiben erhalten. Der Schalter ist rund 134 × 44 px groß, die Mobilansicht hat keinen horizontalen Überlauf. „Speichern“ bleibt deaktiviert und Revision 5 unverändert. |

### Echte Bildaufträge und Qualitätsbewertung

Die Aufträge wurden über **Präsentieren → Fotorealistisches Bild erstellen**, mit eigener synthetischer Planung, ausdrücklicher Kostenbestätigung, **hoher Detailqualität** und **1536 × 1024 px** ausgelöst. Alle drei liefen mit `gpt-image-2.5-flare` erfolgreich durch die tatsächliche Anbieter-, Worker- und private Dokumentverarbeitung.

| Bild | Auftrag | Tatsächliche Kosten | Ergebnis |
| --- | --- | --- | --- |
| Grabmal, erster Versuch | `a7d38a55-5727-44ad-8526-a5b53eac2edf` | 0,068470 USD | Material, Licht und exakte Inschrift überzeugen. Wegen zusätzlicher Einfassung als Vergleichs-/Fehlversuch erhalten. |
| Raum | `695fbc1f-7c8e-4c0c-9fb3-49ef881a7856` | 0,069790 USD | Glaubwürdige Innenansicht mit schwebender Natursteinplatte, ruhiger Beleuchtung und sauberen Oberflächen. Keine erfundenen Türen, Fenster oder Sanitärmöbel. Der gespeicherte Entwurf enthält noch keine vollständige Badeinrichtung; entsprechend bleibt das Bild ein Raum- und Materialkonzept. |
| Grabmal, Nachtest | `34e9fd05-9891-4a4a-9dbc-943e6d69b729` | 0,069155 USD | Gute fotografische Material- und Lichtwirkung, korrekte dreizeilige Inschrift einschließlich Bindestrich; nur die zwei geplanten Steinbauteile, keine zusätzliche Einfassung. Als gekennzeichnetes Gestaltungskonzept geeignet. |

Gesamtkosten der drei Bildtests: **0,207415 USD**. Die angezeigten Reservierungen lagen jeweils bei etwa 0,40 USD; das ist kein Festpreis. Das separate Bildlimit wurde nicht verändert. Text-KI bleibt bei 0,25 USD pro Anfrage, Monatsbudget 5 USD.

Die PNG-Originale wurden authentifiziert mit HTTP 200 abgerufen, als 1536 × 1024 px verifiziert und in Originalauflösung visuell geprüft. Der Automationsbrowser brach seinen nativen Download ab; der direkte authentifizierte Originalabruf und die lokal gespeicherten PNGs funktionierten. Eine erfolgreiche native Browserdateispeicherung wird deshalb nicht behauptet.

Die Bilder tragen die eingebrannte Kennzeichnung **KI-Visualisierung · Konzept · keine technische Zeichnung** und die Planrevision. Sie eignen sich als unverbindliche Material-/Gestaltungsvisualisierung nach Abgleich mit dem Plan. Generative Perspektive und Proportionen ersetzen keine Maßprüfung oder Kundenfreigabe des technischen Plans. Es wurde nichts an Kunden versandt.

Private Bildoriginale in der Anwendung: [Grabmal-Nachtest](https://schubert-design-suite.vercel.app/api/v1/documents/3ef2003e-6c6c-467a-afe7-b3f9f9a27456/download?version=ed2bde1d-42a9-4a2b-813e-702e30db9aa5), [Raum](https://schubert-design-suite.vercel.app/api/v1/documents/98bcfecb-0e4f-4ed2-abfb-83612156e0d0/download?version=e2e44f6b-0a40-4daa-88e9-d99fbfc17a9e). Die Originale bleiben privat; sie sind nicht als öffentliche Repository-Bilddateien veröffentlicht. Lokal liegen sie unter der oben genannten Evidenzablage als `KI-Grabmal-Kundenvisualisierung.png` und `KI-Raum-Kundenvisualisierung.png`.

Wandschalter-Evidenz: [Desktop ein](usability-role-planning-2026-10-28/evidence/30-raum-waende-ein-desktop.png), [Desktop aus](usability-role-planning-2026-10-28/evidence/31-raum-waende-aus-desktop.png), [Mobil aus](usability-role-planning-2026-10-28/evidence/32-raum-waende-aus-mobil.png), [Mobil ein](usability-role-planning-2026-10-28/evidence/33-raum-waende-ein-mobil.png). Der Inschriftabgleich ist zusätzlich lokal mit Bildschirm 34 dokumentiert.

Nach dieser Ergänzung erneut bestanden: `pnpm check` ohne Fehler/Warnungen, 446 Unit-Tests, 93 PostgreSQL-Prüfungen, Produktionsbuild und Zugangsdaten-Quelltextscan. Die begrenzte Fehler-/Fatal-Logprüfung des finalen Anwendungsdeployments fand im Nachtestfenster keine Einträge.
