# Nachtest planner_a · 23.10.2026

**Testperson:** Martin, Steinmetzmeister mit mäßiger CAD-Erfahrung. Desktop 1440 × 1000. Getestet am aktuellen Working Tree, etwa 14:31–14:40 UTC, ausschließlich über die eigene Browser-ID. Anwendungsquellen, APIs und Datenbanken wurden nicht untersucht. Die heruntergeladenen PDFs wurden als Dateien gelesen und relevante Seiten visuell geprüft.

## Ergebnis

| Prüfpunkte | Ergebnis |
| --- | --- |
| Gespeichertes Grabmal mit unzugeordneter Herstellerschrift als PDF | **Bestanden.** Download erfolgreich, sechs Seiten tatsächlich geprüft. |
| Entwurf bleibt bei Exportfehler erhalten | **Bestanden für Verbindungsfehler.** Offline-Versuch bleibt im Studio; nach Wiederverbindung erneut erfolgreich. Meldung sprachlich noch schwach. |
| Assistent zeigt vollständigen Sperrgrund sofort | **Bestanden.** Ohne Scrollen vollständig sichtbar. Anbieter bleibt nicht eingerichtet. |
| Lichte Innenmaße im Raummodell und PDF | **Im getesteten Rechteck korrekt bezeichnet.** Einzelne Maßtexte im PDF überlagern sich noch. |
| Materialname und Quelle | **Bestanden.** Im Raumstudio und in der heruntergeladenen Stückliste vorhanden. |
| Plattenbegriffe | **Teilweise.** Dialog und Eigenschaften verwenden Länge/Tiefe; Prüftexte in UI und PDF noch uneinheitlich. |

Kein neuer Blocker. Keine Freigabe, keine externe Sendung und keine Änderung fremder Entwürfe.

## Grabmal-PDF und Entwurfserhalt

Ich öffnete **UX planner_a · Grabmal Familie Linden**, unverändert **Entwurf 1, Revision 5**, über die Planungsübersicht und wartete auf die Zeichenwerkzeuge. Unter **4 Präsentieren → Planungs-PDF herunterladen** erhielt ich diesmal eine echte Datei; die App blieb im Studio.

Die [heruntergeladene PDF](../evidence/planner_a/1792765920618-Planung.pdf) hat sechs Seiten. Enthalten sind Vorder-, Seiten- und Draufsicht, Stückliste, Inschriftenplan und offene Prüfpunkte. Die Maße **800 × 1200 × 160 mm** sind vorhanden. Auf dem Inschriftenblatt steht vollständig **„Anna Linden · 1948–2026 · In Liebe“** und **„Herstellerschrift: noch nicht zugeordnet – nur Entwurf“**. Die Frontansicht verwendet keine Ersatzschrift; sie verweist auf den Inschriftenplan. Die Materialangabe nennt Padang TG34 Cristallo und die Lieferantenquelle. Der frühere Downloadblocker ist für diesen normalen gespeicherten Entwurf behoben.

Visuell geprüfte Seiten: [Front](../evidence/planner_a/retest-grabmal-front-1.png), [Inschrift](../evidence/planner_a/retest-grabmal-inschrift-5.png).

Für eine sichere Fehlerprobe schaltete ich nur meinen Browser kurz offline und betätigte erneut den Download. Die Fehlermeldung erschien **innerhalb des Studios**, der Entwurf und die Auswahl blieben sichtbar, Revision 5 blieb erhalten. Nach Wiederverbindung, Schließen der Meldung und erneutem Download entstand [eine zweite PDF](../evidence/planner_a/1792766000164-Planung.pdf). Es wurden keine Geschäftsdaten absichtlich beschädigt.

**Resthürde P3:** Die Fehlermeldung lautet nur **„Failed to fetch“**. Ich kann daraus als deutscher Anwender weder den betroffenen PDF-Download noch den nächsten Schritt sicher ablesen. Eine deutsche Meldung mit Hinweis auf die Verbindung und erneuten Download wäre verständlicher. [Screenshot](../evidence/planner_a/0003-1792765985111.png).

Diese Probe belegt die Reaktion auf Verbindungsabbruch; ein absichtlich erzeugter Serverfehler wurde nicht getestet.

## Assistent

Im Schritt **Inschrift & Details** öffnete ich **KI für diesen Schritt**. Der vollständige gelbe Hinweis **„Noch nicht verfügbar“**, **„OpenAI-Projekt, Modell und Kostenbudget noch einzurichten“** und die Zuständigkeit der Administration waren sofort ohne Scrollen sichtbar. Das zuvor abgeschnittene Banner ist in diesem Durchgang korrigiert. Kontext, ausgewählte Inschrift sowie Schutz von Maßwerten und Wortlaut sind weiterhin erkennbar.

Evidenz: [vollständiger Hinweis beim Öffnen](../evidence/planner_a/0002-1792765963456.png).

