> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest owner_b

Maren, 39, kaufmännische Mitinhaberin; App-Name **UX Maren Koch**. 23.10.2026, 13:10:09–13:19:38 UTC (15:10–15:19 Uhr Deutschland). Primär 1280 × 900, ergänzend 390 × 844. Rund 64 Browseraktionen einschließlich Inspect und Close. Browser geschlossen. Ein simulierter Rollen-Durchlauf, keine menschliche Nutzerstudie oder Codeprüfung.

## Zielstatus

| Ziel | Status | Ergebnis |
| --- | --- | --- |
| G1 – Einstieg und Aufmerksamkeit verstehen | Teilweise | Tour bis „Kunden & Projekte“ verfolgt und pausiert; Navigation verständlich, Hilfe bietet Fortsetzung. Zwei Angebotsmeldungen bleiben ohne erkennbaren konkreten Vorgangsbezug. |
| G2 – Telefonat-Aufgabe anlegen und wiederfinden | Erreicht | **UX owner_b · Kundentelefonat Familie Linden**, **TAS-2026-00002**, gespeichert und über „UX owner_b“ als einzigen Treffer wiedergefunden. Auftrag „UX finance_b · Badumbau Testweg“, zuständig „UX Maren Koch“, fällig 26.10.2026. Status Offen; nicht begonnen oder erledigt. |
| G3 – KI und Backoffice prüfen | Teilweise | KI-Übermittlungsdetails am eigenen Entwurf geprüft; Anfrage wegen fehlender Einrichtung deaktiviert. Auswertungen und Administration → Buchhaltung gefunden und nur gelesen. |

## Wichtigste Befunde

**owner_b-F1 · P2 · Verantwortliche Person wird als Kennung angezeigt.**<br>
Ich wählte im Aufgabenformular „UX Maren Koch“ per Suche und ArrowDown/Enter. Nach Speichern und Wiederöffnen steht in der Akte unter „Verantwortlich“ eine UUID. Erneutes „Bearbeiten“ zeigt wieder meinen Namen; Escape schloss ohne Änderung. Erwartet war derselbe lesbare Name im Lesemodus. Zur Zuständigkeitskontrolle ist so ein unnötiger Bearbeitungsdialog nötig. Kein Datenverlust behauptet.

Weg: Aufgaben → Aufgabe anlegen → Verantwortlich wählen → speichern → Aufgabe suchen/öffnen → Bearbeiten vergleichen. Route: `/tasks/1ab66165-8936-4c27-b5c2-2f601faf152e`. Hohe Sicherheit.<br>
Evidenz: Akte mit Kennung (`evidence/owner_b/0012-1792761344296.png`), Editor mit Name (`evidence/owner_b/0013-1792761374390.png`). Empfehlung: Namen auch in der Akte auflösen.

**owner_b-F2 · P2 · Kostensatz-Hinweise nennen keine betroffene Grundlage.**<br>
„Auswertungen → Daten & Grundlagen 36“ zeigt zahlreiche gleiche Zeilen: „Berechnungsgrundlage ergänzen“, „Interner Kostensatz fehlt. Auftragsmarge unvollständig.“, „Prüfung erforderlich“. In diesen sichtbaren Zeilen fehlen Personen-/Auftragsname und Prüf-Link. Ich erwartete zu erfahren, bei wem welche Grundlage fehlt. Die Hinweise lassen sich nicht unmittelbar zuordnen; die Ursache muss andernorts gesucht werden. Fehlende Kostensätze selbst sind ein Datenstand, kein behaupteter Berechnungsfehler.

Weg: Auswertungen → Daten & Grundlagen 36 → Datenlücken zuerst klären. Route: `/reports`. Hohe Sicherheit.<br>
Evidenz: gleichlautende Hinweise (`evidence/owner_b/0015-1792761415277.png`). Empfehlung: Bezug nennen und passende Prüfansicht verlinken.

