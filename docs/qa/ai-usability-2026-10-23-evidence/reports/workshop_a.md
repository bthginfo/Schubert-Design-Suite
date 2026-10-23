> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest workshop_a

Rolle: Ralf, 57, Werkstattvorarbeiter; App-Name **UX Ralf Klein**. Test am 23.10.2026, Desktop 1440 × 1000. Hauptlauf 12:57:53–13:04:57 UTC mit 62 Browserbefehlen; G2-Nachtest nach ergänztem Fixture-Bestand 13:09:03–13:11:46 UTC mit weiteren 18 Befehlen. Beide Sitzungen geschlossen, zusammen rund 80 Browserbefehle einschließlich Inspektionen und Screenshots. Dies ist ein simulierter Rollenlauf, keine menschliche Nutzerstudie.

Mein eigener Auftrag war **UX workshop_a · Fensterbänke Testweg**, AUF-2026-00015, mit **UX workshop_a · Kanten bearbeiten**, WOR-2026-00003.

## Zielergebnisse

| Ziel | Stand | Tatsächliches Ergebnis |
|---|---|---|
| G1: Auftrag, Paket, Maße, Abschlusskriterium und Unterlagenstand finden | Erreicht | Stand des Hauptlaufs: Direkt von Heute zum Auftrag und Paket gefunden. Zwei Fensterbänke je 1200 × 250 × 30 mm; Kante poliert. Aufmaß offen, Ausführung noch nicht geplant. Abschlusskriterium verlangt Maßprüfung und nennt keine Ausführung/Freigabe. Auftrag: null verknüpfte Dokumente. Allgemeine Dokumentliste: null Einträge. Geprüfte Maße/Zeichnung fehlen. Synthetische Materialreservierung anschließend im G2-Nachtest erfolgt. |
| G2: Bestand/Reststücke nachvollziehen | Erreicht im Nachtest | Ursprünglich leeres Lager als Fixture-Limit dokumentiert. Nach Ergänzung eigenen Testrest 1250 × 300 × 30 mm und eigene Rohplatte 1300 × 600 × 30 mm gefunden, je 1 Stück. Die Platte ist für beide Fensterbänke geometrisch plausibel. Genau 1 Stück der eigenen Platte für den eigenen Auftrag reserviert; Status Reserviert, Version 2. Auftrag und Reservierungsmenge sind danach in der Bestandsakte nicht sichtbar, siehe F4. Keine Bewegungs- oder Zuschnittbuchung. |
| G3: Eigene Testzeit und Fortschritt dokumentieren | Teilweise | 23.10.2026, 07:00–07:30, ohne Pause, am eigenen Auftrag gespeichert. Sachliche Rückmeldung mit Paketname, offenen Punkten und nächstem Klärungsschritt gespeichert und nach Navigation wiedergefunden. Keine eigene Teilrückmeldung am Arbeitspaket gefunden. Der Zeitverlauf zeigt nach Wiederöffnen widersprüchlich eine offene Zuordnung. |

## Wichtigste Beobachtungen

### workshop_a-F1 · P2 · Zeitzuordnung widerspricht sich nach Wiederöffnen

Ich erwartete, nach der bestätigten Speicherung meinen Auftrag im Tagesverlauf wiederzusehen. Direkt nach der Nacherfassung war das so. Nach dem Besuch der Paket- und Auftragsakte und der Rückkehr über Team & Dispo stand für dieselben 30 Minuten **„Arbeit · Zuordnung offen“**. Unmittelbar darunter zeigte **„Bestätigte Auftragszuordnung“** meinen Auftrag mit 07:00–07:30. Auch die aufgeklappten Originalaufzeichnungen enthielten den Auftrag.

Ich wählte einmal Synchronisieren. Die App meldete **„Der aktuelle Übertragungs- und Klärungsstand wurde geladen.“**, ließ aber beide widersprüchlichen Angaben stehen. Es ist dadurch unklar, ob ich vor einer Tagesabgabe noch tätig werden muss. Ein Verlust der Zuordnung ist durch die Oberfläche nicht belegt; der bestätigte Datensatz ist weiterhin sichtbar.

Reproduktion: Zeit nachtragen → eigenen Auftrag wählen → Zeitraum speichern → andere Akte öffnen → Meine Zeit erneut öffnen → Tagesverlauf und Bestätigte Auftragszuordnung vergleichen → Synchronisieren.

