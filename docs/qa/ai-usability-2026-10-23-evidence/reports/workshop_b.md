> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Werkstatt-Nutzertest · workshop_b

UX Mira Braun, 29, Steinmetzgesellin am Smartphone. Getestet am 23.10.2026 bei 390 × 844 px. Browserinteraktion 12:58–13:03 UTC (14:58–15:03 Uhr Deutschland), 49 Aktionen. Dies ist eine simulierte Rollenprüfung, keine menschliche Nutzerforschung.

Aktueller Zielstand nach Nachtest: **G1, G2 und G3 erreicht.** Im Ersttest waren G1 und G3 erreicht und G2 wegen leerem sichtbarem Lager blockiert. Diese historische Fixture-Grenze bleibt unten dokumentiert; der Nachtrag beschreibt ihre Behebung. Beide Browserkontexte wurden jeweils geschlossen.

## Ziele und tatsächliches Ergebnis im Ersttest

- **G1 erreicht:** Der eigene Einsatz war auf Heute direkt verlinkt. Auftrag AUF-2026-00016 enthält zwei Fensterbänke à **1200 × 250 × 30 mm**, Maße vor Ort prüfen, keine Fertigungsfreigabe. Im Arbeitspaket „Kanten bearbeiten“ fand ich Werkstatt, 2 Sollstunden und Kante poliert. Arbeitspaket: Offen. Auftrag: Entwurf, Aufmaß offen, Ausführung noch nicht geplant.
- **G2 blockiert:** Lager & Naturstein zeigte auch ohne Filter **0 Einträge**. „Fensterbank“ brachte keinen Treffer. Bereichsauswahl: Lager, Inventur, Lagerorte; Statusauswahl nur Alle Status. Ein passender Bestand, Reservierungsstand und Einheit waren nicht prüfbar. Ursache unbekannt; als Testumgebungsgrenze behandelt.
- **G3 erreicht:** Eigene Stoppuhr für den Auftrag und „Bearbeitung / Werkstatt“ gestartet und nach **29 Sekunden** mit Feierabend beendet. Eigene Test-Rückmeldung unter Meine Zeit und eine ausdrücklich interne Testnotiz am Auftrag gespeichert. Der Bearbeiten-Dialog ließ sich ohne Eingabe öffnen und per Escape schließen. Über die feste mobile Navigation zurück zu Heute.

## Die drei wichtigsten Produktbeobachtungen

### P2 · Beendete Zeit erscheint zunächst noch als laufende Sitzung

**Erwartung vor dem Prüfen:** Nach bestätigtem Feierabend sollten alle Zeitansichten das Ende zeigen.

**Beobachtung:** Die Stoppuhr zeigte „Arbeitstag beendet“, „Bestätigt“ und 00:00:29; der Tagesverlauf zeigte 15:00:19–15:00:48. Darunter zeigte „Meine erfassten Sitzungen“ weiterhin „15:00 – läuft“, „working Version 1“ und eine deaktivierte Korrekturaktion; „Bis“ war in der bestätigten Auftragszuordnung leer. Erst nach manuellem **Synchronisieren** erschienen Endzeit und „Beendet Version 2“.

**Auswirkung/Interpretation:** Beim Weglegen blieb unklar, welcher Status gilt. Der zusätzliche Abgleich löste die Unsicherheit. Kein Datenverlust beobachtet und keine Aussage, dass die Anzeige dauerhaft falsch bleibt.

Pfad: `/time`. Evidenz: [Ende bestätigt](../selected/workshop_b-F1-0017-1792760452704.png), [noch laufende Sitzung](../selected/workshop_b-F1-0018-1792760462251.png), nach Synchronisieren (`evidence/workshop_b/0020-1792760474418.png`).

### P3 · Werkstattinformationen stehen unter Verwaltungsangaben

**Erwartung beim Öffnen:** Maße, Arbeitsanweisung und Arbeitsstatus schnell prüfen.

**Beobachtung:** Im ersten mobilen Ausschnitt stehen Titel, Bearbeiten, Auftrag bestätigen, Reiter und die Übersicht ab Auftragswährung. Maße/Prüfhinweis stehen nach Scrollen in Notizen; Arbeitspaket und Aktueller Stand folgen darunter. Die konkrete Kantenanweisung liegt zusätzlich in der Arbeitspaketakte.