Der Anbieter ist weiterhin nicht eingerichtet. Eingabe und Senden sind gesperrt. Es gab keine echte KI-Anfrage; Antwortqualität und Übernahmeverhalten bleiben unbewertet.

## Raum, Material und Plattenbegriffe

Da ich bislang keinen eigenen Raumentwurf hatte, erstellte ich **UX Nachtest planner_a · Innenmaße Raum**, anschließend gespeichert als Revision 3:

- Raum: **3200 mm lichte Breite, 2400 mm lichte Tiefe, 2500 mm Höhe, 150 mm Wandstärke ohne Belag**.
- Waschtisch-/Arbeitsplatte: **1200 mm Länge, 600 mm Tiefe, 20 mm Stärke**, Material **BIANCO SARDO · Katalogreferenz**.

Der Raumdialog trennt **lichte Innenmaße zwischen den Innenseiten der Wandkerne ohne Belag** von **Wandachsmaßen**. Nach Übernahme zeigt das Modell innen **3200/2400** und zusätzlich **3350/2550 · Achse**. Die erwartete Beziehung bei 150 mm Wandstärke ist damit nachvollziehbar. [Modell](../evidence/planner_a/0004-1792766074717.png).

Die [Raum-PDF](../evidence/planner_a/1792766268572-Planung.pdf) hat fünf Seiten und wurde tatsächlich geprüft. Im Grundriss stehen **3200/2400 · innen**, **3350/2550 · Achse** und das geometrische Außenmaß **3500/2700 mm**. Die Legende erklärt innen und Achse. In der Stückliste wird die Raumfläche ausdrücklich als **Wandachsfläche, kein lichtes Innenmaß** bezeichnet.

Für die Platte heißen die Eingaben im Dialog und in den Eigenschaften **Länge** und **Tiefe**. Beide Werte sind richtig übernommen. [Eigenschaften](../evidence/planner_a/0013-1792766264644.png).

Der gewählte Materialname erscheint im Feld als **BIANCO SARDO · Katalogreferenz**. Dazu gibt es den Lieferantenlink `https://rossittis.de/material/sardo-bianco` mit Stand 2026-10-19. Auf PDF-Seite 4 stehen Materialname, Katalogfassung, Herstellerquelle und Quellenprüfung vollständig. Die Quelle wurde nicht extern fachlich validiert. [Materialauswahl und Quellenhinweis](../evidence/planner_a/0010-1792766214325.png), [PDF-Stückliste](../evidence/planner_a/retest-raum-stueckliste-4.png).

**Resthürde P3 – Maßtextüberlagerung:** Rechts im PDF-Grundriss überdecken sich **„2.400 · innen“** und **„2.550 · Achse“** teilweise. Die Zahlen sind zwar an anderen Stellen nachvollziehbar, diese konkrete Beschriftung ist schlecht lesbar. [PDF-Grundriss](../evidence/planner_a/retest-raum-grundriss-1.png).

**Resthürde P3 – Begriffe im Prüftext:** In UI-Prüfliste und PDF-Seite 5 heißt der Eintrag **„Waschtisch · Länge“**, der Folgesatz nennt jedoch **„Breite (1200 mm)“**. Der Eintrag **„Waschtisch · Tiefe“** nennt anschließend **„Höhen-/Längenmaß (600 mm)“**. Das passt noch nicht zu den klaren Eingabebezeichnungen. [UI](../evidence/planner_a/0014-1792766383143.png), [PDF-Prüfstand](../evidence/planner_a/retest-raum-pruefstand-5.png).

## Abgrenzung

Ein offener Steinbauteildialog verschwand einmal vor meiner Eingabe. Der Parent bestätigte einen zeitgleichen automatischen Reload wegen seiner letzten Korrekturen und fror den Code anschließend ein. Nach erneutem Öffnen konnte ich die Platte vollständig anlegen. Dies wurde **nicht als Produktfehler** gewertet. Ein weiterer Locatorfehler beim Heranscrollen eines Felds ließ sich über dessen sichtbare Rolle beheben und zählt ebenfalls nicht als Appbefund.

Alte Berichte und Belege wurden nicht verändert. Alle neuen Browser- und PDF-Belege liegen mit neuen Zeitstempeln bzw. dem Präfix `retest-` im eigenen Evidenzverzeichnis. Browserverbindung wurde nach der Offline-Probe wiederhergestellt.


## Zweiter gezielter Nachtest · 23.10.2026, etwa 14:50–14:54 UTC

Erneut als planner_a am unveränderten eigenen Raumplan **UX Nachtest planner_a · Innenmaße Raum**, **Revision 3**. Kein neues Projekt angelegt und keine Planwerte geändert. Die folgenden Ergebnisse aktualisieren ausschließlich die drei Restpunkte des vorigen Laufs.

