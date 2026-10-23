> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest office_a

Sabine, 54, erfahrene Bürokraft im deutschen Steinmetzbetrieb. Aufgabe: einen Kundenanruf aufnehmen und bis zum Angebotsentwurf bearbeiten. Black-box-Test am 23.10.2026, Desktop 1440 × 1000. Keine echte menschliche Nutzerstudie.

Erster gesicherter Screenshot: 12:45:08 UTC; Abschlussdokumentation: 2026-10-23T12:56:58Z. Rund 86 Browserbefehle einschließlich Inspektionen, Screenshots, Harness-Unterbrechung und abschließendem Schließen; circa 60 eigentliche Bedienhandlungen.

## Zielstatus

| Ziel | Status | Nachgewiesener Stand |
| --- | --- | --- |
| G1 Kunde und Anfrage | Erreicht | Familie Sommer mit Adresse, Telefon und E-Mail erfasst; telefonische Anfrage für zwei helle Naturstein-Fensterbänke und Wunschtermin 02.11.2026 gespeichert. |
| G2 Angebotsentwurf | Erreicht | Zwei Positionen gespeichert, Status Entwurf. Material 700,00 € und Montage 130,00 € netto; 830,00 € netto, 157,70 € USt. im offenen Formular, 987,70 € brutto. |
| G3 KI und Zwischenstand | Teilweise | KI im offenen Formular untersucht, wegen fehlender Einrichtung nicht startbar. Eigene Beschreibung und nachvollziehbare Notiz gespeichert; Angebot nach einem Umweg über die Bürosuche wiedergefunden. |

Gespeicherte eigene Objekte:

- Kunde **UX office_a Familie Sommer**, **KD-2026-00051**: http://127.0.0.1:5173/customers/11bea9e6-e01c-46e2-855f-c4aec1f857cf
- Anfrage **UX office_a Zwei Fensterbänke aus hellem Stein**, **INQ-2026-00006**: http://127.0.0.1:5173/inquiries/5447cec8-5e19-47fc-82fa-8f719893e1c2
- Angebot **UX office_a Fensterbänke Familie Sommer**, **TEST-AN/26/0191**: http://127.0.0.1:5173/quotes/12dbd1cc-86b4-429c-a539-02293f1239c5

Kein Angebot wurde versendet, veröffentlicht, zur Prüfung gegeben oder verbindlich freigegeben.

## Wichtigste Befunde

### office_a-F1 · P2 · Produkt: „Verknüpfte Vorgänge“ führt in der Kundenakte nicht zu den gespeicherten Vorgängen

**Erwartung:** Beim Rückruf von Familie Sommer wollte ich über deren Akte zur soeben gespeicherten Anfrage und zum Angebotsentwurf gelangen.

**Schritte:** Kunde speichern → aus der Kundenakte Anfrage anlegen → daraus Angebot für den vorausgewählten Kunden anlegen und speichern → im Angebot den Kunden öffnen → „Verknüpfte Vorgänge“ wählen → „Zur Übersicht“ wählen.

**Beobachtung:** Die Registerkarte zeigte ausschließlich „Verknüpfungen über die Angaben öffnen“, einen allgemeinen Hinweis auf Kunde/Auftrag/Lieferant und „Zur Übersicht“. Keine Anfrage und kein Angebot waren dort aufgeführt. In der Übersicht gab es nur die Aktionen zum **Anlegen** neuer Vorgänge. Beide eigenen Vorgänge existierten und zeigten vorher die richtige Kundenzuordnung.

**Auswirkung:** Ich musste ins Büro wechseln und nach dem Angebotsnamen suchen. „UX office_a“ plus Enter lieferte einen Eintrag; darüber konnte ich den Entwurf wieder öffnen. Das Wiederfinden über die Kundenakte blieb erfolglos.

**Anregung:** Bestehende Anfragen und Angebote in der Kundenakte mit Status und Öffnen-Link zeigen oder direkt in passende gefilterte Listen führen.

Evidenz: Kundenakte ohne Vorgangsliste (`evidence/office_a/0009-1792759927588.png`), erfolgreicher Suchumweg (`evidence/office_a/0010-1792759956741.png`), wieder geöffneter gespeicherter Stand (`evidence/office_a/0011-1792759976570.png`). Beobachtete Route: http://127.0.0.1:5173/customers/11bea9e6-e01c-46e2-855f-c4aec1f857cf. Sicherheit: hoch.

### office_a-F2 · P3 · Produkt: Neue Anfrage mit einem neuen Kunden erfordert einen Navigationswechsel

**Erwartung:** Der Startseitenlink „Eine neue Anfrage aufnehmen“ sollte mich während des ersten Anrufs zur Erfassung führen, einschließlich eines neuen Kunden oder eines deutlichen Hinweises auf die richtige Reihenfolge.

**Schritte:** „Eine neue Anfrage aufnehmen“ → „Anfrage anlegen“ → Auswahl „Kunde“ öffnen → abbrechen → „Kunden“ → „Kunde anlegen“ → gespeicherten Kunden öffnen → „Anfrage anlegen“.

**Beobachtung:** Im Anfragedialog waren nur bestehende Kunden wählbar. Der Hinweis lautete „Wählen Sie den Auftraggeber aus den bestehenden Kunden“. Eine sichtbare Kundenneuanlage aus diesem Dialog fand ich nicht. Über die separat angelegte Kundenakte funktionierte der Ablauf einschließlich vorausgewähltem Kunden.

**Auswirkung:** Ein zusätzlicher Wechsel während des Telefonats. Kein beobachteter Datenverlust: Der erste Anfragedialog war noch leer.

