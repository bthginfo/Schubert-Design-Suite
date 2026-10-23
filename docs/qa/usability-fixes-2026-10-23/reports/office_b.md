# Office-Nachtest · office_b · UX Nina Weber

23.10.2026, etwa 16:31–16:36 Uhr Europe/Berlin. Simulierter Black-box-Nachtest derselben neuen Backoffice-Mitarbeiterin am laufenden Working-Tree-Stand, Desktop 1280 × 900. Ausschließlich Browser-ID office_b, ungefähr 47 Browserbefehle einschließlich Sichtungen und Abschluss. Keine Sourcen, APIs, Datenbanken oder fremden Berichte gelesen. Ursprüngliche Study-Berichte unverändert. Browserkontext am Ende geschlossen.

**Ergebnis: Keine echten Blocker.** Kundennamen, Kundennamensuche, verknüpfte Kundenakten, ältere Kundenauswahl per Tastatur und das Anlegen eines Kunden innerhalb einer bereits ausgefüllten Anfrage funktionierten. Der Verlauf ist nun sichtbar und verständlich beschriftet; fachliche Vorher-/Nachher-Werte fehlen weiterhin.

## Prüfungen und Ergebnis

| Prüfung | Ergebnis | Sichtbare Wirkung |
| --- | --- | --- |
| Kunde in Auftragsliste als Name | Bestanden | Statt langer ID steht KD-2026-00050 · UX Familie Linden ux-20261023-c04396 in der Spalte Kunde. |
| Auftragssuche über Kundenname | Bestanden | Linden + Enter reduzierte die Liste von 20 auf 8 passende Aufträge. |
| Kundenakte: bestehende Anfragen und Aufträge | Bestanden | Familie Linden zeigt meine Anfrage INQ-2026-00005 sowie acht Aufträge mit Status und Zieltermin. |
| Kundenakte: bestehendes Angebot | Bestanden | Ein vorhandenes älteres Angebot TEST-AN/26/0034 erscheint verlinkt in der zugehörigen Kundenakte. Bei Linden zeigt Angebote korrekt den sichtbaren Leerzustand 0. |
| Gespeicherte eigene Änderungen im Verlauf | Teilweise / deutlich verbessert | Meine ursprüngliche Anfrage zeigt Anlage und zwei Änderungen mit meinem Namen, Zeitpunkt und Version. Eine neue Wunschänderung erzeugt ebenfalls einen Verlaufseintrag. Die konkreten geänderten Werte werden nicht angezeigt. |
| Einzige asynchrone Kundenauswahl, älterer Kunde | Bestanden | Im Feld Kunde liefert d13ecb58 einen Treffer UAT 2026-10-23 d13ecb58 Müller & Söhne; ArrowDown + Enter übernimmt ihn. Kein zweites Suchformular erforderlich und Anfrage wird dadurch nicht abgesendet. |
| Neuer Kunde innerhalb ausgefüllter Anfrage | Bestanden | Kunde angelegt und ausgewählt, während Vorhaben, Beschreibung und Wiedervorlage unverändert bleiben. Anschließend gespeichert und in der Akte bestätigt. |

## Tatsächlicher Ablauf und Evidenz

### Kundennamen und Suche in der Auftragsliste

Von Heute über **Alle Aufträge** geöffnet. Die bekannte Familie Linden steht nun mit Kundennummer und Name in der Liste. Ich gab **Linden** in **Aufträge durchsuchen** ein und drückte Enter. Sichtbar waren danach acht Einträge für die Familie statt zuvor zwanzig allgemeiner Einträge. Namen und Titel sind bei 1280 × 900 lesbar, auch über zwei Zeilen.

Route: /orders und /orders?q=Linden.

- [Kundennamen in der Auftragsliste](../evidence/office_b/office_b-01-kundennamen.png)
- [Acht Aufträge durch Suche nach Linden](../evidence/office_b/office_b-02-kundensuche-auftraege.png)

### Bestehende Vorgänge in der Kundenakte

Über Kunden & Projekte suchte ich Linden und öffnete **Verknüpfte Vorgänge**. Die Seite zeigte **Anfragen 1** mit meiner bestehenden Anfrage **UX office_b · Aufmaß abstimmen**, **Angebote 0** mit verständlichem Leerzustand und **Aufträge 8**. Die Aufträge sind über ihre Nummern zu öffnen und zeigen Bezeichnung, Status und Fälligkeitsdatum. Meine Anfrage ließ sich direkt aus der Kundenakte öffnen.

Da Linden keine vorhandenen Angebote meldet, öffnete ich zusätzlich über Büro ein älteres vorhandenes Angebot **UAT 2026-10-23 d13ecb58 Angebot / TEST-AN/26/0034** und daraus die zugehörige Kundenakte. Dort zeigte **Verknüpfte Vorgänge** genau dieses Angebot mit Nummer, Titel und Status Entwurf. Es wurde nur gelesen. Der synthetische Kundenname dieser zweiten Akte besteht selbst aus einer Kennung; ich leite daraus keinen erneuten Fehler der Namensauflösung ab.

Routen: /customers/f153569d-f1da-4202-bb7e-38b00b7fcfc9 und /customers/acbb8cba-0291-42b7-aecf-42bc738256f3.

- [Linden: Anfrage und Auftragsbereich](../evidence/office_b/office_b-03-kundenakte-vorgaenge.png)
- [Zweite Kundenakte mit vorhandenem Angebot](../evidence/office_b/office_b-05-kundenakte-angebot.png)

