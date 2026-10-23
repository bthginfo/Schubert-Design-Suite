# Mobiler Blackbox-Nachtest · employee_b

**23.10.2026, ca. 14:31–14:40 UTC · Jan, neuer Montagehelfer · 390 × 844.** Lokale App auf Port 5173, eigene Browser-ID `employee_b`. Nur sichtbare UI benutzt, keine Sources, APIs, DB, fremden Berichte oder Codeänderungen. Etwa 66 Browserkommandos einschließlich Werkzeugfehlern und Abschluss. Alle hier verlinkten Screenshots wurden selbst angesehen.

**Ergebnis:** Die angefragten funktionalen Nachprüfungen bestehen. Kein Blocker. Ein mobiler Darstellungsrest bleibt in den Tabellen zur Zuordnung und Prüfung. Die Verbindung ist wieder online, der kurze Timer ist beendet, Korrektur und Tagesprüfung wurden abgebrochen, der Browserkontext ist geschlossen.

## Geprüfte Abläufe

| Prüfung | Ergebnis | Beobachtung und Evidenz |
| --- | --- | --- |
| Zeit auf eigenem Auftrag starten und außerhalb der Zeitseite wiederfinden | Bestanden | Auftrag `AUF-2026-00014 · UX employee_b · Montage Testweg`, Tätigkeit Montage. In Auftragsakte und Dokumenttab bleibt oben „Zeit läuft · Bestätigt“ sichtbar. Ein Klick darauf führt direkt zurück zur Zeiterfassung. [Auftrag](../evidence/employee_b/employee_b-01-timer-auftrag.png), [Dokumente](../evidence/employee_b/employee_b-02-timer-dokumente.png). |
| Zurückkehren, pausieren und beenden; Aktualität und Zuordnung | Bestanden | Nach der Rückkehr zeigte die Stoppuhr rund 51 Sekunden. Pause wechselte zunächst auf ausstehend, dann bestätigt. Anschließend Feierabend; beendet und bestätigt, eigene Sitzung Version 3. Sichtbarer Tagesverlauf: Arbeit 16:33:04–16:33:57, angezeigte Dauer 00:00:52; Pause 16:33:57–16:34:21, Dauer 00:00:24. Die bestätigte Auftragszuordnung nennt den richtigen eigenen Auftrag und Montage. [Pause bestätigt](../evidence/employee_b/employee_b-03-pause-bestaetigt.png). |
| Eigener Nachtrag für gestern und Tagesfilter | Bestanden | Neu gespeichert: 22.10.2026, 12:00–13:00; Pausen 12:15–12:20 und 12:40–12:45. Notiz beginnt mit `UX Nachtest employee_b`. Ohne meinen manuellen Datumswechsel standen danach URL und Filter auf 22.10.2026. Im Tagesverlauf erschienen drei Arbeitsblöcke von 15, 20 und 15 Minuten sowie beide Pausen von je fünf Minuten. [Filter nach Speichern](../evidence/employee_b/employee_b-06-tagesfilter.png). |
| Endzeitkorrektur und Erhalt aller Pausen | Bestanden für die angefragte Mitnahme | Im Korrekturantrag des neuen Nachtrags änderte ich ausschließlich das oberste Ende von 13:00 auf 13:05. Der letzte Block „Arbeit 3“, Beginn 12:45, endete unmittelbar ebenfalls 13:05. Die beiden Pausen blieben vollständig auf 12:15–12:20 und 12:40–12:45; die ersten beiden Arbeitsblöcke blieben 12:00–12:15 und 12:20–12:40. Danach mit „Abbrechen“ geschlossen, nichts eingereicht. [Gesamtende](../evidence/employee_b/employee_b-07-korrektur-gesamtende.png), [letzter Arbeitsblock](../evidence/employee_b/employee_b-08-korrektur-letzter-block.png). |
| Offline-Speicherfehler bleibt sichtbar im Modal | Bestanden | Im unteren Teil des vollständig ausgefüllten Nachtrags kurz offline geschaltet, genau einmal gespeichert. Der Dialog sprang zum Fehler und zeigte ihn unmittelbar unter dem Dialogkopf: „Der Server ist nicht erreichbar. Ihre Eingaben bleiben erhalten. Bitte prüfen Sie die Verbindung.“ Kein manuelles Suchen/Scrollen zum Fehler nötig. Alle Werte inklusive beider Pausen und Notiz erhalten. Wieder online, ein weiterer Speicherversuch erfolgreich. [Sofort sichtbarer Fehler](../evidence/employee_b/employee_b-05-offlinefehler.png). |
| Tagesabgabe öffnet zuerst eine Prüfzusammenfassung | Bestanden | „Tag prüfen & abgeben“ öffnete das Modal „Arbeitszeit vor der Abgabe prüfen“. Darin 22.10.2026, zwei beendete eigene Sitzungen, **Arbeit 04:05:00**, **Pausen 00:25:00**, Zeitnachweis und Auftragszuordnungen. Diese Summen passen zum alten eigenen Nachtrag von 3:15 Stunden Arbeit und 15 Minuten Pause plus dem neuen Nachtrag von 50 Minuten Arbeit und zehn Minuten Pause. Der gesonderte Abschluss heißt „Tag verbindlich einreichen“. Ich wählte „Weiter bearbeiten“; keine verbindliche Einreichung. [Prüfzusammenfassung](../evidence/employee_b/employee_b-09-pruefzusammenfassung.png). |
| Mobile Buttons und Assistentüberschneidung | Überwiegend bestanden | Pause/Feierabend und die Dialogaktionen passen bei 390 Pixeln in den Ausschnitt. „Tag verbindlich einreichen“ bricht in zwei gut lesbare Zeilen um. In den angesehenen Auftrag-, Dokument-, Zeit- und Dialogansichten verdeckte keine schwebende Assistentenschaltfläche die Arbeitsaktionen. Tabellenrest siehe unten. |

