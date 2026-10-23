> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest finance_a – Buchhaltung

Karin, 51, erfahrene Buchhalterin im deutschen Steinmetzbetrieb. App-Zugang UX Karin Beck / Finanzen. Test am 23.10.2026, Desktop 1440 × 1000. Rund neun Minuten Browserinteraktion, ungefähr 73 Browseraktionen einschließlich Orientierung, Inspektion und Evidenz; Browser geschlossen. Reiner Black-box-Test, keine echte menschliche Nutzerstudie.

## Zielstatus

| Ziel | Status | Tatsächliches Ergebnis |
|---|---|---|
| G1 – Offene Posten und Beispielrechnung | Teilweise | Offene Forderungen und Zahlungen gefunden, jeweils leer. Vorhandenen Entwurf mit 238,00 € brutto gelesen. Ausgestellt-Filter: 0 Einträge; kein ausgestelltes Original vergleichbar. |
| G2 – Eigener Eingangsrechnungsentwurf | Teilweise | Lieferant UX finance_a Steinhandel als LF-2026-00001 angelegt, sichtbarer Status Aktiv. Rechnungsformular TEST-2026-A mit eigenem Auftrag und Position tatsächlich ausgefüllt. Pflichtoriginal wegen fehlendem Dateispeicher nicht hochladbar, daher keine Eingangsrechnung gespeichert. |
| G3 – Summen, Belegbezug, Ergänzen und KI | Teilweise | Vorschau korrekt: 700,00 € netto, 133,00 € USt, 833,00 € brutto. Fehlendes Original konkret markiert. KI-Kontext geprüft, Start mangels Konfiguration deaktiviert. |

## Die drei wichtigsten Befunde

1. **P1 · Umgebung: Upload blockiert die Entwurfsspeicherung.** Nach Auswahl des eigenen synthetischen PDF und „Privat hochladen“ meldet die App „Privater Dateispeicher ist noch nicht eingerichtet. Die übrigen Funktionen bleiben verfügbar.“ Ein späterer Speicherversuch markiert Original als ungültig. Ich erwartete einen speicherbaren Entwurf samt Originalbezug. Die Buchungsvorbereitung bleibt in dieser Umgebung unvollständig. Dies ist ein Konfigurationslimit, kein belegter Speicherimplementierungsfehler. Evidenz: Uploadmeldung (`evidence/finance_a/0003-1792760557878.png`), Pflichtfeld nach Speichern (`evidence/finance_a/0007-1792760793467.png`).
2. **P2 · Produkt: Die leere Auftragsauswahl erklärt den Bestand irreführend.** Zunächst steht „Noch kein Eintrag auswählbar. Legen Sie die zugehörigen Stammdaten zuerst an.“ Die anschließende Suche „UX finance_a“ findet den vorbereiteten Auftrag „UX finance_a · Badumbau Testweg“, der sich auswählen lässt. Ich erwartete einen Suchhinweis statt einer Aufforderung zur Stammdatenanlage. Der Text erzeugt einen unnötigen Zweifel an vorhandenen Daten und könnte zur Doppelanlage verleiten. Broker-Evidenz: erstes Eingangsrechnungsformular → zweite Suche „Name oder Belegnummer“ → „Suchen“ → Auftragsoption.
3. **P2 · Produkt: Pflichtoriginal verlangt einen Bereichswechsel ohne erkennbaren Aufnahmeweg im Formular.** Die Liste erklärt „Original zuerst hochladen“, doch die Hauptaktion führt in ein Formular mit Pflichtfeld Original. Dort sehe ich vorhandene Dateiauswahl und Suche, keine Upload-Aktion oder Dokumenteneingangsverknüpfung. Ich breche das noch leere Formular ab, öffne „Dokumente“ über die Hauptnavigation und kehre später zurück. Ich erwartete die erforderliche Aufnahme unmittelbar am Ablauf. Im Test entstand dadurch ein Umweg, kein Datenverlust. Ein Aufnahmeweg mit Rückkehr zum ungespeicherten Entwurf würde helfen. Evidenz: Original-Auswahl im Brokerprotokoll, Originalfeld (`evidence/finance_a/0007-1792760793467.png`).

## Weitere Beobachtungen

- **P3 · Produkt:** Im Ausgangsrechnungsfilter stehen „Entwurf“, „validated“ und „Ausgestellt“. Ich muss die englische Prüfphase aus dem Ablauf ableiten. Ein verständlicher deutscher Status wäre konsistenter.
- **P3 · Produkt:** Die Beispielrechnung zeigt den Auftrag in „Angaben im Überblick“ nur als nicht verlinkte UUID `9dfa9edb-ff2e-49b3-9a7f-c94347bafdad`. Der Kunde hat dagegen einen lesbaren Link. Dadurch ist der Auftrag in dieser Übersicht fachlich nicht wiedererkennbar. Andere Register wurden dafür nicht geprüft. Evidenz: Rechnungsdetail (`evidence/finance_a/0002-1792760386856.png`).
- **P2 · Umgebung:** „Eingaben prüfen“ ist deaktiviert. „OpenAI-Projekt, Modell und Kostenbudget noch einzurichten“ erklärt dies verständlich. Keine KI-Anfrage oder Antwortqualität geprüft. Die übermittelten Angaben lassen sich vorher aufklappen: Bezeichnung, Währung, eine Position und Ausfüllstand der Grundangaben. Die manuelle Entscheidung über Speichern ist klar. Evidenz: KI-Kontext und Summen (`evidence/finance_a/0006-1792760763301.png`).