### Lesbarer Verlauf der eigenen Wunschänderungen

Die ursprüngliche Anfrage **INQ-2026-00005** zeigt nun drei lesbare Ereignisse: Anlage, Änderung Version 2 und Änderung Version 3, jeweils mit Zeitpunkt und **UX Nina Weber**. Enter auf **Verlauf** öffnet die Ansicht mit deutlich sichtbarem Fokusrahmen.

Ich prüfte zusätzlich eine neue Änderung in meiner frisch angelegten Nachtest-Anfrage: Beschreibung von **zunächst dunkler Stein** auf **Kundenwunsch geändert von dunklem auf hellen Stein** geändert und gespeichert. Im Verlauf erschien **Anfrage geändert**, Zeitpunkt 16:34, mein Name und **Version 2**, über der Anlage Version 1.

**Verbleibende Reibung, P3:** Der Verlauf sagt weiterhin nur, dass eine Anfrage geändert wurde. Ohne meine Erinnerung oder die aktuelle Beschreibung kann ich dort nicht erkennen, dass sich die Steinfarbe geändert hat, und den früheren Wortlaut nicht nachlesen. Ich erwartete bei einer Kundenrückfrage zumindest die geänderte Angabe oder einen verständlichen Vorher-/Nachher-Vergleich. Kein Blocker; der zuvor leere Verlauf ist behoben, die fachliche Nachvollziehbarkeit bleibt begrenzt.

Routen: /inquiries/69e17c84-e588-4c10-a424-e235b0ca3600 und /inquiries/41751e8e-47df-40d7-a630-aafee3a4040b.

- [Ursprüngliche eigene Anfrage mit drei Ereignissen](../evidence/office_b/office_b-04-bestehender-verlauf.png)
- [Neue Wunschänderung als Ereignis, ohne geänderte Feldwerte](../evidence/office_b/office_b-09-neue-wunschaenderung-verlauf.png)

### Älteren Kunden suchen, mit Tastatur übernehmen, dann neuen Kunden anlegen

Ich begann eine **neue Anfrage** und füllte zuerst aus:

- Vorhaben: **UX Nachtest office_b · Aufmaß mit neuem Kunden**
- Beschreibung: **UX Nachtest: Zwei Fensterbänke, zunächst dunkler Stein. Tiefe und Zugang zum Montageort fehlen. Vorhandene Eingaben beim Anlegen des Kunden behalten.**
- Wiedervorlage: **26.10.2026**

Dann öffnete ich **Kunde** und tippte **d13ecb58** direkt in dasselbe Feld. Nach dem Suchzustand wurde **1 Eintrag gefunden** mit **UAT 2026-10-23 d13ecb58 Müller & Söhne** angezeigt. Dieser ältere Kunde war in der beim Öffnen sichtbaren Anfangsliste nicht aufgeführt. **ArrowDown und Enter** übernahmen den Kunden; meine Anfrage blieb ungespeichert im Formular offen. Der Hinweis auf die Suche im gesamten freigegebenen Bestand war verständlich. Eine zweite Suchfläche musste ich nicht benutzen.

Danach öffnete ich **+ Neuen Kunden direkt anlegen**. Die kleine eingebettete Fläche hieß **Neuer Kunde · Anfrage bleibt erhalten**. Ich gab ein:

- Name: **UX Nachtest office_b · Familie Birke**
- E-Mail: **ux-nachtest-office-b@example.invalid**

Mit **Kunden anlegen & auswählen** wurde der neue Kunde ausgewählt und die eingebettete Fläche geschlossen. Vorhaben und Beschreibung waren unverändert; auch die Wiedervorlage blieb im Formular erhalten. Nach **Speichern** und Öffnen der neuen Anfrage waren alle drei Angaben sowie der neue Kundenbezug sichtbar. Es entstand **INQ-2026-00007**, Kunde **KD-2026-00052**. Die spätere Steinfarbenänderung betraf ausschließlich diesen eigenen Vorgang.

- [Einzelner Treffer für den älteren Kunden](../evidence/office_b/office_b-06-aelterer-kunde-suche.png)
- [Neuer Kunde ausgewählt, vorherige Beschreibung erhalten](../evidence/office_b/office_b-07-inline-kunde-erhalten.png)
- [Gespeicherte Anfrage mit Kundenbezug und Wiedervorlage](../evidence/office_b/office_b-08-anfrage-gespeichert.png)

## Abschluss und Grenzen

Angelegt wurden ein eigener synthetischer Kunde und eine eigene synthetische Anfrage mit Kennzeichnung **UX Nachtest**. Bestehende fremde Vorgänge wurden ausschließlich gelesen. Keine Freigabe, Nachricht, Bestellung, Zahlung oder sonstige verbindliche Aktion ausgelöst.

Die Prüfung belegt die sichtbaren Browserabläufe. Sie ist weder Source-Review noch Vollständigkeitsprüfung aller Datensätze. Kein KI-Nachtest und kein mobiler Nachtest in diesem Auftrag. Alle neun Screenshots wurden selbst angesehen; Kopien liegen neben diesem Bericht. Die ursprünglichen Study-Berichte wurden nicht geändert.

Der Hinweis auf mögliche automatische Reloads während der letzten Korrekturen kam nach Abschluss meines Browserdurchgangs. Ich habe kein ohne eigene Aktion geschlossenes Formular und keinen dadurch verlorenen Inhalt beobachtet; kein Befund dieses Berichts beruht auf einem solchen Ereignis.
