# Black-box-Nachtest · dispatcher_a

**Rolle:** Petra, erfahrene Einsatzleiterin, angemeldet als UX Petra Vogt / Disposition.

**Umgebung:** lokale App :5173, Working Tree; eigener Browserkontext dispatcher_a nach Brokerneustart. Desktop 1440 × 1000.

**Zeitraum:** 23.10.2026, 14:31:25–14:41:22 UTC, rund 10 Minuten und 52 Browseraktionen.

**Vorgehen:** Nur sichtbare UI über den Browserbroker; keine Sources, APIs, Datenbanken oder fremden Berichte gelesen. Screenshots selbst angesehen. Keine fremden Termine verändert, keine Einsatzbestätigung/Freigabe oder Nachricht ausgelöst. Browser geschlossen.

## Ergebnis

Die geprüften Korrekturen funktionieren im Kernablauf. **Kein verbleibender Blocker** in der erneut stabil geprüften Sitzung. Der Verlauf zeigt jetzt reale Änderungsereignisse; die konkreten vorherigen und neuen Terminwerte bleiben dort offen.

| Prüfpunkt | Ergebnis | Beobachtung und Evidenz |
| --- | --- | --- |
| Direkte Mitarbeitersuche im Anlegeformular | Bestanden | „Vogt“ liefert UX Petra Vogt direkt in derselben Auswahl; kein zusätzlicher Suchdialog/„Weitere Einträge suchen“ nötig. Bei erneutem Einstieg aus dem Auftrag funktioniert auch „Petra“. [Direkte Suche](../evidence/dispatcher_a/0011-1792766414059.png) |
| Kalenderfilter für eigene Mitarbeiterin | Bestanden | „Petra“ liefert genau UX Petra Vogt. Auswählen setzt den Filter und eigener Einsatz bleibt sichtbar. [Treffer im Filter](../evidence/dispatcher_a/0002-1792765956341.png), [gefilterte Woche](../evidence/dispatcher_a/0004-1792766008385.png) |
| Lesbare Namen auf Monats-/Wochenkarten | Bestanden | Beide Ansichten nennen UX Petra Vogt auf der eigenen Karte, keine technische Kennung. [Monat](../evidence/dispatcher_a/0003-1792765983800.png), [Woche](../evidence/dispatcher_a/0004-1792766008385.png) |
| Auftragfilter vor dem Kalender | Bestanden | Sichtbarer Balken vor dem Tagesraster: „Auftragfilter aktiv: AUF-2026-00017 · UX dispatcher_a · Badumbau Testweg. Angezeigt werden nur Einsätze dieses Auftrags.“ Dazu „Alle Einsätze anzeigen“. [Kalenderkopf](../evidence/dispatcher_a/0001-1792765934175.png) |
| Klarheit leerer Tage | Bestanden | Woche: „Keine Einsätze für diese Filter“. Tagesliste: „Keine Einsätze für diese Auswahl. Daraus lässt sich keine freie Teamkapazität ableiten.“ Daraus würde ich keine verfügbare Mannschaft ableiten. [Woche](../evidence/dispatcher_a/0004-1792766008385.png), [leere Tagesliste](../evidence/dispatcher_a/0012-1792766454217.png) |
| Eigenen Termin verschieben | Bestanden | Eigener Einsatz von 26.10.2026, 10:00–12:00 auf **12:00–14:00** geändert. Übersicht zeigt Version 3, dieselbe Mitarbeiterin und dieselben Verknüpfungen; Status bleibt Entwurf. |
| Änderungsverlauf | Grundfunktion bestanden, Nachvollziehbarkeit teilweise | Verlauf zeigt „Einsatz geändert“, 23.10.2026, 16:34, UX Petra Vogt und Version 3; darunter Version 2 und die Anlage als Version 1. Er ist nicht mehr leer. Alte/neue Einsatzzeiten oder geänderte Felder stehen dort nicht. [Sichtbarer Verlauf](../evidence/dispatcher_a/0005-1792766064362.png) |
| Überlappenden eigenen Testtermin blockieren, Eingaben erhalten | Bestanden | Versuch 26.10., **13:00–15:00** für Petra wird konkret mit dem eigenen bestehenden Einsatz **12:00–14:00** abgefangen. Titel, Petra, Auftrag, Arbeitspaket, Beginn, Ende und Einsatzort bleiben erhalten. Nach Änderung nur des Beginns auf 14:00 ist derselbe Entwurf als 14:00–15:00 speicherbar. [Konflikt und erhaltene Eingaben](../evidence/dispatcher_a/0009-1792766307177.png) |

