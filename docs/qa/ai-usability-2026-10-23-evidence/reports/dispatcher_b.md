> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest dispatcher_b

Simon Kranz, 32, neuer stellvertretender Disponent. Laptop 1280 × 900. 23.10.2026, etwa 12:58–13:07 UTC (14:58–15:07 in Deutschland). 64 Browseraktionen einschließlich Einstieg, Inspektionen und Schließen. Ausschließlich sichtbare UI, keine Anwendungssourcen, APIs oder Datenbanken.

## Zielstatus

| Ziel | Ergebnis |
| --- | --- |
| G1: Nächste Woche überblicken und 27.10., 09:00–11:00 planen | **Erreicht.** Tourstation 4 → Woche → nächster Zeitraum → 27. Oktober. Eigenen Einsatz „UX dispatcher_b · Aufmaß vorbereiten“ für UX Simon Kranz mit vorbereitetem Auftrag und Arbeitspaket als Entwurf gespeichert. |
| G2: Zweiten eigenen Plan 10:00–12:00 prüfen und korrigieren | **Erreicht.** Speichern wurde wegen Überschneidung blockiert. Eingaben blieben erhalten. Auf 11:00–13:00 korrigiert und als „UX dispatcher_b · Montage abstimmen“ gespeichert. |
| G3: Anweisung, Status, Arbeitspaket und benötigte Zeit finden | **Erreicht, mit Umweg über Akten.** Auftrag zeigt Notizen und Status Entwurf; Arbeitspaket zeigt Offen, zwei Sollstunden und die Arbeitsanweisung unter Abschlusskriterium. Diese Informationen waren im Einsatzformular selbst nicht sichtbar. Auftrag → Termine & Team führt zu den beiden gespeicherten Entwürfen. |

Gespeicherte eigene Entwürfe:

