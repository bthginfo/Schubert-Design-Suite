> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# office_b · Backoffice · 23.10.2026

Simulierter Black-box-Nutzertest als **UX Nina Weber**, 26, seit zwei Wochen im Backoffice. Desktop **1280 × 900**. Beginn 2026-10-23T12:45:17Z, Ende 2026-10-23T12:52:58Z. Etwa 62 Browserbefehle einschließlich Sichtungen und Neustart; aktive Sitzung etwa fünf Minuten. Keine Anwendungssourcen, APIs oder Datenbanken gelesen. Keine Nachricht oder Freigabe ausgelöst. Browserkontext geschlossen.

## Ziele und tatsächliches Ergebnis

| Ziel | Status | Ergebnis |
| --- | --- | --- |
| G1: Kunde und offene Vorgänge/Unterlagen | Teilweise | Familie Linden gefunden; Stammdaten und 0 direkt verknüpfte Dokumente gesehen. Keine brauchbare Übersicht der bestehenden Vorgänge in der Kundenakte. Auftragssuche nach Linden ergab 0 Treffer. |
| G2: Eigene Anfrage, Wiedervorlage, Wunschänderung | Erreicht | **UX office_b · Aufmaß abstimmen**, **INQ-2026-00005**, erstellt. Wiedervorlage **26.10.2026**. Dunkler Stein in der Beschreibung zu **hellem Stein** geändert und beim Wiederöffnen bestätigt. |
| G3: KI-Rückfrage | Blockiert durch Umgebung | Zweck und Eingabeumfang sichtbar geprüft. OpenAI-Projekt, Modell und Budget fehlen; Aktion deaktiviert. Keine KI-Ausgabe erzeugt und keine Antwortqualität behauptet. |
| G4: Wiederfinden, Korrektur, Tastatur | Erreicht | Suche nach UX office_b mit Enter ergab 1 Eintrag. Montgeort zu Montageort korrigiert; Version 3 sichtbar. Tab, Escape und Enter verwendet; Verlauf per Enter geöffnet. |

Eigener Vorgang: `/inquiries/69e17c84-e588-4c10-a424-e235b0ca3600`. Kunde: `/customers/f153569d-f1da-4202-bb7e-38b00b7fcfc9`.

## Die wichtigsten Beobachtungen

### office_b-F1 · P2 · Kundenakte listet unter „Verknüpfte Vorgänge“ keine Vorgänge

**Meine Erwartung:** In der Kundenakte wollte ich erkennen, welche offenen Anfragen oder Aufträge für die Aufmaß-Rückfrage relevant sind.

**Tatsächliche Schritte:** Kunden & Projekte → Kunden durchsuchen → Familie Linden → Enter → Kundenakte → Verknüpfte Vorgänge. Ich prüfte außerdem Übersicht und Dokumente. Anschließend legte ich aus der Übersicht eine eigene Anfrage mit dem vorausgefüllten Kunden an. Aus der Anfrage kehrte ich über den Kundenlink zurück und öffnete Verknüpfte Vorgänge erneut.

**Wirkung:** Der Reiter zeigte jeweils nur „Verknüpfungen über die Angaben öffnen“ und den allgemeinen Hinweis, verknüpfte Angaben aus der Übersicht zu öffnen. Die neue Anfrage erschien ebenfalls nicht. Die Kundenübersicht zeigte Stammdaten und Neuanlegen-Aktionen; eine Liste bestehender Vorgänge fand ich nicht. Als neue Mitarbeiterin musste ich in andere Listen wechseln, ohne bereits einen Überblick zu haben.

Route: `/customers/f153569d-f1da-4202-bb7e-38b00b7fcfc9`. Beobachtung sicher. Eine Vorgangsliste mit Art, Titel, Status und nächstem Schritt würde mir hier helfen.

Evidenz: [Kundenübersicht](../selected/office_b-F1-0001-1792759601008.png), [Verknüpfte Vorgänge nach eigener Anfrage](../selected/office_b-F1-0007-1792759721924.png).

### office_b-F2 · P2 · Auftragsliste zeigt Kennungen; „Linden“ findet nichts

**Meine Erwartung:** Die Spalte Kunde sollte den Namen zeigen. Über „Aufträge durchsuchen“ wollte ich Kundenaufträge mit „Linden“ finden.

**Tatsächliche Schritte:** Aus der Kundenakte Aufträge geöffnet, Spalte Kunde angesehen, Linden eingegeben und Enter gedrückt. Danach Filter zurücksetzen verwendet.

**Wirkung:** „Heute“ hatte bereits mehrere Entwurfsaufträge mit Familie Linden als Kunde gezeigt. Die allgemeine Liste zeigte bei denselben Titeln unter Kunde dagegen `f153569d-f1da-4202-bb7e-38b00b7fcfc9`. Die Namenssuche ergab „0 Einträge / Keine passenden Einträge“. Nach Zurücksetzen waren 20 Einträge sichtbar. Eine lange Kennung hilft mir bei einer Rückfrage am Telefon nicht; auch dieser Weg lieferte mir keinen Kundenüberblick.

Routen: `/orders`, `/orders?q=Linden`. Beobachtung sicher. Kundennamen anzeigen und bei der Suche berücksichtigen; Suchumfang verständlich beschreiben.

Evidenz: [Keine Treffer für Linden](../selected/office_b-F2-0008-1792759739377.png), [Kennungen unter Kunde](../selected/office_b-F2-0009-1792759751742.png).

### office_b-F3 · P3 · Verlauf zeigt meine gespeicherten Änderungen nicht