## Tatsächlicher Arbeitsweg und Erwartungen

- Einstieg: Einführung sichtbar, für später geschlossen. Dashboard weist 0,00 € bestätigte offene Forderungen aus. Der Einstieg und die modale Einführung sind gut lesbar; die Aufmerksamkeitstexte enthalten synthetische technische Testinhalte, die ich nicht weiter untersuchte. Einstieg (`evidence/finance_a/0001-1792760322724.png`).
- Von „Offene Forderungen 0,00 €“ zur Rechnungsliste. Den Statusfilter auf „Ausgestellt“ angewendet: 0 Einträge. Zurückgesetzt und erste vorhandene Beispielrechnung geöffnet.
- Entwurf gelesen: Status und Belegstatus „Entwurf“, Ausgabe „Ausstehend“, Versand „Noch nicht übergeben“, Zahlung „Offen“. Die Trennung der Zustände ist sichtbar; „Offen“ am Entwurf ist keine von mir bestätigte fällige Forderung. Die eigentliche Forderungsübersicht ist leer und erklärt das Erscheinen bestätigter Einträge. Keine Ausgabe oder Prüfung an dieser fremden Beispielrechnung ausgelöst.
- Über Zahlungen und „Alle Bereiche“ die offenen Forderungen gefunden, danach „Einkauf & Lager“. Eigenen Lieferanten mit Name und Typ Organisation gespeichert. Das Lieferantenformular nennt den Typ dabei „Kundentyp“; die Auswahl selbst war verständlich. Tastaturversuch: Tab nach Namenseingabe, Enter an der Kombobox öffnete die Auswahl; später Escape schloss die Originaldateiauswahl.
- „Rechnungseingang“ über „Alle Bereiche“ geöffnet. Erstes noch leeres Rechnungsformular wegen Pflichtoriginal abgebrochen. Eigene harmlose PDF `work/ai-usability/synthetic/finance_a-TEST-2026-A.pdf` erstellt: ausdrücklich synthetischer Testbeleg, TEST-2026-A, 23.10.2026, 2,5 m² Naturstein zu 280,00 € netto, 19 % USt, 833,00 € brutto. Tatsächlichen Upload versucht; Konfigurationslimit erhalten.
- Erneut dasselbe eigene Rechnungsformular erfasst: „UX finance_a · Naturstein TEST-2026-A“, Lieferant, Belegnummer TEST-2026-A, Belegart Rechnung, EUR, Rechnungsdatum 23.10.2026, netto 700,00, Steuer 133,00, brutto 833,00. Auftrag über Suche gefunden und ausgewählt.
- Eine Position „UX finance_a · Naturstein für Badumbau“, Menge 2,5, Einheit m², Einzelpreis 280,00 und Steuer 19 eingegeben. Vorschau stimmt mit eigener Rechnung überein. Die Kopfbeträge müssen zusätzlich manuell eingegeben werden; eine Abweichung wurde nicht getestet. Kein serverseitig gespeicherter Summenstand vorhanden.
- KI-Bereich und übertragenen Kontext aufgeklappt, Deaktivierungsgrund gelesen. Speichern genau einmal versucht: führt zum fehlenden Original zurück, konkrete Feldmeldung. Anschließend Abbrechen; „Ungespeicherte Eingaben“ bietet Fortsetzung oder bewusstes Verwerfen. Eigene ungespeicherte Eingaben verworfen, Liste bleibt leer. Browser geschlossen.

## Was gut funktioniert

Die deutsche Dezimaleingabe und die transparenten Positionssummen funktionieren. Die feste Fußleiste hält Speichern und Abbrechen auch im langen Formular erreichbar. Die getrennte Statuskarte erleichtert die Rechnungskontrolle. Fehlendes Original wird am Feld markiert. Die KI erklärt den Umfang und die manuelle Speicherung, bevor eine Anfrage überhaupt möglich wäre. Der Verwerfendialog schützt ausgefüllte Formulare vor beiläufigem Schließen.

## Grenzen und verbleibender Zustand

Kein ausgestellter oder bezahlter Fall im sichtbaren Bestand; keine Aussage über deren vollständige Verarbeitung. Kein erfolgreicher Originalupload, keine gespeicherte Eingangsrechnung und keine KI-Antwort. Nur Desktop geprüft.

Der Browserbefehl konnte ein natives Datumsfeld nicht mit `23.10.2026` füllen („Malformed value“); der technisch nötige ISO-Wert `2026-10-23` funktionierte. Das ist eine Grenze des Eingabewerkzeugs, kein belegter Appfehler. Ein nicht gefundener zusammengezogener KI-Text wurde nach Inspektion durch den tatsächlichen sichtbaren Text erfolgreich geklickt; ebenfalls kein Produktbefund.

Zurück bleibt genau ein eigener synthetischer Lieferantenstammsatz „UX finance_a Steinhandel“ / LF-2026-00001. Die PDF liegt nur lokal, der Upload war erfolglos. Keine Rechnung ausgegeben, keine Zahlung gebucht oder zugeordnet, keine Freigabe oder Stornierung ausgelöst. Die vollständig eingegebenen, wegen Original nicht speicherbaren Rechnungsangaben wurden nach gesicherter Evidenz verworfen.
