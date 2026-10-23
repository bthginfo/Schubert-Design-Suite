> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# hr_a · Personalverwaltung · 23.10.2026

Simulierter Black-box-Nutzertest als Claudia, 48, erfahrene Personalverwalterin im Steinmetzbetrieb. App-Name **UX Claudia Lang**. Keine menschliche Forschungsstichprobe und kein Code-Review.

Browserinteraktion ungefähr 13:10:33–13:18:28 UTC, danach Bericht; rund **66 Browseraktionen** inklusive Inspektionen und vier fehlgeschlagener Locatoraktionen. Hauptviewport 1440 × 1000, kurzer zusätzlicher Sichtcheck 390 × 844. Kontext geschlossen.

## Zielstatus

| Ziel | Status | Beobachtetes Ergebnis |
| --- | --- | --- |
| G1 Bereiche und prüfbare Zeiten finden | Erreicht | Team über Tour, eigenes Profil über Suche, Abwesenheit über „Alle Bereiche“ gefunden. Ein eingereichter Zeitnachweis samt Prüfdialog zugänglich. |
| G2 Eigener Testantrag „UX hr_a“ für 28.10.2026 | Blockiert: bestätigte Testgrundlage fehlt | Eigenes Profil, „Sonstiges“, Von/Bis 28.10.2026 und Testnotiz eingegeben. „Arbeitstage“ verlangt bestätigte Grundlage. Ohne geratenen Wert blieb Speichern an der Pflichtfeldprüfung stehen. Arbeitsmodell-Suche „Claudia“: 0 Treffer. Antrag bewusst verworfen, kein Antrag dauerhaft erstellt. |
| G3 Prüfablauf, Sperren, Suche und Filter verstehen | Erreicht im erlaubten Leseumfang | Intervalle, Zuordnung, Version, Entscheidungsauswahl, Begründung und Prüfbestätigung angesehen. Keine Entscheidung gesendet. Eigene Tagesabgabe ohne Zeiten deaktiviert. Suche und Statusfilter gemeinsam geprüft. |

## Drei wichtigste Befunde

**hr_a-F1 · P2 · Produkt: HR-Zeitprüfung unter eigener Arbeitszeit schwer auffindbar.**

Erwartung: ein erkennbarer Einstieg zur Prüfung eingereichter Zeiten. Tatsächlich führt „Team & Dispo“ zu „Meine Arbeitszeit“. Die erste Desktopansicht zeigt eigene Erfassung, Tagesverlauf und Zeitkonto. „Zeiten sachlich prüfen“ liegt erst unter dem umfangreichen Formular „Was wurde erledigt?“. Die Prüfliste zeigt einen eingereichten Tag; eigene Such-/Datumsfilter sind dort nicht sichtbar. Das Bereichsverzeichnis enthält keinen separaten Einstieg „Zeitprüfung“. Folge: leichtes Übersehen und zusätzlicher Suchweg bei täglicher HR-Arbeit. Der Prüfdialog ist erreichbar.

Reproduktion: `/time` öffnen → erste Ansicht prüfen → unter eigener Leistungsrückmeldung scrollen → „Abgabe prüfen“. Erste Ansicht (`evidence/hr_a/0010-1792761272801.png`), Prüfliste (`evidence/hr_a/0011-1792761280601.png`). Sicherheit: hoch. Anregung: sichtbaren Einstieg mit offener Anzahl und passende Filter anbieten.

**hr_a-F2 · P2 · Produkt: „Vollständiger Nachweis“ öffnet JSON.**

Erwartung: einen fachlich lesbaren vollständigen Nachweis erhalten. Der normale Prüfdialog zeigt verständliche Tabellen. „Vollständigen Nachweis ansehen“ öffnet dagegen einen langen Codeblock mit englischen Feldnamen, internen Kennungen und UTC-Zeitstempeln; die Tabellen darüber verwenden deutsche Datums-/Zeitangaben. Folge: technische Interpretation und zusätzliche Zeitformatvergleiche statt unmittelbarer fachlicher Prüfung. Kein nachgewiesener Datenschutzvorfall.

