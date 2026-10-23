> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest: dispatcher_a

Petra, 46, erfahrene Einsatzleiterin im Steinmetzbetrieb. Angemeldet als **UX Petra Vogt** mit Rolle **Disposition**. Testtag 23.10.2026, Desktop **1440 × 1000**. Browser von **12:58:13 bis 13:06:24 UTC**, ca. **63 Browseraktionen** einschließlich Screenshots, Inspektionen und Schließen. Bericht anschließend erstellt. Dies ist ein simulierter Black-box-Test, keine Untersuchung mit einer realen Testperson.

## Zielergebnis

| Ziel | Status | Tatsächliches Ergebnis |
| --- | --- | --- |
| G1: Eigenen Entwurf für Montag 26.10., 08:00–10:00 anlegen | Erreicht | **UX dispatcher_a · Aufmaß Testweg**, nur **UX Petra Vogt**, eigener vorbereiteter Auftrag und eigenes Arbeitspaket. Status **Entwurf**. |
| G2: Auf 10:00–12:00 verschieben | Erreicht | Über **Bearbeiten** gespeichert. Akte zeigt **Version 2**, richtigen Mitarbeiter und dieselben Verknüpfungen, Kalender zeigt **10:00–12:00**. Tatsächliche Konfliktprüfung nicht getestet. |
| G3: Tages-/Wochenüberblick, Verfügbarkeit, Arbeitszeit, Planungsbedarf und Zusammenhang verstehen | Teilweise | Tag/Woche gefunden, Auftrag und Arbeitspaket verlinkt. Offener Stand und Sollstunden erkennbar. Keine belastbare Teamverfügbarkeit gefunden; eigene Person im Filter fehlt. Eigene Zeit und leere Abwesenheitsliste erreichbar. |

Der angelegte und anschließend verschobene Einsatz bleibt unter `/dispatch/dcaa0c12-6468-4971-8702-0317cccce734` als Entwurf bestehen. Keine Einsatzbestätigung, Nachricht, Freigabe oder Zeitabgabe ausgelöst. Fremde Einträge ausschließlich gelesen.

## Tatsächlicher Ablauf und Erwartungen

1. Einstieg mit Einführung angesehen und **Für später schließen** gewählt. Die Seitennavigation **Team & Dispo** war sofort verständlich.
2. Im Monatskalender Montag, 26.10. ausgewählt. Ich erwartete, dass **Einsatz für diesen Tag anlegen** das Datum übernimmt. Das geschah: Beginn 08:00, Ende zunächst 09:00.
3. Tätigkeit **UX dispatcher_a · Aufmaß Testweg** eingetragen. Bei **Mitarbeiter** erwartete ich eine Suche nach meinem Namen. **Petra** ergab zunächst keinen Treffer. Mit **Escape** nur die Auswahl geschlossen, dann **Weitere Einträge suchen**, **Petra**, **Suchen**. Danach erschien ein berechtigter Treffer und **UX Petra Vogt** war auswählbar.
4. Eigenen Auftrag **UX dispatcher_a · Badumbau Testweg** und eigenes Arbeitspaket **UX dispatcher_a · Aufmaß und Montage vorbereiten** gewählt, Ende 10:00 und Einsatzort Testweg 12, 10115 Berlin gesetzt. Einmal gespeichert.
5. Entwurf über die Liste geöffnet: richtige Zuordnung, 26.10. 08:00–10:00 und Status Entwurf. Im Kalender stand jedoch anstelle des Mitarbeiternamens eine lange Kennung.
6. Über **Bearbeiten** zuerst Ende 12:00, dann Beginn 10:00 gesetzt und einmal gespeichert. Ich erwartete im **Verlauf** eine nachvollziehbare Verschiebung. Dort blieb **Noch kein sichtbarer Verlauf**, auch nach erneuter Prüfung. Die Übersicht zeigte dagegen Version 2 und 10:00–12:00.
7. Vom Einsatz das Arbeitspaket und dann den Auftrag geöffnet. Sollstunden 2 und Status Offen waren erkennbar. **Verknüpfte Vorgänge** am Arbeitspaket zeigte nur einen allgemeinen Verweis auf die Übersicht, keine Liste des angelegten Einsatzes.
8. In der Auftragsakte **Termine & Team → Einsätze zu diesem Auftrag öffnen** gewählt. Wochenansicht auf 26.10. gestellt. Der Auftragfilter war erst unterhalb des Kalenders erklärt; oben stand **Gesamtes Team**. Nach **Alle Filter aufheben** wurden weitere Einsätze an einem zuvor leeren Tag sichtbar.
9. Tagesansicht, **Alle Bereiche → Urlaub & Abwesenheit** und **Meine Zeit** erkundet. Abwesenheitsliste leer, keine eigenen Istzeiten, Zeitkonto nicht hinterlegt. Die Unterscheidung zwischen Plan und Istzeit wurde erklärt; eine Teamkapazitätsübersicht fand ich nicht.
10. Zum Kalender zurück. **Mitarbeiter filtern** lieferte für **Petra** und **Vogt** jeweils null Treffer, ohne sichtbaren zusätzlichen Suchweg. Mit Escape geschlossen, Seitenhilfe gelesen und Browser geschlossen.