Route: /time. Sicherheit: hoch. Produktbeobachtung.

Evidenz: direkt nach Speichern (`evidence/workshop_a/0004-1792760495728.png`), beide widersprüchlichen Angaben im selben Bild (`evidence/workshop_a/0010-1792760666004.png`); Snapshot der Browseraktion 61 nach Synchronisieren.

### workshop_a-F2 · P2 · Bericht zu einem Arbeitspaket bleibt in der Zeitansicht

Ich konnte eine sachliche Rückmeldung mit offenen Punkten speichern. Sie erscheint unter Meine letzten Rückmeldungen und blieb nach Navigation erhalten. Die Maske bietet den Auftrag, aber kein Arbeitspaket. Deshalb schrieb ich „Kanten bearbeiten“ in den Text.

Am Arbeitspaket suchte ich anschließend unter Verknüpfte Vorgänge, Bearbeiten und Verlauf. Verknüpfte Vorgänge verwies nur auf Angaben in der Übersicht. Die Bearbeitungsmaske enthielt Planungsfelder und Abschlusskriterium; ein Feld für Teilfortschritt fand ich nicht. Verlauf zeigte **„Noch kein sichtbarer Verlauf“**. Auch in der Kommunikation der Auftragsakte erschien der Bericht nicht; dort lag eine leere Maske für interne Notizen.

Für meine Arbeitsvorbereitung fehlt damit ein direkter Ort am Paket, an dem ich die offenen Punkte wiederfinde. „Beginnen“ oder „Fertig melden“ wäre für diesen Stand fachlich unpassend. Ich ließ den Status Offen und meldete keine Fertigung. Eine Rückmeldung mit optionalem Paketbezug und ein Link aus dem Paket würden den Umweg verkürzen.

Routen: /time sowie /work-packages/6f5bcde9-e5f8-41ed-ac65-dcb658a6cef3. Sicherheit: hoch für die besuchten Ansichten. Produktbeobachtung; keine Aussage über unbesuchte Funktionen.

Evidenz: Speicherbestätigung der Rückmeldung (`evidence/workshop_a/0005-1792760524332.png`), leerer Paketverlauf (`evidence/workshop_a/0006-1792760565087.png`), Auftragskommunikation (`evidence/workshop_a/0008-1792760606817.png`); Browseraktionen 45–54 und 56–61.

### workshop_a-F3 · P3 · Unterlagenstand am Paket bleibt unbestimmt

Der Dokumentenreiter des Pakets zeigte bei zwei Besuchen **„Dokumentübersicht hier nicht geladen“**. Der angebotene Link öffnete die allgemeine Dokumentliste ohne sichtbaren Bezug zum Paket oder Auftrag. Im Auftrag wurde dagegen klar null verknüpfte Dokumente genannt.

Als Vorarbeiter möchte ich an dieser Stelle erkennen, ob keine Zeichnung vorliegt oder nur die Übersicht fehlt. Ich musste dafür einen anderen Bereich aufsuchen. Visuell steht der große Uploadbereich zuerst; der Hinweis zum fehlenden Überblick liegt darunter. Die Auswirkungen auf echte Unterlagen konnte ich wegen der leeren Testliste nicht prüfen.

Route: Paketakte, Dokumente. Sicherheit: hoch für den sichtbaren Hinweis. Produktbeobachtung; keine technische Ursache behauptet.

Evidenz: Aufbau des Dokumentenreiters (`evidence/workshop_a/0007-1792760590430.png`); die zugehörigen Snapshots der Browseraktionen 12 und 51 enthalten den zitierten Hinweis, Aktion 14 die allgemeine Liste mit null Einträgen.

## Was gut funktioniert hat