Reproduktion: `/time` → „Zeiten sachlich prüfen“ → „Abgabe prüfen“ → „Vollständigen Nachweis ansehen“. Zusammenfassung (`evidence/hr_a/0012-1792761287922.png`), Codeblock (`evidence/hr_a/0013-1792761302347.png`). Sicherheit: hoch. Anregung: vollständige Fachansicht mit einheitlichen Zeiten; technische Daten zusätzlich klar benennen.

**hr_a-F3 · P2 · Umgebung: bestätigte Grundlage für eigenen Antrag nicht auffindbar.**

Erwartung: den eigenen eintägigen Testantrag mit bestätigten Grundlagen erfassen. Das eigene Profil zeigt Wochenstunden und Urlaubsanspruch als „—“. Der Antrag fordert „Bestätigte Arbeitstage laut Arbeitsmodell ohne Feiertage“. Einmaliges Speichern ohne diesen Pflichtwert lässt das Formular offen und fokussiert das Feld. Nach bewusstem Verwerfen ergibt die Suche nach „Claudia“ unter „Arbeitsmodelle“ 0 Treffer. Die Hilfe verlangt belegte betriebliche Angaben, liefert keinen eigenen bestätigten Wert.

Das ist **kein nachgewiesener Speicherdefekt**. Ohne bestätigte Grundlage durfte ich keinen Wert einsetzen; G2 blieb blockiert. Die Pflichtfeldsperre ist nachvollziehbar. Im Formular wäre ein direkter Blick/Link zur Grundlage hilfreich, damit ich es dafür nicht verlassen muss.

Reproduktion: `/leave` → eigenen Antrag wie oben ausfüllen → Arbeitstage leer lassen → Speichern → Verwerfen → „Alle Bereiche“/„Arbeitsmodelle“ → „Claudia“ suchen. Pflichtfeld (`evidence/hr_a/0005-1792761173141.png`), Verwerfen (`evidence/hr_a/0006-1792761199893.png`), 0 Modelle (`evidence/hr_a/0009-1792761260662.png`). Sicherheit: mittel zur Vollständigkeit der Grundlagen, hoch zum Ablauf.

## Stärken und Grenzen

- Tourauswahl mit Pfeiltaste/Enter funktionierte; Escape schloss den unveränderten Akteneditor. Team-Suche „Claudia“ plus Status „Aktiv“ ergibt genau einen Treffer. Evidenz (`evidence/hr_a/0016-1792761397513.png`).
- Der Prüfdialog nennt Version, echte Intervalle und Zuordnung. Begründung und Prüfbestätigung sind klar erkennbar; Freigabe bleibt ohne diese Eingaben deaktiviert. „Mit Rückfrage zurückgeben“ ist angeboten, und der Hinweis erklärt, dass dies Zeiten nicht verändert. Evidenz (`evidence/hr_a/0014-1792761334036.png`).
- Ungespeicherte Eingaben werden geschützt. Die mobile Teamansicht verwendet nach dem Layoutübergang lesbare Karten. Evidenz (`evidence/hr_a/0019-1792761486840.png`).
- Keine fremden Daten geändert oder entschieden, keine Beschäftigten/Zeiten angelegt, keine Ansprüche oder Arbeitstage erfunden. Keine KI aufgerufen. Einreichung/Genehmigung des eigenen Antrags und Dezimaleingabe bleiben ungeprüft.
- Native Datumsfelder und Pflichtfeldmeldung erschienen im Browser englisch/US-formatiert; Ursache Browser-/App-Lokalisierung nicht isoliert. Tabellen waren deutsch formatiert.
- Ein ungültiger CLI-JSON-Aufruf erreichte den Browser nicht. Mehrdeutiger „Notizen“-Locator wurde durch Textbox-Rolle gelöst. Zwei Navigationsversuche scheiterten an der korrekt offenen Verwerfen-Rückfrage; nach Inspektion und Bestätigung ging es weiter. Ein mobiler Sidebar-Locator lag nach dem Layoutübergang außerhalb des Viewports; folgende Sichtprüfung zeigte geschlossene Navigation. Diese Werkzeugfehler wurden nicht als Produktdefekte gewertet.

Sämtliche Evidenz entstand über Browser-ID `hr_a`; keine Sourcen, APIs, Datenbanken oder fremden Berichte gelesen. Ausführliche strukturierte Belege stehen in `hr_a.json`.