## Verbleibender Befund · P3 · Tabellen auf 390 Pixeln schwer lesbar

**Beobachtung:** In „Bestätigte Auftragszuordnung“ zerfällt die Auftragsnummer bzw. Bezeichnung in viele kurze Zeilen, etwa `AUF- / 2026- / 00014 · UX / employee_b / · Montage / Testweg`. Die rechte „Bis“-Spalte liegt im initial sichtbaren Ausschnitt nur teilweise sichtbar am Kartenrand. In der neuen Prüfzusammenfassung ist entsprechend die Auftragsspalte am rechten Rand abgeschnitten und stark umbrochen. Die Arbeit-/Pausensumme und die festen Abschlussbuttons bleiben gut sichtbar.

**Erwartung:** Beim Prüfen auf dem Smartphone möchte ich einen Auftrag, Beginn und Ende in einem verständlichen Zusammenhang lesen können. Die vielen Umbrüche und der seitliche Ausschnitt erschweren den Vergleich; die Inhalte sind im zugänglichen Snapshot vorhanden. Eine Unmöglichkeit des seitlichen Scrollens wurde nicht nachgewiesen und wird nicht behauptet.

**Evidenz nach dem letzten bestätigten Reload:** [Bestätigte Zuordnung](../evidence/employee_b/employee_b-04-zuordnung-mobil.png), [Prüftabelle](../evidence/employee_b/employee_b-09-pruefzusammenfassung.png). Route `/time?date=2026-10-22`.

**Vorschlag:** Für kleine Breiten je Arbeitsblock Auftrag, Tätigkeit, Beginn und Ende untereinander zeigen oder die horizontale Lesbarkeit deutlicher gestalten. Das ist ein Darstellungsrest, kein nachgewiesener Fehler der gespeicherten Zuordnung.

Der funktionale Teil des früheren Korrekturproblems ist behoben: Der letzte Arbeitsblock folgt der einfachen Endzeitänderung. Die Begriffe „Sitzung“ und „Arbeitsintervalle“ und das lange Korrekturformular bestehen weiterhin; deren allgemeine Verständlichkeit wurde in diesem gezielten Nachtest nicht erneut bis zur Einreichung bewertet.

## Angelegte eigene Testdaten und Abschluss

- Kurze heutige synthetische Montagezeit 23.10.2026, ungefähr 16:33–16:34 Europe/Berlin, mit Pause und Feierabend; vollständig bestätigt. Die Timeroberfläche bietet keinen freien Namen für die Sitzung. Zur Kennzeichnung wurde eine zugehörige eigene Rückmeldung gespeichert: `UX Nachtest employee_b · Kurze synthetische Montagezeit am 23.10.2026, 16:33–16:34 ... Keine echte Montage ausgeführt.`
- Neuer eigener Nachtrag `UX Nachtest employee_b · Synthetischer Nachtrag 22.10.2026, 12:00–13:00 ...`, mit zwei Pausen. Gespeichert bleibt Ende 13:00; die probeweise Korrektur auf 13:05 wurde verworfen.
- Keine fremden Datensätze geändert oder gelöscht, keine Freigabe, keine Korrektureinreichung und keine Tagesabgabe abgeschlossen. Kein Timer mehr aktiv. Verbindung wieder online. Browserkontext durch `close` erfolgreich geschlossen.

## Grenzen des Durchgangs

Während des ersten leeren Nachtrags verschwand der Dialog, bevor der erste Füllschritt gelang. Der Parent bestätigte hierfür einen automatischen Reload durch eine eigene Codekorrektur. Die folgenden Locator-Timeouts werden als Testumgebungseinfluss geführt, nicht als Produktbefund. Nach erneutem Öffnen blieb das Formular stabil. Nachträge, Korrekturmitnahme, Offlinefehler und Tagesprüfung wurden anschließend auf dem laut Parent unveränderten Stand geprüft. Die frühen Screenshots zur laufenden Zeit entstanden vor diesem Reload; der spätere Tabellenbeleg stammt danach.

Ein erster exakter Text-Locator für den eingeklappten Stoppuhrbereich fand das kombinierte Label nicht; derselbe sichtbare Text mit passender Teiltextsuche öffnete den Bereich. Kein Appfehler daraus abgeleitet. Native Datumsfelder zeigten weiterhin das Browserformat `10/22/2026` mit AM/PM, während die fachlichen Zeitnachweise deutsch formatiert waren. Die Ursache wurde nicht isoliert.

Dies ist ein simulierter Einzeltest im mobilen Browser-Viewport, ohne echten Touchscreen oder Bildschirmtastatur. Kein Appcode geprüft. Keine verbindliche Einreichung oder fremde Prüfung ausgeführt; deshalb keine Aussage über deren Serverergebnis.
