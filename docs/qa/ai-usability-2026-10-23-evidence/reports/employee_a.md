> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# employee_a · Tobias, Monteur am Smartphone

Simulierter Nutzertest am 23.10.2026, 390 × 844 Pixel. Produktiver Zugang ab 12:47 UTC (14:47 Europe/Berlin). Interaktion abgeschlossen, eigener Browserkontext erfolgreich geschlossen. 53 Browserbefehle einschließlich Startversuchen, Prüfungen und Abschluss. Alle Beobachtungen stammen aus sichtbarer UI; keine Anwendungssourcen oder Datenbestände gelesen.

## Zielstatus

| Ziel | Ergebnis |
| --- | --- |
| G1 · Einsatz und Montageangaben finden | **Erreicht.** Heute: 07:00, AUF-2026-00013, Testweg 12, 10115 Berlin. Auftrag: zwei Fensterbänke, jeweils 1200 × 250 × 30 mm; vor Ort Maße prüfen, keine Fertigungsfreigabe. Arbeitspaket ergänzt Kante poliert und keine Ausführung/Freigabe. Vor echtem Beginn würde ich bestätigte Istmaße und Materialangabe mit der Leitung klären. |
| G2 · Timer starten, pausieren, fortsetzen, beenden | **Erreicht, mit Klarheitsproblemen.** Auftrag ausdrücklich gewählt, Tätigkeit Aufmaß. Sitzung 14:49:17–14:51:36, Anzeige 00:02:01 Arbeit und 00:00:17 Pause. Danach Bestätigt, Beendet Version 4, 0 ausstehende Übertragungen. Nach Heute → Zeit weiterhin vorhanden. Kein Tag abgegeben. |
| G3 · Notiz und Unterlagen | **Teilweise.** Eigene Testnotiz gespeichert und nach erneutem Aufruf sichtbar. Rücknavigation gelang. Unterlagen konnten nicht geöffnet werden: Auftrag meldete Noch keine Dokumente verknüpft; Dokumentbereich enthielt 0 Einträge. Fehlende Testunterlagen sind ein Daten-/Umgebungslimit. |

Die gespeicherte Notiz beschreibt ausschließlich die Testvorbereitung: Angaben zu den zwei Fensterbänken gelesen, Istmaße und Material noch zu klären, kein reales Aufmaß und keine Ausführung/Freigabe.

## Wichtigste Befunde

### employee_a-F1 · P2 · „Zuordnung offen“ trotz bestätigtem Auftrag

**Erwartung:** Nach bewusster Auftragswahl und Bestätigung möchte ich die Zuordnung meiner gespeicherten Arbeitsabschnitte eindeutig sehen.

**Beobachtung:** Vor Start wurden AUF-2026-00013 und Aufmaß gewählt. Direkt nach Start/Pause nannte der Tagesverlauf den Auftrag. Nach Unterlagenrecherche und Rückkehr zur Zeitseite bezeichnete er beide Arbeitsabschnitte als **Arbeit · Zuordnung offen**. Darunter zeigte **Bestätigte Auftragszuordnung** denselben Auftrag mit Aufmaß. Der Widerspruch blieb nach Feierabend, bestätigter Übertragung, Synchronisieren und erneutem Heute → Zeit bestehen.

**Nachvollziehen:** Heute → UX Einsatz employee_a → eigenes Arbeitspaket → Zeit → Arbeitszeit live mitlaufen lassen → Auftrag und Aufmaß wählen → Arbeit starten → Pause → Weiterarbeiten → zum Arbeitspaket/Dokumentbereich wechseln → Zeit → Feierabend → Synchronisieren → Tagesverlauf und bestätigte Zuordnung vergleichen.

**Auswirkung:** Ich weiß vor dem Prüfen des Tages nicht, ob ich die Zeit noch zuordnen oder korrigieren muss. Ein tatsächlicher Verlust der Zuordnung ist damit **nicht** nachgewiesen. Beobachtete Route: `/time`. Sicherheit: hoch.

Evidenz: anfangs korrekt zugeordneter laufender Timer (`evidence/employee_a/0012-1792759762739.png`), Tagesverlauf mit offener Zuordnung (`evidence/employee_a/0027-1792759931358.png`), offen und bestätigt gleichzeitig nach Synchronisieren (`evidence/employee_a/0028-1792759956620.png`).

### employee_a-F2 · P2 · Laufende Zeit verschwindet aus den besuchten Arbeitsansichten

**Erwartung:** Beim Lesen der Montageunterlagen möchte ich erkennen, dass meine Zeit für den richtigen Auftrag weiterläuft.

**Beobachtung:** Nach Weiterarbeiten lief der Timer weiter. In der besuchten Arbeitspaketakte, im Dokumentbereich und in der Auftragsakte war kein sichtbarer Laufhinweis zu finden; auch die feste mobile Navigation zeigte lediglich Zeit. Nach Rückkehr zur Zeitseite stand dort Arbeit läuft mit 00:01:52.

**Nachvollziehen:** Eigene Zeit starten/pausieren/fortsetzen → Browser zurück zum eigenen Arbeitspaket → Dokumente → Dokumente durchsuchen → Auftrag → Zeit.

**Auswirkung:** Für die Zustandskontrolle muss ich die Unterlagen verlassen. Bei einer echten Unterbrechung könnte ich den Timer leichter vergessen. Im Test wurde er anschließend beendet. Beobachtete Route unter anderem `/work-packages/b30f67d7-16aa-4550-8055-f36ed36ea50a`. Sicherheit: hoch.