## Wichtigste Befunde

### dispatcher_a-F1 · P2 · Eigene Mitarbeiterin fehlt in Auswahl und Filter

**Beobachtung:** Die direkte Auswahl im Anlegeformular zeigte 41 Einträge einschließlich leerer Auswahl und endete bei UX Paul Jansen. „Petra“ ergab **Kein Eintrag gefunden**. Erst die getrennte Bestandsuche lieferte UX Petra Vogt. Im Kalenderfilter scheiterten danach Vor- und Nachname; eine solche Bestandsuche war dort nicht sichtbar.

**Erwartung:** Eine berechtigte Person über Namen direkt auswählen und im Kalender isolieren.

**Auswirkung:** Unerwarteter Umweg beim Anlegen; die persönliche Kalenderprüfung bleibt blockiert. Der Nulltreffer ist irreführend, da dieselbe Person zuvor erfolgreich zugewiesen wurde.

**Nachstellen:** Anlegen → Mitarbeiter „Petra“ → null Treffer → Weitere Einträge suchen → Petra suchen → zuweisen. Danach /dispatch → Mitarbeiter filtern → Petra bzw. Vogt → null Treffer.

**Evidenz:** Browseraktionen 10–18, 57–60; Bestandsuche (`evidence/dispatcher_a/0003-1792760393064.png`), Kalenderfilter (`evidence/dispatcher_a/0015-1792760719808.png`). Sicherheit: hoch. Produktbeobachtung, keine Vermutung über die technische Ursache.

### dispatcher_a-F2 · P2 · Kennung ersetzt Mitarbeiternamen auf Einsatzkarten

**Beobachtung:** Beim eigenen Einsatz erscheint im Monats-, Wochen- und Tageskalender **4b845654-8c0f-4903-9b10-910cb2451eb7**. In der Einsatzakte steht korrekt **UX Petra Vogt**. Auch andere sichtbare Karten verwenden teils Namen, teils Kennungen.

**Erwartung:** Wer wo eingeplant ist, auf der Karte lesen können.

**Auswirkung:** Der Kalender ermöglicht für diese Einträge keinen schnellen personellen Überblick; Öffnen einzelner Akten wird nötig.

**Nachstellen:** Eigenen Entwurf mit Petra speichern → Kalenderkarte lesen → Akte öffnen → Wochen-/Tagesansicht lesen.

**Evidenz:** Browseraktionen 26–28, 44–50; Akte mit Name (`evidence/dispatcher_a/0006-1792760479487.png`), Woche mit Kennung (`evidence/dispatcher_a/0012-1792760622506.png`), Tag (`evidence/dispatcher_a/0013-1792760655660.png`). Sicherheit: hoch.

### dispatcher_a-F3 · P2 · Terminänderung im sichtbaren Verlauf nicht nachvollziehbar

**Beobachtung:** Nach Verschiebung von 08:00–10:00 auf 10:00–12:00 zeigte die Übersicht **Version 2** und die neuen Zeiten. **Verlauf** blieb bei **Noch kein sichtbarer Verlauf**; erneute Inspektion bestätigte dies.

**Erwartung:** Alten und neuen Zeitraum sowie die Terminänderung nachvollziehen können.