## Tatsächliche Schritte

1. Neu angemeldet, eigenen Auftrag **UX dispatcher_a · Badumbau Testweg** aus „Heute“ geöffnet. Unter **Termine & Team → Einsätze zu diesem Auftrag öffnen** zur gefilterten Einsatzplanung.
2. Im Kalenderfilter direkt **Petra** eingegeben. Ich erwartete einen Treffer ohne zweite Suche. Die Auswahl meldete die Bestandssuche und zeigte danach genau **UX Petra Vogt**. Ausgewählt.
3. Montag 26.10. gewählt und Monat sowie Woche angesehen. Der Mitarbeitername steht lesbar auf der Karte. Der Auftragfilter ist vor dem Kalender sichtbar; leere Wochentage sind ausdrücklich auf die Filter bezogen.
4. Eigenen Einsatz **UX dispatcher_a · Aufmaß Testweg** geöffnet, **Bearbeiten**, Ende auf 14:00 und Beginn auf 12:00 gesetzt, einmal gespeichert.
5. **Verlauf** geöffnet: reale Ereignisse mit Akteur, Zeit und Version sichtbar. **Übersicht** zeigt 26.10.2026, 12:00–14:00 und Version 3.
6. Aus dem eigenen Auftrag **Einsatz anlegen** geöffnet und einen eigenen Überschneidungstitel eingegeben. Während dieses ersten Versuchs verschwand die Maske vor der Mitarbeitereingabe. Sofort gemeldet; siehe Umgebungseinfluss unten.
7. Als Alternative direkt am Montag **Einsatz für diesen Tag anlegen** geöffnet. Titel **UX dispatcher_a · Überschneidung Nachtest**, Mitarbeiter über **Vogt → UX Petra Vogt**, eigener vorausgewählter Auftrag, eigenes Arbeitspaket ausgewählt. Zeitraum **13:00–15:00**, Einsatzort **Testweg 12, 10115 Berlin · Nachtest**.
8. Einmal **Speichern**. Erwartung: konkrete Kollision statt eines allgemeinen Fehlers und kein Verlust der Eingaben. Die App blieb im Formular und zeigte:

   > Überschneidung mit „UX dispatcher_a · Aufmaß Testweg“: 26.10.2026, 12:00 bis 14:00. UX Petra Vogt ist bereits eingeplant. Zeitraum oder Zuordnung ändern.

   Alle eingegebenen Felder waren weiterhin befüllt; Beginn 13:00 und Ende 15:00 wurden auch in der Feldinspektion bestätigt.
9. Nur Beginn auf **14:00** korrigiert, erneut gespeichert. Kalender und Liste zeigen anschließend genau die zwei eigenen Einsätze **12:00–14:00** und **14:00–15:00**, beide Petra zugeordnet und im Status Entwurf. Der abgelehnte Zeitraum wurde nicht als zusätzlicher Einsatz sichtbar.
10. Den Einstieg **Auftrag → Termine & Team → Einsatz anlegen** erneut geprüft. Ein eigener ungespeicherter Formnachtesttitel und Suche **Petra** blieben stabil; ein passender Treffer erschien. Diesen reinen Formtest ohne Speicherung über **Abbrechen → Ungespeicherte Eingaben verwerfen** beendet.
11. Im gefilterten Monatskalender Dienstag 27.10. gewählt. Die leere Tagesliste erklärt ausdrücklich, dass keine freie Teamkapazität daraus abzuleiten ist. Browser geschlossen.