**Anregung:** „Kunde neu anlegen“ aus der Kundenauswahl anbieten oder die Reihenfolge für neue Kunden direkt am Anfrageeinstieg erklären.

Evidenz: Broker-Aktionsprotokoll unter `work/ai-usability/evidence/office_a/` mit der Folge Anfrage anlegen → Kunde (41 bestehende Einträge) → Abbrechen → Kunden → Kunde anlegen; Einstieg (`evidence/office_a/0001-1792759508249.png`) und Kundenakte mit Folgeaktionen (`evidence/office_a/0001-1792759670106.png`). Beobachtete Route: http://127.0.0.1:5173/inquiries. Sicherheit: hoch.

### office_a-F3 · P2 · Umgebung: KI im ungespeicherten Angebotsformular nicht eingerichtet

**Erwartung:** Eine kurze kundenfreundliche Beschreibung aus den noch nicht gespeicherten Angaben erstellen lassen und vor Übernahme prüfen.

**Schritte:** Titel und beide Preispositionen erfassen, noch nicht speichern → „Entwurf mit KI prüfen“ öffnen → „Diese Angaben werden übermittelt“ öffnen.

**Beobachtung:** Der Helfer beschreibt eine Prüfung der aktuellen Eingaben mit Rückfragen. Die Kontextauskunft nennt **Titel, Belegwährung und 2 von 2 Positionen**, außerdem den Füllstand der Grundangaben. Sie schließt interne Einzelkosten und andere Akten ausdrücklich aus. „OpenAI-Projekt, Modell und Kostenbudget noch einzurichten“ war sichtbar; „Eingaben prüfen“ war deaktiviert.

**Auswirkung:** Keine KI-Anfrage und keine KI-Beschreibung. Ich habe eine eigene Beschreibung sowie die Zwischenstandsnotiz manuell ergänzt und gespeichert. Antwortqualität, tatsächlicher Kontexttransport und Übernahme einer generierten Beschreibung sind nicht beurteilbar. Die Nichtverfügbarkeit wurde vor dem Start verständlich angezeigt.

Für einen weiteren KI-Test muss die Umgebung eingerichtet sein. Ob der Formularhelfer über Prüfung/Rückfragen hinaus eine freie Kundenbeschreibung formuliert, wurde nicht verifiziert.

Evidenz: offenes Angebot mit Summen, angekündigtem Kontext und deaktivierter KI-Aktion (`evidence/office_a/0006-1792759830976.png`). Route: http://127.0.0.1:5173/quotes?customer_id=11bea9e6-e01c-46e2-855f-c4aec1f857cf. Sicherheit: hoch. **Umgebungslimit, kein nachgewiesener Produktdefekt.**

## Was im Arbeitsablauf gut funktionierte

- Deutsche Eingaben **2,5**, **280,00** und **65,00** wurden angenommen und richtig berechnet. Die gespeicherten Zeilen zeigten 700,00 € und 130,00 € netto bei jeweils 19 %.
- Der offene Entwurf zeigte 830,00 € netto, 157,70 € Umsatzsteuer und 987,70 € brutto gut sichtbar nebeneinander. Der gespeicherte Leistungsumfang bestätigte Netto und Brutto.
- Die Folgeaktionen aus der Kundenakte übernahmen die Kundenzuordnung und zeigten sie am Formularkopf.
- „Speichern“, der sichtbare Status „Entwurf“ und der Hinweis zur gesonderten Veröffentlichung machten den Zwischenstand nachvollziehbar.
- Escape schloss die Einführung. Die Angebotssuche mit Enter funktionierte.
- Die Desktopansichten waren gut lesbar; Überschrift, Status und Stammdaten waren klar gegliedert. Im großen Angebotsdialog blieben Überschrift und Speichern sichtbar. Die Positionserfassung war dichter als die Kundenakte, aber bedienbar.

## Evidenz und Grenzen

Selbst visuell betrachtet wurden Einstieg, Kundenakte, Positionserfassung, KI-Hürde, gespeichertes Angebot und die leere Verknüpfungsansicht. Besonders relevant:

- Einführung vor der Startseite (`evidence/office_a/0001-1792759508249.png`)
- Arbeitsansicht Positionserfassung (`evidence/office_a/0003-1792759759608.png`)
- KI-Hürde und aktuelle Summen (`evidence/office_a/0006-1792759830976.png`)
- Gespeicherter Angebotsentwurf (`evidence/office_a/0008-1792759892859.png`)
- Hürde in „Verknüpfte Vorgänge“ (`evidence/office_a/0009-1792759927588.png`)
- Wiedergefundenes Angebot mit Leistungsumfang (`evidence/office_a/0011-1792759976570.png`)

Zu Beginn fiel der gemeinsame Broker aus. Der Parent stellte ihn wieder her; danach war der Browser leer und ich startete neu. Vorher waren keine Formulardaten erfasst. Die Unterbrechung wird als Harness-Grenze behandelt. Ein erster Linkversuch wurde vom Einführungsmodal abgefangen; der Locator-Timeout ist kein Produktfehler.

Die Eingabe `02.11.2026` wurde vom Browserwerkzeug für ein natives Datumsfeld mit „Malformed value“ abgewiesen. Über `2026-11-02` ließ sich derselbe Termin erfassen; die gespeicherte Oberfläche zeigte **02.11.2026**. Daraus folgt keine Aussage über die Datumseingabe eines deutschen Menschen.

Nur der Formularhelfer wurde auf KI geprüft; allgemeiner Assistent und KI-Ausgaben wurden nicht getestet. Keine Aussage zur mobilen Bedienbarkeit. Keine Anwendungssourcen, APIs, Datenbanken, privaten Dateien oder fremden Berichte gelesen. Nur eigene markierte synthetische Objekte geändert.