**owner_b-F3 · P2 · Angebotsmeldungen führen ohne konkreten Vorgangsbezug weiter.**<br>
„Heute“ zeigt zwei gleiche Meldungen „Angebot wurde angenommen“ mit „Mitteilung und tatsächlichen Originalstand öffnen: /orders“. Die erste öffnet eine Aufgabe mit „Auftrag —“. „Verknüpfte Vorgänge“ erklärt nur allgemein, Verknüpfungen über die Übersicht zu öffnen. Ich erwartete Kunde/Angebotsnummer und eine konkrete nächste Prüfung. Die Meldungen bleiben ununterscheidbar und die Folgearbeit unklar.

Weg: Heute → erste Angebotsmeldung → Übersicht → Verknüpfte Vorgänge. Routen: `/`, `/tasks/cbca20a1-eb34-4a64-ab6e-36abb21914e9`. Mittlere Sicherheit: Der fehlende Bezug kann aus den synthetischen Daten stammen; die sichtbare Hürde bleibt.<br>
Evidenz: Einstieg (`evidence/owner_b/0002-1792761063475.png`), Aufgabe ohne Auftragsbezug (`evidence/owner_b/0003-1792761079689.png`). Empfehlung: Quelle und nächsten Schritt nennen oder fehlenden Bezug ausdrücklich erklären.

## KI und Grenzen

Am eigenen ungespeicherten Formular nennt „Diese Angaben werden übermittelt“ Aufgabe, Fällig am, Beschreibung und den Ausfüllstand. Andere Akten und interne Einzelkosten werden ausgeschlossen. Start erst nach ausdrücklichem Klick und anschließendes manuelles Speichern sind klar.

„Eingaben prüfen“ bleibt deaktiviert: **„OpenAI-Projekt, Modell und Kostenbudget noch einzurichten.“** Verständlich erklärte Umgebungsgrenze; keine Anfrage, Ausgabe oder Bewertung der Antwortqualität. Evidenz (`evidence/owner_b/0009-1792761277269.png`).

Native Datumsfelder zeigen hier MM/DD/YYYY bzw. 10/26/2026, die Akte 26.10.2026. Browser-Locale ungeprüft; kein bestätigter Produktfehler. Ein erfolgloser CLI-Locator auf die KI-Gruppe wurde durch Klick auf sichtbaren Text gelöst und nicht als Appfehler gewertet.

## Stärken und Umfang

- Ruhige Desktop-Hierarchie, klare Hauptaktionen, pausierbare Einführung und auffindbare Fortsetzung in der Hilfe.
- Formular erklärt Pflichtfelder, Auftragsbezug und explizites Speichern. Suche liefert genau den eigenen Treffer; Tastaturauswahl und Escape funktionieren. Suchergebnis (`evidence/owner_b/0011-1792761329699.png`).
- Auswertungen nennen Zeitraum, Datenstand, EUR und Quellenwege. Auswertung (`evidence/owner_b/0014-1792761391286.png`). Buchhaltung und Freigabestand sind auffindbar. Buchhaltungsprofil (`evidence/owner_b/0018-1792761455290.png`).
- Kurzer mobiler Sichttest: Karten passen in die schmale Ansicht, „Mehr“ öffnet lesbare Navigation. Aufmerksamkeit folgt nach Einsätzen und Aufträgen. Mobile Ansicht (`evidence/owner_b/0021-1792761519319.png`), Menü (`evidence/owner_b/0024-1792761563846.png`). Keine vollständige mobile Formularprüfung.

Screenshots von Einstieg, Arbeitsformular, KI-Sperre, Ergebnis, Auswertung und mobiler Ansicht selbst betrachtet. Nur die eigene gekennzeichnete Aufgabe angelegt; Beschreibung ausdrücklich vorläufiger interner Entwurf. Bestehender Auftrag und Finanzkonfiguration unverändert. Keine Nachrichten, Zahlungen oder Freigaben ausgelöst; keine Sourcen, APIs, Datenbanken oder fremden Berichte gelesen.