- [Aufmaß vorbereiten](http://127.0.0.1:5173/dispatch/1bb4ab28-990d-4ced-a86d-b295f2dbe708): 27.10.2026, 09:00–11:00.
- [Montage abstimmen](http://127.0.0.1:5173/dispatch/ccaa4f85-9e10-4d30-8eee-c9ef6201759d): 27.10.2026, 11:00–13:00.

Beide gehören zum eigenen Auftrag „UX dispatcher_b · Badumbau Testweg“, zum eigenen Arbeitspaket und zu UX Simon Kranz. Keine Bestätigung, Freigabe oder Nachricht ausgelöst. Letzten ungespeicherten Dialog abgebrochen und Browserkontext geschlossen.

## Die drei wichtigsten Befunde

### dispatcher_b-F1 · P2 · Vorhandener eigener Mitarbeiter wird zunächst nicht gefunden

**Erwartung vor dem Versuch:** Die Suche im Mitarbeiterfeld findet meinen vorhandenen Benutzer.

**Beobachtung:** Im geöffneten Feld „Mitarbeiter *“ führt „Simon“ zu „Kein Eintrag gefunden. Versuchen Sie einen anderen Suchbegriff.“ und „0 Einträge gefunden“. Erst Escape → „Weitere Einträge suchen“ unter Mitarbeiter → erneut „Simon“ → „Suchen“ liefert einen Treffer. Die Rückmeldung fordert zur Auswahl oben auf; ich muss das ursprüngliche Feld wieder öffnen, um „UX Simon Kranz“ auszuwählen. Dieser Umweg war bei beiden Einsätzen nötig. Im letzten, anschließend abgebrochenen Dialog habe ich das leere Suchergebnis erneut bestätigt.

**Folge:** Als neuer Disponent könnte ich annehmen, mein Benutzer sei nicht verfügbar. Dass die Suche im Feld und die zusätzliche Suche verschiedene Trefferbestände haben, ist an der leeren Trefferliste nicht klar.

**Reproduktion:** Einsatz anlegen → Mitarbeiter öffnen → „Simon“ eingeben → leere Liste sehen → Escape → separate Suche öffnen und mit „Simon“ ausführen → ursprüngliche Auswahl wieder öffnen.

**Evidenz:** [Leere Suche, visuell geprüft](../selected/dispatcher_b-F1-0015-1792760746434.png), [Rückmeldung der erweiterten Suche](../selected/dispatcher_b-F1-0006-1792760430091.png), korrekter Benutzer in gespeicherter Einsatzakte (`evidence/dispatcher_b/0011-1792760641851.png`). Route zunächst `/dispatch?mode=week&date=2026-10-30`, erneut auf der Auftragsfilter-Route.

**Anregung:** Im Mitarbeiterfeld den vollständigen auswählbaren Bestand durchsuchen oder direkt aus dem leeren Ergebnis zur nötigen erweiterten Suche führen.

### dispatcher_b-F2 · P2 · Kennung ersetzt den Mitarbeiternamen im Wochenkalender

**Erwartung:** Ich erkenne in der Teamübersicht direkt, wer die Arbeit übernimmt.

**Beobachtung:** Meine gespeicherten Karten zeigen unter der Tätigkeit die Kennung „6460efaa-1e38-42be-b50c-0d2241fcdbc4“. Die erste Einsatzakte nennt unter Mitarbeiter dagegen korrekt „UX Simon Kranz“. Die Kennung beansprucht mehrere Zeilen, während die Tätigkeit in der Karte gekürzt wird.

**Folge:** Ich muss den Einsatz öffnen, um die Person verständlich zu prüfen. Gerade die Frage „Wer ist wann eingeplant?“ wird im Wochenüberblick für diese Einträge nicht beantwortet.

**Reproduktion:** Einsatz für UX Simon Kranz speichern → Wochenkarte am 27.10. lesen → Einsatzakte öffnen und Mitarbeiterangabe vergleichen.

**Evidenz:** [Wochenkarte nach erstem Speichern, visuell geprüft](../selected/dispatcher_b-F2-0008-1792760490038.png), [beide Entwürfe nach Korrektur](../selected/dispatcher_b-F2-0010-1792760629316.png), Einsatzakte mit Namen (`evidence/dispatcher_b/0011-1792760641851.png`). Route `/dispatch?mode=week&date=2026-10-30`.

**Anregung:** Den ausgewählten Namen im Kalender zeigen und Platz für Tätigkeit und Zeit priorisieren.

### dispatcher_b-F3 · P2 · Konfliktmeldung bietet zu wenig Orientierung zur Korrektur

**Erwartung vor dem Speichern:** Die angekündigte Konfliktprüfung erklärt, mit welchem bestehenden Einsatz der zweite Plan kollidiert.

**Beobachtung:** 10:00–12:00 wird korrekt blockiert. Die rote Meldung lautet allein „Mitarbeiter oder Betriebsmittel ist bereits eingeplant.“ Sie nennt weder Person, Einsatz noch bestehenden Zeitraum und bietet keinen Link. Ein Betriebsmittel war nicht ausgewählt. Die eingegebenen Werte bleiben erhalten. Nach manueller Verschiebung auf 11:00–13:00 wird gespeichert.

**Folge:** In diesem kleinen Test konnte ich den eben selbst geplanten Termin erinnern. Bei mehreren Einsätzen müsste ich außerhalb des offenen Formulars nach dem betroffenen Zeitraum suchen. Die fachlich richtige Sperre ist hilfreich; die fehlende Erklärung erschwert den nächsten Schritt.

**Reproduktion:** Ersten eigenen Einsatz 09:00–11:00 speichern → zweiten für denselben Benutzer 10:00–12:00 ausfüllen → speichern → Meldung lesen → auf 11:00–13:00 ändern → speichern.

**Evidenz:** Konfliktmeldung, visuell geprüft (`evidence/dispatcher_b/0009-1792760593038.png`), [erfolgreich korrigierte Entwürfe](../selected/dispatcher_b-F2-0010-1792760629316.png). Route `/dispatch?mode=week&date=2026-10-30`.

**Anregung:** Betroffene Person, bestehenden Einsatz und dessen Zeitraum in der Meldung nennen und Nachsehen ohne Verlust der Eingaben ermöglichen.

## Arbeitsanweisung, Formularkomplexität und Orientierung

In der Auftragsübersicht habe ich die Notiz „Zwei Fensterbänke, jeweils 1200 × 250 × 30 mm. Vor Ort Maße prüfen; keine Fertigungsfreigabe.“ gefunden. Im Arbeitspaket stehen zwei Sollstunden und unter „Abschlusskriterium“ die Maße, die polierte Kante und die Prüf-/Testanweisung. Status ist rechts in beiden Akten gut auffindbar. Die fachliche Anweisung wird durch den Begriff „Abschlusskriterium“ allerdings erst beim Lesen erkennbar.

Die Arbeitspaketauswahl zeigt trotz ausgewähltem Auftrag auch Arbeitspakete anderer Aufträge. Ich habe anhand der eindeutigen UX-Namen das eigene ausgewählt; kein falsches Paket wurde getestet oder gespeichert. Eine Vorschau auf Sollstunden oder Anweisung ist dort nicht sichtbar. Die erste geplante Dauer von zwei Stunden entspricht dem später gefundenen Sollwert.

Das Formular hat viele Hilfstexte und zusätzliche Suchbereiche. Bei 1280 × 900 ist Scrollen nötig; „Speichern“ und „Abbrechen“ bleiben sichtbar. Die Markierung offener Grundangaben hilft. Einige Texte sprechen technisch vom Server bzw. von serverseitiger Prüfung, statt nur den Arbeitsschritt zu erklären. In der Auftragstabelle heißt die Zeitspalte „Planned hours“, in der Arbeitspaketakte „Sollstunden“. Das sind zusätzliche Verständlichkeits-/Konsistenzbeobachtungen, keine Blockaden.

Der Auftrag bietet sowohl einen Reiter als auch einen Link „Termine & Team“. Der Reiter führt zu klaren Optionen „Einsatz anlegen“ und „Einsätze zu diesem Auftrag öffnen“. Letzteres öffnete eine korrekt auf meinen Auftrag gefilterte Liste beider gespeicherten Entwürfe. Die Kalenderansicht sprang dabei zurück auf Monat/heute; die zwei Termine blieben im aktuellen Monatsbereich auffindbar.

Evidenz: Auftrag (`evidence/dispatcher_b/0012-1792760653319.png`), Arbeitspaket mit Zeit und Anweisung, visuell geprüft (`evidence/dispatcher_b/0013-1792760671531.png`), Auftragsfilter (`evidence/dispatcher_b/0014-1792760718624.png`), Formular, visuell geprüft (`evidence/dispatcher_b/0004-1792760372199.png`).

## Was gut funktioniert hat

- Einführung mit direkter Stationswahl; Erklärung, dass keine Geschäftsdaten geändert werden.
- Verständlicher Wechsel zwischen Monat, Woche und Tag; Tageswahl übernimmt das Datum beim Anlegen.
- Die Überschneidung wird verhindert, Eingaben bleiben erhalten und Korrektur gelingt.
- Sichtbare primäre Aktionen sowie nachvollziehbare Statusangaben und Verknüpfungen zwischen Einsatz, Auftrag und Arbeitspaket.
- Escape schließt die offene Auswahl und setzt den unbestätigten Suchtext zurück; der Formularinhalt bleibt bestehen.

## Grenzen und Umgebung

Dies ist ein simulierter Black-box-Test einer Persona, keine echte menschliche Nutzerstudie. Nur Laptop 1280 × 900 wurde geprüft. Einstieg, Kalender, Formulare und Speichern waren erreichbar; keine Umgebungsblockade beobachtet. KI war nicht Teil dieses Ablaufs.

Der Testbrowser stellte native Datums-/Zeitfelder als mm/dd/yyyy und AM/PM dar. Ursache bzw. Browserlocale wurde nicht geprüft; kein gesicherter Produktfehler. Die Browserhilfe füllte die nativen Felder mit ISO-Werten; deutsche manuelle Datumseingabe wurde nicht geprüft.

Die gemeinsame synthetische Umgebung zeigte zwischenzeitlich Änderungen anderer Testpersonen in der Liste. Diese wurden nicht geöffnet oder geändert. Sämtliche eigenen Änderungen beschränken sich auf die zwei neuen Einsatzentwürfe. Statusaktionen „Einsatz bestätigen“, „Auftrag bestätigen“, „Beginnen“ und „Fertig melden“ wurden nicht ausgeführt.

Startzeit ist anhand des ersten gesicherten Screenshots angegeben; Login begann wenige Sekunden vorher. Automatische Screenshots und redigierte Aktionsprotokolle liegen unter `work/ai-usability/evidence/dispatcher_b/`. Einstieg, Hauptarbeitsansicht, Formular, Konflikt, Ergebnis und Anweisung wurden per Screenshot selbst betrachtet.