| Restpunkt aus dem ersten Nachtest | Erneutes Ergebnis |
| --- | --- |
| Englische Offline-Meldung | **Behoben.** Verständliche deutsche Meldung im Studio, Entwurf bleibt sichtbar. |
| Überlagerung der vertikalen PDF-Maßtexte | **Behoben im geprüften PDF.** Innen- und Achstext sind jetzt getrennt und vollständig lesbar. |
| Uneinheitliche Plattenbegriffe | **Behoben in UI und PDF-Prüfstand.** Länge 1200 und Tiefe 600 werden durchgehend so genannt. |

Ich lud die [neue PDF-Datei](../evidence/planner_a/1792767080564-Planung.pdf) über **4 Präsentieren → Planungs-PDF herunterladen** herunter. Auf der tatsächlich angesehenen [Seite 1](../evidence/planner_a/retest2-raum-grundriss-1.png) stehen **2400 · innen** und **2550 · Achse** rechts voneinander getrennt. Die Werte **3200 · innen**, **3350 · Achse** und die Außenmaße bleiben erhalten. Auf der ebenfalls tatsächlich angesehenen [Prüfstandseite 5](../evidence/planner_a/retest2-raum-pruefstand-5.png) steht jetzt **„Länge (1200 mm)“** beziehungsweise **„Tiefe (600 mm)“**. Dieselben Begriffe sah ich in der [UI-Prüfliste](../evidence/planner_a/0001-1792767077137.png).

Bei der kurzen, sicheren Offline-Probe erschien: **„Die Unterlage konnte ohne Serververbindung nicht geladen werden. Ihr Plan bleibt erhalten. Verbindung prüfen und erneut herunterladen.“** Diese Meldung erklärt mir Fehler und nächsten Schritt. Der Entwurf blieb im Studio. Danach wurde der Browser wieder online geschaltet; ein [erneuter Download](../evidence/planner_a/1792767188506-Planung.pdf) gelang. Der Browserkontext wurde anschließend geschlossen. [Offline-Meldung](../evidence/planner_a/0003-1792767161141.png).

**Zusätzliche kleine Beobachtung P3, nur Arbeitsansicht:** Bei 1440 × 1000 und beiden geöffneten Seitenpaneelen sind die nach außen gesetzten Achstexte im Plan bei 100 % links und rechts teilweise am Canvasrand abgeschnitten. Ein Klick auf **Einpassen** änderte das nicht. Mit einem Klick auf **Verkleinern** auf 80 % waren beide Achstexte vollständig lesbar. Die PDF ist davon nicht betroffen. Das ist kein Blocker, kostet aber einen zusätzlichen Ansichtsschritt. [Nach Einpassen noch abgeschnitten](../evidence/planner_a/0002-1792767116401.png), [bei 80 % vollständig](../evidence/planner_a/0004-1792767184800.png).

Kein neuer Blocker und keine Aussage zu echter KI; in diesem gezielten Lauf wurde keine KI angefragt. Neue Belege tragen neue Zeitstempel bzw. das Präfix `retest2-`; die vorigen Belege blieben erhalten.


## Abschließender UI-Nachtest · 2026-10-23 15:19 UTC

Gezielt nur die zuletzt gemeldeten abgeschnittenen Maßtexte am vorhandenen Raumplan **UX Nachtest planner_a · Innenmaße Raum**, unverändert **Revision 3**, geprüft. Die vorige Beobachtung bleibt oben als historischer Stand erhalten.

**Ergebnis nach Korrektur: im geprüften UI-Zustand behoben.**

- **1440 × 1000, beide Seitenbereiche offen, Einpassen / 100 %:** Die außen stehenden **3350 / 2550 · Achse** sowie **3200 / 2400 · innen** sind vollständig sichtbar und lesbar. Kein zusätzlicher Verkleinerungsschritt nötig. [Screenshot](../evidence/planner_a/0002-1792768637987.png).
- **1280 × 900, beide Seitenbereiche offen, Einpassen / 100 %:** Dieselben Achs- und lichten Maßtexte bleiben vollständig innerhalb der Planansicht. [Screenshot](../evidence/planner_a/0006-1792768716552.png).
- **1100 × 900:** Die App wechselt auf einzelne überlagernde Seitenbereiche. Der geöffnete Elementedialog blockiert die dahinterliegenden Bedienelemente; beide Bereiche sind in diesem Layout nicht gleichzeitig regulär bedienbar. Nach Schließen des Dialogs und **Einpassen / 100 %** sind die angebotenen Achs- und Innenmaßtexte vollständig lesbar. [Freie Planansicht](../evidence/planner_a/0005-1792768703264.png). Die durch den offenen Dialog abgefangenen Klicks wurden nicht als Produktdefekt gewertet.

Alle genannten Screenshots wurden tatsächlich angesehen. Dieser Lauf prüfte die UI-Beschriftungen, keinen weiteren PDF-Export oder gesonderte geometrische Außenmaßangaben. Keine Planwerte geändert, keine KI angefragt. Kein neuer Blocker. Browserkontext anschließend geschlossen.
