# Abschließender Employee-/HR-Prüffall · employee_b

**23.10.2026, ca. 15:21–15:23 UTC · UX Jan Richter, Montagehelfer · 390 × 844.** Unabhängiger simulierter Testnutzer, nur eigene Browser-ID `employee_b`, 29 UI-Aktionen. Keine APIs, Datenbank oder Appquellen benutzt. Alle drei unten verwendeten Screenshots tatsächlich angesehen. Keine Genehmigung oder Löschung. Browser am Ende geschlossen.

## Ergebnis

| Prüfschritt | Ergebnis |
| --- | --- |
| Eigener Nachtrag mit eigener Tätigkeit und getrenntem Anlass | **Bestanden.** Gespeichert für 22.10.2026, 14:00–14:30, Auftrag AUF-2026-00014 · UX employee_b · Montage Testweg, Tätigkeit Montage. Getrenntes Pflichtfeld „Anlass der Nacherfassung / Hinweis“ nimmt den vollständigen Testgrund auf. |
| Eigene Tagesprüfung vor Einreichung | **Bestanden.** Drei beendete Sitzungen; Arbeit 04:35:00 und Pausen 00:25:00. Die vorhandenen Sitzungen 08:00–11:30 und 12:00–13:00 blieben erhalten. Der neue halbstündige Zeitraum überschneidet sie nicht. |
| Tatsächliche Tagesabgabe | **Bestanden.** Erst „Tag prüfen & abgeben“, danach gesondert „Tag verbindlich einreichen“. UI bestätigt „Der Tag wurde zur Prüfung eingereicht“, alle drei Sitzungen danach Eingereicht, Version 2. Keine HR-Freigabe erfolgt. |
| Korrekturantrag unmittelbar nach Einreichung | **Fachlich gesperrt und verständlich erklärt.** „Korrektur beantragen“ ist deaktiviert. Der Hinweis sagt, dass die zuständige Person den eingereichten Stand zuerst mit einer Rückfrage zurückgeben muss. Nicht umgangen; kein Korrekturantrag angelegt und keine Endzeit verändert. |
| Eigener synthetischer Abwesenheitsantrag | **Gespeichert.** Art Sonstiges, von/bis 26.10.2026, ein ausdrücklich beantragter Arbeitstag, Status Beantragt, Version 1. Persönliche Zuordnung zu UX Jan Richter erfolgt ohne manuelle Mitarbeiterauswahl. Kein bestätigter Urlaub oder tatsächliches Arbeitsmodell behauptet. |

## Angelegte Prüffälle für HR

Der neue Nachtrag trägt den Anlass:

> UX Releaseprüfung employee_b · Nachtrag wegen fehlender Netzverbindung; rein synthetischer Test, keine echte Arbeitsleistung.

Der vollständige eigene Tag vom 22.10.2026 ist jetzt für HR zur sachlichen Prüfung eingereicht. [Tatsächlich betrachtete mobile Prüfzusammenfassung](../evidence/employee_b/0001-1792768901620.png). Die Zusammenfassung zeigt lesbare Karten und einen festen, erreichbaren Footer. Die konkrete Anzeige des Anlasses beim HR-Zugang wurde von mir nicht geprüft.

Der Abwesenheitsantrag mit Referenz `ef164c7f-f15a-40b7-8106-ab9977b1d67c` enthält:

> UX Releaseprüfung · synthetische Abwesenheit, nicht genehmigen. Ein ausdrücklich beantragter Testtag; kein bestätigter Urlaubsanspruch und keine echte Abwesenheit.

Er ist beantragt, nicht genehmigt. Keine Urlaubsbuchung bestätigt.

## Neu beobachtete kleine Darstellungsfehler

Die mobile Abwesenheitskarte verwendet die rohe UUID als Hauptüberschrift. Darunter sind Sonstiges und zweimal 26.10.2026 sichtbar, jedoch weder der Beschäftigtenname noch die beantragte Tagesmenge. Für die Wiedererkennung als Mitarbeiter ist die Überschrift unverständlich. [Mobile Übersicht](../evidence/employee_b/0003-1792768974457.png).

Die geöffnete Detailakte verwendet dieselbe UUID als großes H1. Im Angabenbereich stehen der richtige Mitarbeiter, Art, Zeitraum und Hinweis; die Tagesmenge erscheint als technischer String **1.000000**. [Detailakte](../evidence/employee_b/0004-1792769001565.png). Beide Beobachtungen wurden dem Parent unmittelbar gemeldet, keine Datenkorruption daraus abgeleitet.

## Grenzen

Der Korrekturvergleich wurde wegen der regulären Einreichungssperre nicht erreicht. Eine andere zuständige Person müsste den Tag erst mit Rückfrage zurückgeben; eine eigene Prüfung oder Genehmigung wäre fachlich falsch und wurde nicht versucht. HR muss getrennt prüfen, ob der Anlass und der Abwesenheitsfall dort lesbar ankommen. Keine Behauptung zu echter KI oder einem realen Arbeits-/Urlaubsanspruch.