**Auswirkung/Interpretation:** Die Information ist erreichbar und lesbar, kostet für einen kurzen Werkstattblick aber Scrollen und einen weiteren Aufruf. Bei diesem vorbereiteten Auftrag liegen die Maße in Freitext; andere Auftragsarten wurden nicht verallgemeinert.

Pfad: eigene Auftragsakte. Evidenz: erster Ausschnitt (`evidence/workshop_b/0004-1792760311791.png`), Maße in Notizen (`evidence/workshop_b/0005-1792760322298.png`), Arbeitspaket und Status weiter unten (`evidence/workshop_b/0027-1792760551078.png`).

### P3 · Assistent überlagert mobile Inhalte

**Erwartung beim Lesen:** Formularhinweise und Status ohne verdeckte Stellen erfassen.

**Beobachtung:** Der breite schwebende Assistent-Button liegt unten rechts vor dem Inhalt. In Kommunikation überdeckt er Teile unter „Interne Notiz“, darunter Hinweistext; in der Übersicht liegt er vor Tabellen-/Karteninhalt.

**Auswirkung/Interpretation:** Zum Lesen verdeckter Stellen muss ich den Ausschnitt verschieben. Speichern war möglich; keine vollständig blockierte Aktion beobachtet.

Evidenz: Kommunikation mit Überlagerung (`evidence/workshop_b/0022-1792760492796.png`), Übersicht beim Scrollen (`evidence/workshop_b/0005-1792760322298.png`).

## Separate Grenze der Umgebung

**E1 / P2:** Das sichtbare Lager war leer. Suche, Rücksetzen und die angebotenen Auswahlen lieferten keinen Bestand. Das blockierte den fachlichen Materialtest; es belegt weder einen Datenfehler noch einen Berechtigungsfehler. Keine Menge verändert und keinen Ersatzbestand angelegt.

Evidenz: ungefiltertes Lager (`evidence/workshop_b/0008-1792760353779.png`), Suche ohne Treffer (`evidence/workshop_b/0009-1792760371401.png`), Filterauswahl nach Rücksetzen (`evidence/workshop_b/0010-1792760378073.png`).

## Was gut funktionierte

Der Einstieg führt direkt zum eigenen Einsatz und Auftrag. Deutsche mm-Angaben und der Hinweis zur fehlenden Fertigungsfreigabe sind verständlich. Die Zeitaktionen und die Unterscheidung zwischen lokal gespeichert und bestätigt sind nachvollziehbar. Sowohl Rückmeldung als auch interne Notiz bekamen eine eindeutige Speicherbestätigung und erschienen anschließend im Verlauf. Bei der internen Notiz wurde ausdrücklich erklärt, dass keine E-Mail gesendet wird.

Der Bearbeiten-Dialog nutzt große Felder und feste Schließen-/Speichern-Aktionen. Tab und Escape wurden an der Einführung versucht; Escape pausierte sie. Escape schloss später auch den Bearbeiten-Dialog. Die feste mobile Navigation brachte mich aus tief gescrollten Ansichten sicher zurück zu Heute.

Evidenz: gespeicherte Rückmeldung (`evidence/workshop_b/0015-1792760441760.png`), gespeicherte interne Notiz (`evidence/workshop_b/0024-1792760520833.png`), mobiler Dialog (`evidence/workshop_b/0025-1792760528158.png`), Rückkehr Heute (`evidence/workshop_b/0028-1792760580054.png`).

## Grenzen und hinterlassene Testdaten im Ersttest

Nur den eigenen Auftrag/das eigene Arbeitspaket gelesen; nur eigene Zeit, Rückmeldung und interne Notiz geschrieben. Der Auftrag bleibt im Entwurf, das Arbeitspaket offen. Keine Freigabe, Tagesabgabe, externe Nachricht oder Bestandsbuchung ausgelöst.

Hinterlassen: eine 29-Sekunden-Zeit „Bearbeitung / Werkstatt“, eine Rückmeldung mit Präfix **UX workshop_b · Testnotiz**, eine interne Notiz mit Präfix **UX workshop_b · Interne Testnotiz**. Beide benennen die ausstehende Maßprüfung und stellen klar, dass keine Bearbeitung/Freigabe erfolgt ist.

Mindestens zehn mobile Screenshots selbst angesehen. Kein echter Touchscreen oder Handschuhtest, keine KI gestartet, keine Offlineprüfung, keine Dezimal-Leistungsmenge gebucht. Knapp fünf Minuten Interaktion statt des ungefähren 10–15-Minuten-Richtwerts: Kernziele waren erreicht beziehungsweise am sichtbaren Lager nachvollziehbar blockiert. Ausschließlich sichtbare UI, keine Quellen/API/DB untersucht.