Evidenz: Weiterarbeit gestartet (`evidence/employee_a/0015-1792759790583.png`), Arbeitspaket ohne Laufhinweis (`evidence/employee_a/0017-1792759810296.png`), Dokumentansicht ohne Laufhinweis (`evidence/employee_a/0020-1792759846274.png`), Rückkehr-Aktionssnapshot zum Zeitaufruf (`evidence/employee_a/0022-1792759888736.png`).

### employee_a-F3 · P3 · Pausenaktionen brechen mitten im Wort um

**Erwartung:** Weiterarbeiten und Feierabend sollten auf dem Smartphone als vollständige Wörter sofort lesbar sein.

**Beobachtung:** Bei 390 × 844 Pixeln erschien Weiterarbeiten als „Weiterarb / eiten“ und Feierabend als „Feieraben / d“. Beide Schaltflächen waren erreichbar; Weiterarbeiten funktionierte.

**Nachvollziehen:** Eigene Zeit starten → Pause → gespeicherten Pausenzustand ansehen. Route: `/time`. Sicherheit: hoch.

**Auswirkung:** Die Hauptaktionen sind unnötig gedrängt. Untereinander angeordnete Schaltflächen könnten die Wörter erhalten.

Evidenz: Pausenansicht (`evidence/employee_a/0014-1792759778640.png`).

### employee_a-F4 · P3 · Fester Assistent überlagert Zeitdetails

**Erwartung:** Beim Prüfen möchte ich Dauer und Zeitende vollständig sehen.

**Beobachtung:** Beim normalen Scrollen überlagerte die feste grüne Assistent-Schaltfläche die rechte Dauer-/Zeitangabe einer Arbeitszeile. Sie lag auch über der Tabelle Bestätigte Auftragszuordnung. Deren Bis-Spalte war zusätzlich rechts angeschnitten. Durch Nachscrollen ließ sich der Arbeitsabschnitt lesen.

**Nachvollziehen:** Eigene Sitzung beenden → zum Tagesverlauf und zur bestätigten Auftragszuordnung scrollen. Route: `/time`. Sicherheit: hoch.

**Auswirkung:** Zusätzliche Scrollbewegungen sind nötig, um die Angaben zu vergleichen. Die mobile Prüfung der Zuordnung wird erschwert.

Evidenz: verdeckte Dauer (`evidence/employee_a/0027-1792759931358.png`), überlagerte und rechts angeschnittene Zuordnungstabelle (`evidence/employee_a/0028-1792759956620.png`).

## Was gut funktionierte

- Heute (`evidence/employee_a/0029-1792759987152.png`) zeigt eigenen Einsatz, Uhrzeit und Adresse ohne Suche.
- Auftragsnotizen (`evidence/employee_a/0005-1792759664703.png`) sind lesbar und nennen Maße sowie die klare Einschränkung vor Ort prüfen / keine Freigabe.
- Der geöffnete Timer (`evidence/employee_a/0012-1792759762739.png`) hat einen großen Zeitstand, verständliche Zustände, passende Schaltflächen und den Auftrag direkt darunter.
- Die gespeicherte Rückmeldung (`evidence/employee_a/0030-1792760026220.png`) bleibt nach erneutem Seitenaufruf sichtbar. Keine erfundene Leistungsmenge war erforderlich.
- Einführung ließ sich für später schließen. Tab/Enter bei der Anmeldung funktionierten; Escape schloss später die Auftragsauswahl ohne Änderung.

## Grenzen und getrennte Umgebungsbeobachtungen

Der erste Browserstart scheiterte an ECONNREFUSED zum Broker. Der Parent stellte die Infrastruktur wieder bereit. Das ist ein Harness-Ausfall, kein Appdefekt. Anschließend zeigte die Anmeldung Too many requests. Please try again later. (`evidence/employee_a/0001-1792759594284.png`). Nach einer Pause gelang die Anmeldung mit den bereits ausgefüllten Daten per Enter. Der Parent bestätigte eine gemeinsame lokale Shared-IP-Anmeldedrossel; diese Wartezeit wurde nicht als blockierte Kernaufgabe gewertet. Die sichtbare englische Meldung enthielt keine konkrete Wartezeit.

Die Unterlagenrecherche führte vom Arbeitspaket mit „Dokumentübersicht hier nicht geladen“ zum leeren Dokumentbereich; auch der Auftrag bestätigte Noch keine Dokumente verknüpft (`evidence/employee_a/0021-1792759876953.png`). Ohne Testunterlagen lassen sich Dokumentinhalt, PDF-Lesbarkeit und Download nicht beurteilen.

Die native Datumsauswahl zeigte 10/23/2026; die Browser-/Gerätesprache wurde nicht verifiziert. Ein CLI-Timeout beim exakten Textziel für die aufklappbare Stoppuhr war nach inspect durch Teiltextbedienung lösbar und ist kein Produktbefund. Keine KI-Funktion genutzt, keine Antwortqualität erfunden. Ausschließlich eigene Testzeit und markierte Rückmeldung verändert; keine Abgabe, Bestätigung, reale Nachricht oder Freigabe ausgelöst.

Maschinenlesbare Details einschließlich Zeitstempeln: [employee_a.json](employee_a.json).