Ein Locatorversuch für „Notizen“ traf sowohl den Formularabschnitt als auch das Textfeld. Nach Verwendung der tatsächlich sichtbaren Textbox-Rolle ließ sich der Hinweis normal eintragen. Das ist ein Harness-Locatorproblem und kein Produktfehler. Alle bestehenden Testdaten bleiben erhalten, kein Timer wurde gestartet.

## Letzter Nachtest nach Korrekturen · 23.10.2026, etwa 15:35–15:37 UTC

Erneut ausschließlich als employee_b über die mobile sichtbare UI auf 390 × 844. Der Parent kündigte einen korrigierten stabilen Build an und teilte mit, HR habe den synthetischen Tag vom 22.10.2026 mit Rückfrage zurückgegeben. Dies war im eigenen Zugang tatsächlich als **„Rückfrage offen“** mit konkreter Bitte zur Prüfung des letzten Nachtrags sichtbar. Die früheren Beobachtungen oben bleiben als damaliger Stand erhalten.

| Abschlusspunkt | Ergebnis |
| --- | --- |
| Regulärer Korrekturantrag nach Rückgabe | **Bestanden.** Nur die eigene Sitzung 22.10.2026, 14:00–14:30 geöffnet, Ende auf 14:35 geändert. Das vorhandene Arbeitsintervall folgte automatisch auf 14:35, ohne neue Pause. Original-Anlass blieb vollständig unverändert. Separater Korrekturgrund „UX Releaseprüfung · synthetischer Korrekturvergleich, Ende plus5Minuten“. Nach „Antrag einreichen“ bestätigt die App den gespeicherten Korrekturantrag. |
| Erhalt des Originals | **Im eigenen sichtbaren Stand bestätigt.** Die Originalüberschrift bleibt 14:00–14:30, Beendet, Version 3; darunter neuer Korrekturantrag Beantragt mit dem genannten Grund. Keine Genehmigung, keine erneute Tagesabgabe für 22.10.2026. |
| Neuer eigener Nachweis mit neuem Anlass | **Gespeichert und eingereicht.** Am zuvor sichtbar leeren 21.10.2026 neuer Zeitraum 14:00–14:10, Montage, gleicher eigener Auftrag, keine Pause. Anlass „UX Releaseprüfung · neuer Nachweis mit gebundenem Nachtragsanlass; keine echte Arbeitsleistung“. Eigene Zusammenfassung nennt korrekt 00:10:00 Arbeit und 00:00:00 Pause. Erst nach deren Ansicht separat verbindlich zur HR-Prüfung eingereicht; Sitzung danach Eingereicht, Version 2. |
| Korrigierte Abwesenheitsübersicht | **Bestanden.** Überschrift „UX Jan Richter · Sonstiges“, Status Beantragt, Von/Bis jeweils 26.10.2026, Arbeitstage 1. Alle Angaben auf der ersten mobilen Karte lesbar. UUID nicht mehr als Titel sichtbar. |
| Korrigierte Abwesenheitsdetailakte | **Bestanden.** H1 ebenfalls „UX Jan Richter · Sonstiges“, Menge als 1 statt 1.000000, persönliche Zuordnung und ursprüngliche Notiz unverändert. Nur gelesen. |

Tatsächlich betrachtete Belege: [Korrekturantrag vor Einreichung](../evidence/employee_b/0001-1792769765713.png), [neue Prüfzusammenfassung 21.10.](../evidence/employee_b/0002-1792769802740.png), [korrigierte Abwesenheitskarte](../evidence/employee_b/0003-1792769820843.png), [korrigierte Detailakte](../evidence/employee_b/0004-1792769833479.png).

Beide neuen HR-Prüffälle wurden sofort dem Parent gemeldet. Die tatsächliche HR-Ansicht und Übernahme des neuen Anlasses sind nicht Teil meiner Employee-Rolle; hierfür bleibt die getrennte HR-Prüfung erforderlich. Keine andere Person, keine genehmigte Originalzeit und kein Urlaubsanspruch verändert. Der bereits vorhandene Abwesenheitsantrag bleibt unberührt, keine neue Abwesenheit angelegt. Browser abschließend geschlossen.

**Kleine verbleibende Sprachungenauigkeit P3:** Bei genau einer Sitzung beziehungsweise einem Intervall lautet die Prüfzusammenfassung „1 beendete Sitzungen“ und „1 Intervalle · 1 Arbeitszuordnungen“. Zahlen und Daten stimmen; Singularformen würden die Oberfläche sprachlich abrunden. Kein Blocker oder fehlender fachlicher Nachweis daraus abgeleitet.