## Verbleibende Nachvollziehbarkeit

**P3 / Verbesserung, kein Blocker:** Im Verlauf ist jetzt erkennbar, **dass** Petra den Einsatz geändert hat. Als Einsatzleiterin kann ich daraus aber noch nicht ablesen, **welche Uhrzeiten** vorher und nachher galten. Für eine konkrete Terminabsprache müsste ich die Zeiten anderweitig kennen. Beobachtung: Ereignisname, Zeitpunkt, Akteur und Versionsnummer sind sichtbar; keine aufklappbaren Termindetails angeboten. Route: `/dispatch/dcaa0c12-6468-4971-8702-0317cccce734`.

Die Testleitung teilte mit, dass historische alte/neue Feldwerte nicht gespeichert wurden. Diese Aussage wurde nicht durch technische Zugriffe geprüft. Fehlende historische Werte werden hier weder ergänzt noch als vorhanden behauptet. Der frühere Leerzustand des Verlaufs ist im Nachtest behoben; ein vollständiger Vorher-/Nachher-Nachweis ist damit noch nicht gegeben.

## Umgebungseinfluss und Grenzen

Der erste aus dem Auftrag geöffnete Anlegedialog verschwand nach der Titel-Eingabe vor dem nächsten Feld. Eine anschließende Inspektion zeigte den Kalender ohne Dialog ([Zwischenstand](../evidence/dispatcher_a/0007-1792766159122.png)); ein Werkzeugaufruf fand das Mitarbeiterfeld deshalb nicht. Die Testleitung bestätigte zeitgleich abgeschlossene Codekorrekturen mit automatischem Reload und fror den Code danach ein. Nach erneuter Öffnung funktionierten sowohl der direkte Kalendereinstieg als auch der wiederholte Einstieg aus dem Auftrag. **Dieser Einzelvorfall ist deshalb als Umgebungseinfluss eingeordnet, nicht als nachgewiesener verbleibender Produktfehler.**

Der Test belegt die konkrete Kollision zwischen zwei eigenen Entwürfen. Andere Konflikttypen, tatsächliche Teamkapazität, Abwesenheiten, Geräteüberschneidungen oder bestätigte Einsätze wurden nicht geprüft. Die „Bestandssuche“ wurde ausschließlich über ihre UI beurteilt; keine technische Aussage zur Zahl serverseitiger Requests. Datum-/Uhrzeitfelder nutzen weiterhin das Format des bereitgestellten Browsers mit AM/PM; Meldungen und Akten zeigen deutsche 24-Stunden-Zeiten.

## Behaltene Testdaten

- **UX dispatcher_a · Aufmaß Testweg**, 26.10.2026 **12:00–14:00**, UX Petra Vogt, Entwurf, Version 3. `/dispatch/dcaa0c12-6468-4971-8702-0317cccce734`
- **UX dispatcher_a · Überschneidung Nachtest**, nach erfolgreicher Konfliktkorrektur 26.10.2026 **14:00–15:00**, UX Petra Vogt, Entwurf. `/dispatch/cd0cdd1c-81bc-4cbc-a76b-85f8b0ad320f`

Beide sind mit dem eigenen Auftrag und dem eigenen Arbeitspaket verknüpft. Keine gespeicherten Testdaten gelöscht. Der abschließende reine Maskentest wurde bewusst nicht gespeichert.

Screenshots verbleiben unter `work/ai-usability/evidence/dispatcher_a/`; in diesem Bericht referenzierte Dateien stammen aus dem Nachtest und sind durch ihre Zeitstempel eindeutig.