- Mein eigener Einsatz und Auftrag waren sofort auf Heute sichtbar. Der Weg zum Paket war verständlich.
- Die Maße und das Abschlusskriterium sind gut lesbar. Der Hinweis auf offenes Aufmaß und fehlende Freigabe war fachlich eindeutig.
- Die Desktopansicht ist ruhig und klar gegliedert; Bearbeiten und Beginnen sind große Aktionsflächen. Arbeitsansicht (`evidence/workshop_a/0002-1792760316305.png`)
- Bei Zeit und Bericht gab es ausdrückliche Speicherbestätigungen. Die gespeicherte Rückmeldung konnte ich nach Navigation wieder lesen.
- Im Reststückformular gelang Tab von Menge zur Einheit und Enter zum Öffnen der Auswahl. Escape warnte vor ungespeicherten Eingaben und bot verständlich Weiter bearbeiten oder Verwerfen. Reststückformular (`evidence/workshop_a/0003-1792760415595.png`)
- Die Einführung erläuterte den Zugang und ließ mich über Hier selbst ausprobieren zur eigenen Arbeit wechseln. Einstieg (`evidence/workshop_a/0001-1792760273729.png`)

## Grenzen und vorgenommene Änderungen

Im Hauptlauf waren der sichtbare Lagerbestand und die allgemeine Dokumentliste leer. Im Reststückformular waren Produkt und Lagerort noch nicht auswählbar. Das begrenzte damals die Prüfung von Material und Reservierungen; daraus folgt kein Produkt- oder Berechtigungsfehler. Unter Alle Bereiche in Einkauf & Lager sah ich Lager, Inventur und Lagerorte. Die im Seitentext erwähnte Materialreservierung konnte ich ohne Bestandsdatensatz über diese Navigation nicht erreichen. Das Lager-Fixture-Limit wurde vor dem unten dokumentierten Nachtest durch ergänzte synthetische Daten behoben. Die Dokumentenprüfung bleibt auf den ursprünglichen leeren Testbestand begrenzt.

Ich füllte nur einen ungespeicherten Reststückentwurf **UX workshop_a · Reststück Fensterbank Testentwurf** aus: Reststück, 0,6 m², 500 × 1300 × 30 mm. Ich verwarf ihn kontrolliert, statt ungeprüfte Menge als Bestand anzulegen. Die Konsistenz von Fläche und Maßen wurde nicht durch Speichern geprüft.

Im Hauptlauf wurden ausschließlich meine eigene synthetische halbe Stunde und die eigene sachliche Rückmeldung am Testauftrag gespeichert. Im Nachtest kam die ausdrücklich erlaubte Reservierung von genau einer eigenen synthetischen Rohplatte hinzu. Keine Tagesabgabe, keine Freigabe, keine Bewegungs-/Zuschnittbuchung und keine Änderung an fremden Objekten. Beginnen, Fertig melden und Auftrag bestätigen wurden nicht ausgelöst.

Native Datumseingaben erschienen als 10/23/2026, während die Apptexte 23.10.2026 zeigten. Das habe ich als Browser-/Lokalisierungsgrenze festgehalten, ohne die Ursache dem Produkt zuzuschreiben. Nur Desktop wurde entsprechend meiner Rolle genutzt. Assistent war sichtbar, wurde für diesen Auftrag aber nicht verwendet; keine KI-Qualität bewertet. Keine Quellen, APIs oder Datenbanken geprüft.

Die Screenshots 0001, 0002, 0003, 0004, 0005, 0006, 0007 und 0010 habe ich selbst visuell angesehen. Der Browser wurde mit close beendet.

## G2-Nachtest nach ergänztem Fixture-Bestand

Zeitraum: **23.10.2026, 13:09:03–13:11:46 UTC**, 18 zusätzliche Browserbefehle. Laut Testleitung wurden ausschließlich synthetische Testdaten ergänzt; der Anwendungscode blieb unverändert. Ich habe keine technische Prüfung dieser Angabe vorgenommen. Neuer Start und Abschluss mit derselben Browser-ID workshop_a.

Von Heute öffnete ich Einkauf & Lager. Die Liste enthielt jetzt vier Datensätze, darunter meine beiden eigenen Bestände. Fremde Datensätze wurden nicht geöffnet oder geändert. Die Liste zeigte Bestandsart, 1 Stück und Verfügbar; die Abmessungen musste ich jeweils in der Detailansicht nachlesen.