**Auswirkung:** Der aktuelle Stand lässt sich prüfen, die Änderung selbst aber nicht. Die Aussage „Geschäftliche Änderungen und Freigaben werden mit dem jeweiligen Stand dokumentiert“ erklärt nicht, ob Entwurfsänderungen ausgeschlossen sind.

**Nachstellen:** Eigener Einsatz → Bearbeiten → Zeiten ändern → Speichern → Verlauf → Übersicht.

**Evidenz:** Browseraktionen 29–35; leerer Verlauf (`evidence/dispatcher_a/0007-1792760513062.png`), Version 2 (`evidence/dispatcher_a/0008-1792760533107.png`). Sicherheit: hoch. Keine Aussage, ob im Hintergrund ein technisches Protokoll existiert.

### dispatcher_a-F4 · P2 · Auftragfilter zu weit vom Kalenderkopf entfernt

**Beobachtung:** Nach Einstieg aus dem Auftrag steht oben **Gesamtes Team**. Dass nur ein Auftrag dargestellt wird, erscheint erst unter dem Kalender. Die gefilterte Woche zeigt „Keine Einsätze geplant“ an weiteren Tagen. **Alle Filter aufheben** machte am Dienstag zwei weitere Einsätze sichtbar.

**Erwartung:** Den eingeschränkten Umfang schon beim Lesen des Kalenders erkennen.

**Auswirkung:** Leere Tage des Auftrags können beim Dispositionsüberblick wie freie Teamkapazität wirken. Der Filterhinweis ist vorhanden, aber räumlich getrennt.

**Nachstellen:** Eigener Auftrag → Termine & Team → Einsätze zu diesem Auftrag öffnen → Woche → Filterhinweis unter Kalender → Alle Filter aufheben.

**Evidenz:** Browseraktionen 42–48; Auftragseinstieg (`evidence/dispatcher_a/0010-1792760588785.png`), gefilterte Woche (`evidence/dispatcher_a/0012-1792760622506.png`). Sicherheit: hoch.

## Was gut funktioniert

- Klare Navigation in die Disposition und direkter Einstieg aus dem gewählten Kalendertag.
- Akte verbindet lesbaren Mitarbeiternamen, Auftrag, Arbeitspaket, Uhrzeiten und Entwurfsstatus übersichtlich.
- Änderungen werden erst durch Speichern übernommen; die Verschiebung selbst funktionierte.
- Hinweis „Ein Einsatzplan ist noch keine tatsächlich erfasste Arbeitszeit“ verhindert die Verwechslung von Plan und Ist.
- Escape schloss die Auswahl ohne Formularverlust.
- Seitenhilfe war auf Einsatzplanung bezogen und erklärte Tag/Woche/Monat sowie fachliche Prüfpunkte.

## Sichtprüfung und Grenzen

Selbst angesehen wurden Einstieg/Einführung **0001**, Monatskalender **0002**, Anlegeformular/Bestandsuche **0003**, Zeitfelder **0004**, Einsatzakte **0006**, leerer Verlauf **0007**, Woche **0012**, Meine Zeit **0014** und Mitarbeiterfilter **0015**. Die Akte ist ruhig und gut lesbar, die primären Aktionen sind klar. Die Monatsansicht benötigt viel vertikalen Raum; Mitarbeiterkennungen belasten die kleinen Karten.

Native Eingabefelder zeigten im bereitgestellten Browser **10/26/2026, 08:00 AM**; die Akte zeigte **26.10.2026, 08:00**. Das ist eine beobachtete Formatinkonsistenz mit offenem Browser-/Locale-Einfluss, kein gesicherter Produktfehler.

Ein echter Konfliktfall wurde nicht erzeugt. Es wurde nur der Hinweis gelesen, dass Konflikte beim Speichern angezeigt werden. Leere Abwesenheits- und Zeitdaten erlauben keine Aussage zu echter Verfügbarkeit. Keine KI benutzt und keine Antwortqualität bewertet. Mobile Nutzung für diese Desktoprolle nicht geprüft. Keine Quellen, APIs, Datenbanken oder fremden Berichte gelesen. Rund acht Minuten Browserinteraktion; nach Abschluss der sinnvollen Schritte nicht künstlich verlängert.