## Nachtest G2 · 23.10.2026, etwa 15:26–15:28 Uhr Deutschland

Zeitfenster der Screenshots: **13:26:36–13:27:56 UTC**. Eigene Sitzung kurz davor neu gestartet, danach geschlossen. 19 weitere Browseraktionen; insgesamt 68. Drei zusätzliche mobile Screenshots selbst angesehen. Der Parent hatte den ursprünglich fehlenden synthetischen Fixture-Bestand ergänzt; laut Nachtestauftrag blieb der Appcode unverändert. Die ursprünglichen Produktbefunde F1–F3 bleiben unverändert.

**G2 jetzt erreicht. E1 ist ein behobenes Fixture-Limit.** Über Mehr → Einkauf & Lager fand ich die beiden eigenen Artikel. Das am Anfang leere Lager wird dadurch als historisches Testdatenlimit eingeordnet, nicht als korrigierter Produktfehler.

| Eigener Bestand im UX Testlager | Sichtbare Maße | Menge / Einheit | Ergebnis |
| --- | --- | --- | --- |
| Naturstein-Testrest, MAT-2026-00004 | Breite 1.250 mm, Länge 300 mm, Stärke 30 mm | 1 Stück | Verfügbar; als einzelnes Reststück für beide Fensterbänke zu klein |
| Naturstein-Testplatte, MAT-2026-00003 | Breite 1.300 mm, Länge 600 mm, Stärke 30 mm | 1 Stück | Zunächst verfügbar; nach eigener Reservierung reserviert, Version 2 |

Die Platte bietet nach den sichtbaren Maßen grundsätzlich Fläche für zwei Fensterbänke 1200 × 250 × 30 mm nebeneinander. Das ist eine Auswahl anhand der Abmessungen, keine reale Material-, Zuschnitt- oder Fertigungsfreigabe.

Ich öffnete **Material reservieren**, wählte ausschließlich den eigenen Auftrag „UX workshop_b · Fensterbänke Testweg“, trug **1** ein und bestätigte genau eine eigene Testplatte. Danach zeigte die App „Der Arbeitsschritt wurde bestätigt“, Version 2 und Status „Reserviert“. Die Bestandsmenge blieb als 1 Stück dargestellt; die Reservierung ist von einer späteren Bestandsbewegung getrennt. Keine Bewegung oder Zuschnittbuchung und keine fremde Menge verändert. Das Reststück blieb unangetastet.

Die Auftragszuordnung wurde im Reservierungsdialog ausgewählt; eine separate Reservierungsliste wurde danach nicht mehr geprüft.

### Neuer Nachtestbefund F4 / P3 · Einheit im Reservierungsdialog nicht wiederholt

**Erwartung:** Direkt beim Mengenfeld und vor der Bestätigung erkennen, ob ich Stück oder eine andere Einheit reserviere.

**Beobachtung:** Die Bestandsakte nennt eindeutig „Einheit: Stück“. Im Reservierungsdialog werden Name, Version und Status wiederholt, aber beim Feld „Reservierte Menge“ steht keine konkrete Einheit. Der Hilfetext nennt nur „mit der angegebenen Einheit“. Ich konnte 1 aufgrund der zuvor gelesenen Stückeinheit eingeben; die Reservierung gelang.

**Auswirkung/Interpretation:** Die Einheit muss aus der vorherigen Ansicht im Gedächtnis bleiben. Keine falsche Menge beobachtet. Die konkrete Einheit neben dem Mengenfeld würde die Prüfung erleichtern.

Evidenz: sichtbare Lagerliste nach Fixture-Ergänzung (`evidence/workshop_b/0001-1792761996645.png`), Reststück: Maße und Stückeinheit (`evidence/workshop_b/0003-1792762018042.png`), Plattenakte vor Reservierung (`evidence/workshop_b/0004-1792762029404.png`), mobiler Reservierungsdialog (`evidence/workshop_b/0005-1792762044012.png`), eigener Auftrag und Menge 1 bestätigt (`evidence/workshop_b/0006-1792762068139.png`), bestätigtes Ergebnis / Version 2 (`evidence/workshop_b/0007-1792762076346.png`). Die zugehörigen Browser-Snapshots enthalten Maße sowie Statuswechsel Verfügbar → Reserviert.