**Meine Erwartung:** Beim Nachsehen wollte ich die Änderung des Kundenwunschs und meine spätere Korrektur mit Zeitpunkt nachvollziehen.

**Tatsächliche Schritte:** Eigene Anfrage mit dunklem Stein gespeichert, auf hellen Stein geändert, später erneut gesucht und den Tippfehler korrigiert. Die Übersicht zeigte danach Version 3. Verlauf mit Enter geöffnet und nochmals angesehen.

**Wirkung:** „Nachvollziehbarer Verlauf“ zeigte „Noch kein sichtbarer Verlauf“ sowie „Geschäftliche Änderungen und Freigaben werden mit dem jeweiligen Stand dokumentiert“. Ich konnte den aktuellen Inhalt prüfen, aber den früheren Wunsch nicht über diese Ansicht nachvollziehen. Ob Entwurfsänderungen absichtlich ausgenommen sind, blieb offen. Ich behaupte keinen Verlust interner Protokolle.

Route: `/inquiries/69e17c84-e588-4c10-a424-e235b0ca3600`. Beobachtung sicher, Interpretation mit mittlerer Sicherheit. Änderungsverlauf zeigen oder den begrenzten Umfang erklären.

Evidenz: Version 2 (`evidence/office_b/0006-1792759705820.png`), Version 3 mit Korrektur (`evidence/office_b/0010-1792759780926.png`), Leerer Verlauf und Tastaturfokus (`evidence/office_b/0011-1792759799724.png`).

## KI und Umgebung ausdrücklich getrennt

**office_b-E1 · Umgebungslimit:** In Anfrage bearbeiten → Entwurf mit KI prüfen stand „OpenAI-Projekt, Modell und Kostenbudget noch einzurichten“; „Eingaben prüfen“ war deaktiviert. Es gab daher keinen Entwurf zu bewerten.

Vor einem möglichen Start erklärt die Oberfläche: „Die KI prüft Ihre aktuellen Eingaben und formuliert Rückfragen. Sie speichern den Entwurf anschließend selbst.“ Unter „Diese Angaben werden übermittelt“ nennt sie **Vorhaben, Beschreibung und den Ausfüllstand der Grundangaben**. Sie sagt ausdrücklich, dass **interne Einzelkosten und andere Akten nicht übermittelt werden**. Das war für mich verständlich. Ich konnte nur diese UI-Aussage prüfen, keine tatsächliche Datenübermittlung. Keine KI-Ausgabe ungeprüft übernommen, keine Nachricht verschickt.

Evidenz: KI-Umfang und fehlende Einrichtung (`evidence/office_b/0005-1792759699220.png`).

Nach der ersten Einstiegssichtung war der Browser-Broker mit ECONNREFUSED nicht erreichbar. Der Parent stellte ihn wieder her; ich begann erneut mit start. Das war ein Harness-Neustart ohne verlorene Formulareingaben und wird nicht als Produktfehler gezählt.

## Was gut funktionierte

- Aus der Kundenakte wurde der Kunde in der neuen Anfrage sichtbar vorausgefüllt. Keine doppelten Stamm- oder Kontaktdaten nötig.
- Das Formular erklärt Pflichtfelder und dass beim Anlegen erst Speichern Daten übernimmt. Nur Vorhaben war erforderlich. Ein Speicherversuch ohne Vorhaben ließ das Formular offen; die genaue native Validierungsmeldung habe ich nicht gesichert.
- Escape bei offenen neuen Eingaben zeigte deutlich „Weiter bearbeiten“ und „Ungespeicherte Eingaben verwerfen“. Weiterbearbeiten behielt meine Eingaben.
- Beim Bearbeiten erklärt die App automatisches Speichern. Nach der Wunschänderung stand „Vom Server bestätigt gespeichert“. Wiederöffnen bestätigte den Inhalt.
- Titelbasierte Suche reagiert auf Enter und fand meinen Vorgang eindeutig. Enter auf Verlauf funktionierte; der Fokusrahmen war gut sichtbar.
- Kundenakte und Anfrage waren bei 1280 × 900 gut lesbar gegliedert. Primäre Aktionen, Reiter und aktueller Status waren erkennbar. Die Formularfußzeile hielt Speichern und Schließen erreichbar.

Evidenz: Einstieg mit Einführung (`evidence/office_b/0001-1792759520088.png`), Schutz offener Eingaben (`evidence/office_b/0003-1792759634329.png`), Automatische Speicherung (`evidence/office_b/0004-1792759671467.png`), Gespeichertes Ergebnis (`evidence/office_b/0010-1792759780926.png`).

## Grenzen

Ein simulierter Test einer Rolle, keine echte menschliche Nutzerforschung und kein Code- oder Sicherheitsreview. Die Kundenakte meldete 0 direkt verknüpfte Dokumente; daraus leite ich keinen Dokumentverlust ab. Nicht alle vorhandenen Kundenaufträge oder Unterlagen einzeln geöffnet. Keine mobile Nutzung geprüft, da der Brief Desktop vorsah.

Das Datumsfeld zeigte im Browserformular 10/26/2026 und mm/dd/yyyy, die Akte korrekt 26.10.2026. Die Browser-Lokalisierung habe ich nicht separat verifiziert; deshalb kein bestätigter Produktbefund. Tastatureingaben für Datum erfolgten im technischen Browserwerkzeug als ISO-Wert, die fachliche Absicht war der 26.10.2026.

Nur die eigene Anfrage wurde geändert. Sie bleibt im Status Neu mit Wiedervorlage 26.10.2026, hellem Stein und korrigierter Beschreibung. Keine Aufgaben anderer Nutzer, Stammdaten oder vorbereiteten Geschäftsvorgänge verändert.
