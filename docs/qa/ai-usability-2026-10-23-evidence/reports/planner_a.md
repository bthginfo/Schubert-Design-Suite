> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest planner_a

Martin, 49, Steinmetzmeister mit mäßiger CAD-Erfahrung. Desktop 1440 × 1000, 23.10.2026. Beginn 2026-10-23T12:44:46.812Z, Abschluss 2026-10-23T12:54:49.917Z. Rund 71 Browseraktionen einschließlich Abschluss. Keine echte menschliche Nutzerforschung.

## Ergebnis aus meiner Arbeit

Ich fand das Planungsstudio direkt in der Hauptnavigation. Nach dem Einführungdialog legte ich **UX planner_a · Grabmal Familie Linden** an. Die gerade Stele hat **800 mm Breite, 1200 mm Höhe und 160 mm Materialstärke**. Der Originaltext **„Anna Linden · 1948–2026 · In Liebe“** blieb vollständig erhalten. Das Projekt ließ sich nach dem PDF-Fehler wieder öffnen; der gespeicherte Stand war Entwurf 1, Rev. 5.

| Ziel | Status | Beobachtetes Ergebnis |
| --- | --- | --- |
| G1 Entwurf, Maße, Inschrift | Erreicht | Stele und Text angelegt, Eingaben wiedergefunden; große wörtliche Textprüfung vorhanden. |
| G2 Gestaltung, Rücknahme, Quelle | Erreicht | Schrift geändert und rückgängig gemacht. Danach Noto Serif und dunkle Farbe gewählt. Katalogreferenz mit Lieferantenlink gefunden. |
| G3 KI mit geschützten Angaben | Blockiert, Umgebung | Kontext und Schutzgrenzen geprüft; Anbieter nicht eingerichtet, Eingabe und Senden gesperrt. |
| G4 Prüfen und Gesprächsunterlage | Teilweise | Prüfliste und Textprüfung nutzbar; PDF scheiterte zweimal. Keine Fertigungsfreigabe erteilt. |

Projekt: `/studio/d1c714f9-a55c-4089-bc44-dfafa8a7c75b`

## Wichtigste Hürde: PDF nicht gesichert (P1)

Ich erwartete nach **4 Präsentieren → Planungs-PDF herunterladen** eine PDF mit Ansichten, Maßen und Stückliste aus dem gespeicherten Stand. Stattdessen erschien eine rohe JSON-Seite mit **REQUEST_FAILED** und „Der Vorgang konnte nicht abgeschlossen werden. Bitte erneut versuchen.“.

Ich öffnete das gespeicherte Projekt über die sichtbare Studioübersicht erneut und versuchte den Download noch einmal. Auch dieser Versuch endete auf einer JSON-Fehlerseite. Die beiden sichtbaren correlationIds waren `701fb368-c3dc-4ac6-b86b-45c6ffafcdd9` und `b623f574-922a-4ebf-b2a0-d72bb2f882ee`. Auf der Fehlerseite fehlte eine Appnavigation oder Rückkehrschaltfläche. Eine PDF-Unterlage für das Kundengespräch konnte ich nicht sichern. Die technische Ursache bleibt im Black-box-Test offen.

Evidenz: [Downloadknopf](../selected/planner_a-F1-0010-1792759724122.png), [erster Fehler](../selected/planner_a-F1-0011-1792759746492.png), zweiter Fehler (`evidence/planner_a/0012-1792759800629.png`).

## KI: Grenze verständlich, Begründung zunächst abgeschnitten (P3)

Im Inschriftschritt mit ausgewählter eigener Inschrift nannte der Begleiter den aktuellen gespeicherten Planstand und das Element. **Nur Auswahl · Maßwerte geschützt · Wortlaut geschützt** war sichtbar. Die drei Bearbeitungsgrenzen waren angehakt. Die App erklärt, dass Vorschläge vor der Anwendung geprüft werden.

Beim Öffnen war zunächst nur der untere Teil der gelben Verfügbarkeitsmeldung sichtbar. Die Überschrift und der eigentliche Einrichtungsgrund waren oberhalb des sichtbaren Inhalts abgeschnitten. Nach gezieltem Heranscrollen konnte ich die ganze Meldung lesen. Das ist eine kleine zusätzliche Hürde beim Verstehen der deaktivierten Eingabe.