| Eigener Bestand | Sichtbare Angaben | Entscheidung für zwei Fensterbänke 1200 × 250 × 30 mm |
|---|---|---|
| UX workshop_a · Naturstein-Testrest, MAT-2026-00002 | Reststück, 1250 × 300 × 30 mm, 1 Stück, Verfügbar, UX-Testlager | Überschlägig für eine Fensterbank plausibel, für beide zusammen zu klein. Nicht reserviert oder verändert. |
| UX workshop_a · Naturstein-Testplatte, MAT-2026-00001 | Rohplatte, 1300 × 600 × 30 mm, 1 Stück, Verfügbar, UX-Testlager | Zwei Rechtecke 1200 × 250 mm sind geometrisch plausibel. Daher ganze eigene Testplatte ausgewählt. Keine Aussage über reale Materialqualität, Schnittzugaben oder Fertigungsfreigabe. |

In beiden Datensätzen war Produkt nicht hinterlegt; der Fehlstellentext bezeichnete sie ausdrücklich als rein synthetischen Bestand. Für echte Fertigung wären Materialfestlegung, Fehlerprüfung, Maserung, geprüftes Aufmaß und Fertigungsunterlagen weiterhin nötig.

Über **Material reservieren** wählte ich ausschließlich meinen Auftrag **UX workshop_a · Fensterbänke Testweg**, trug **1** ein und bestätigte den geprüften Eintrag. Der Dialog zeigte meinen Bestand, Version 1, Verfügbar, Auftrag und Reservierte Menge. Die Einheit Stück war vorher in der Übersicht sichtbar, wurde im Reservierungsdialog selbst nicht wiederholt. Nach einmaligem Ausführen schloss der Dialog; die App meldete **„Der Arbeitsschritt wurde bestätigt.“**, zeigte **Version 2** und **Reserviert**. Menge blieb 1 Stück; es wurde keine Bestandsbewegung oder Zuschnittbuchung ausgelöst.

G2 ist damit für den synthetischen Materialnachvollzug **erreicht**, mit dem folgenden Vorbehalt zur späteren Kontrolle. Die ursprüngliche leere Liste bleibt als behobenes Fixture-Limit erhalten; sie war kein Produktfehler.

### workshop_a-F4 · P2 · Reservierter Bestand zeigt den zugeordneten Auftrag anschließend nicht

Nach der erfolgreichen Reservierung erwartete ich, in der Bestandsakte **für welchen Auftrag und in welcher Menge** die Platte gebunden ist. Die Übersicht zeigte weiterhin die Bestandsmenge 1 Stück und den Status Reserviert, aber keinen Auftrag und keine gesonderte reservierte Menge. **Verlauf** zeigte unmittelbar danach **„Noch kein sichtbarer Verlauf“**. **Verknüpfte Vorgänge** enthielt nur den allgemeinen Hinweis, Verknüpfungen über Angaben in der Übersicht zu öffnen. Ein Auftragslink war dort nicht vorhanden.

Ich kann so beim späteren Werkstattzugriff die Bindung des Materials an meinen Auftrag nicht aus diesen besuchten Ansichten kontrollieren. Die Auswahl im vorherigen Dialog und der neue Status sind belegt; ein Verlust oder eine falsche Speicherung der Zuordnung ist damit **nicht** belegt. Die Reservierung habe ich nicht wiederholt.

Route: /stock/bcc1750c-9d49-48b1-84c7-288639b55b9a. Sicherheit: hoch für die besuchten Ansichten. Produktbeobachtung. Sinnvoll wäre eine sichtbare Zeile „1 Stück reserviert für Auftrag …“ mit direktem Auftragslink und nachvollziehbarem Reservierungseintrag im Verlauf.

Evidenz des Nachtests, jeweils selbst visuell angesehen:

- Bestandsliste nach Fixture-Ergänzung (`evidence/workshop_a/0001-1792760957352.png`)
- Eigenes Reststück mit Maßen (`evidence/workshop_a/0002-1792760975848.png`)
- Eigene Rohplatte mit Maßen (`evidence/workshop_a/0003-1792760994655.png`)
- Reservierungsdialog mit eigenem Auftrag und Menge 1 (`evidence/workshop_a/0004-1792761044518.png`)
- Bestätigter Status Reserviert und Version 2 (`evidence/workshop_a/0005-1792761060961.png`)
- Leerer Verlauf nach Reservierung (`evidence/workshop_a/0006-1792761074633.png`)
- Allgemeiner Hinweis unter verknüpften Vorgängen (`evidence/workshop_a/0007-1792761086209.png`)

Der zweite Browserkontext wurde mit close beendet. Genau eine eigene synthetische Platte wurde reserviert; Reststück und fremde Bestände blieben unverändert.