Evidenz: Ausgangszustand (`evidence/planner_a/0014-1792759887847.png`), vollständiger Hinweis nach Scrollen (`evidence/planner_a/0015-1792759898934.png`).

**Separates Umgebungslimit:** „OpenAI-Projekt, Modell und Kostenbudget noch einzurichten.“ Textfeld, Spracheingabe und Senden waren deaktiviert. Ich konnte deshalb weder eine Gestaltungsfrage absenden noch einen Vorschlag prüfen oder korrigieren. Über Antwortqualität oder die tatsächliche Wirkung der Schutzgrenzen bei einer Übernahme kann ich nichts sagen.

## Was im Arbeitsablauf gelang

Die Anlegemaske erklärt alle Maße als Millimeter und gibt sogar 80 cm = 800 mm als Beispiel. Breite, Höhe und Stärke waren direkt bearbeitbar. Die Kennzeichnung als Wunschmaß bzw. „Noch zu prüfen“ war nachvollziehbar. Die Oberflächenhierarchie mit vier fachlichen Schritten, grünem Speichern und zentralem Plan war am großen Desktop gut erkennbar.

Ich änderte Cinzel auf Noto Serif und verwendete **Rückgängig**; danach stand wieder Cinzel im Feld. Anschließend wählte ich bewusst Noto Serif und die dunkle Farbe `#1f2937`. Der lange Einzeiler bleibt in der Frontansicht bei 100 % relativ klein. Für die sorgfältige Prüfung fand ich **Projekt → Inschriften prüfen**, wo der volle Wortlaut groß und gut lesbar erscheint. Der Hinweis „Leseschrift zur Prüfung · keine Herstellerkontur“ verhindert eine falsche technische Erwartung.

Unter **Herstellerdaten** gab es auch nach Suche nach Granit keine passenden Originaldateien. Der Hinweis nennt die zuständige berechtigte Administration. In der Steinbibliothek fand ich dagegen **Padang TG34 Cristallo · Katalogreferenz**. Die App zeigt einen Lieferantenlink zu `https://rossittis.de/material/padang-tg34-cristallo` mit Stand 2026-10-19 und erläutert repräsentative Muster sowie die notwendige Prüfung des echten Plattenbildes, Liefermaßes und der Eignung. Den externen Link öffnete ich wegen der Testgrenze nicht. Ich habe keine Herstellerangabe fachlich bestätigt.

**3 Prüfen** zeigte offene Maße und Materialnachweise. Die App erklärt, dass Kundenbestätigung von Text/Gestaltung keine technische Fachprüfung ersetzt. Das passte zu meinem Ziel einer Gesprächsplanung. Ich habe keine Zustimmung dokumentiert und keine Fertigungsfreigabe erteilt.

Evidenz: Stein angelegt (`evidence/planner_a/0002-1792759589137.png`), Rücknahme (`evidence/planner_a/0004-1792759631475.png`), Prüfstand (`evidence/planner_a/0009-1792759706851.png`), wörtliche Prüfung (`evidence/planner_a/0013-1792759837376.png`), Lieferantenreferenz (`evidence/planner_a/0016-1792759927780.png`).

## Testgrenzen und Trennung von Produkt/Umgebung

- Vor der ersten Projekterstellung fiel der Broker kurz aus. Der Parent bestätigte einen Harness-Neustart. Der noch ungespeicherte Name ging dadurch verloren; nach neuer Anmeldung setzte ich fort. Das ist kein Produktbefund.
- Ein anfänglicher Navigationsklick traf den noch offenen Einführungdialog. Ich prüfte den Screenshot und schloss ihn per **Escape**. Der Locator-Timeout allein wurde nicht als Produktdefekt gewertet.
- KI-Anbieter nicht eingerichtet; Herstelleroriginale nicht vorhanden. Keine Antwortqualität, kein Importerfolg und keine externe Quellenprüfung erfunden.
- Nur die eigene Planung geändert. Keine Freigaben, echten Nachrichten, Bestellungen oder Löschungen ausgelöst.
- Relevante Screenshots von Einstieg, Planung, KI, Prüfung und Exportfehler selbst visuell angesehen. Keine Quellen, APIs oder Datenbanken zur Ursachenanalyse gelesen.

Die drei wichtigsten Punkte sind: Der Grundentwurf und seine Prüfung gelangen; der PDF-Abschluss ist blockiert; KI bleibt durch fehlende Einrichtung unbewertbar.
