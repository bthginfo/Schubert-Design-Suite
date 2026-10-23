> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest hr_b – Personalverwaltung

Jonas, 30, neu in der Anwendung; angemeldet als **UX Jonas Frank**. Testtag 23.10.2026, Deutschland; Desktop 1280 × 900. Browserinteraktion ca. 13:11–13:16 UTC, 50 Aktionen. Anschließend Browserkontext geschlossen. Das ist eine simulierte Black-box-Perspektive, keine menschliche Nutzerforschung.

| Ziel | Ergebnis |
|---|---|
| G1 – Eigene Bürozeit von gestern | Erreicht: 22.10.2026, 09:00–10:00 ohne Pause und ohne Auftrag gespeichert; nach Navigation weiter vorhanden. |
| G2 – Prüfablauf und Sperren | Erreicht: Stelle zur Prüfung gefunden, eigenen Tag eingereicht, eigene Freigabe gesperrt, Korrektursperre und Rückgabehinweis nachvollzogen. Keine fremde Abgabe freigegeben. |
| G3 – Abwesenheiten und eigener Antrag | Erreicht: Übersicht und Formular gefunden; Urlaub gewählt und Eingaben anschließend verworfen. Kein Antrag gespeichert. |

Die Einführung ließ sich gezielt auf „Den Arbeitstag erfassen“ stellen. Von dort öffnete ich „Zeit nachtragen“. Meine Erwartung war, Büroarbeit ohne erfundenen Kundenauftrag erfassen und danach den Text kontrollieren zu können. Ich trug die gestrige Stunde, keine Pause und einen mit **UX hr_b** gekennzeichneten synthetischen Büroarbeitsgrund ein. Auftrag war ohne Pflichtstern; die Auswahl bot nur „Zuordnung offen“. Speichern funktionierte und zeigte eine klare Erfolgsmeldung.

Danach blieb zunächst der heutige leere Tagesverlauf sichtbar. Erst mit „Tag auswählen“ auf 22.10. erschien die Stunde. Im Tagesverlauf stand „Allgemeines“. Mit „Tag prüfen & abgeben“ wollte ich die abschließende Prüfung nachvollziehen; der Klick reichte den Tag direkt ein. „Eingereicht Version 2“ und die Sperre waren gut sichtbar. Die Erklärung, dass eine zuständige andere Person eine Abgabe für Änderungen zurückgeben muss, war verständlich. Weiter unten fand ich „Zeiten sachlich prüfen“. Meine eigene Abgabe stand dort mit deaktiviertem „Abgabe prüfen“ und dem Hinweis „Eigene Abgaben genehmigt eine andere Person“. Diese Grenze habe ich respektiert.

Für Abwesenheiten öffnete ich „Alle Bereiche“ und „Urlaub & Abwesenheit“. Auch „Eigene Anträge“ im Zeitkonto war als Weg erkennbar. Die kompakte Hauptnavigation wirkte für Personal passend. Das Antragsformular erklärte persönliche Zuordnung, einschließlich letztem Tag und halbem Urlaubstag mit 0,5 Tagen. Ich wählte nur die Art Urlaub und verwarf die Änderung über die verständliche Warnung vor ungespeicherten Eingaben. Bestätigte Arbeitstage oder Anspruchsdaten habe ich nicht geraten.

Die wichtigsten Befunde:

1. **hr_b-F1, P2 – Tätigkeit/Nachtragsgrund nur im technischen Vollnachweis lesbar.** Tagesverlauf, Zuordnung und normaler Originalnachweis zeigten „Allgemeines“. Der konkrete Pflichttext war erst nach zwei Aufklappschritten in einem rohen JSON-Block unter „notes“ zu finden. Er ging nicht verloren, war aber für meine fachliche Kontrolle schlecht auffindbar. Erwartung: beschrifteter Klartext bei der Sitzung. Belege: Eingabe (`evidence/hr_b/0002-1792761142774.png`), normaler Nachweis (`evidence/hr_b/0003-1792761179388.png`), JSON mit gespeichertem Text (`evidence/hr_b/0004-1792761194400.png`).
2. **hr_b-F2, P3 – „Tag prüfen & abgeben“ eröffnet keinen weiteren Prüfschritt.** Der Klick reichte unmittelbar ein und sperrte Korrekturen. Die Beschriftung enthält zwar „abgeben“; als Neuling erwartete ich trotzdem eine letzte gemeinsame Sicht auf Zeitraum, Tätigkeit und Folgen. Die Sperre selbst ist nachvollziehbar. Eine eindeutigere Direktaktionsbeschriftung und ein vorab sichtbarer Sperrhinweis würden helfen. Belege: Sperrhinweis (`evidence/hr_b/0003-1792761179388.png`), eigene Prüfung gesperrt (`evidence/hr_b/0005-1792761211562.png`).
3. **hr_b-F3, P3 – Zeitraum fehlt in den sichtbaren Spalten der Abwesenheitsübersicht.** Vorhanden waren Nummer, Mitarbeiter, Status und Zuletzt geändert, nicht Von/Bis oder Art. Zum Überblick „wer fehlt wann“ wäre der Zeitraum wichtiger. Die Tabelle war leer; die Darstellung vorhandener Zeilen bleibt ungetestet, daher mittlere Sicherheit. Belege: Formular mit Zeitraum (`evidence/hr_b/0006-1792761269890.png`), leere Übersicht mit Spalten (`evidence/hr_b/0007-1792761298641.png`).

Ein weiterer kleiner Befund (**hr_b-F4, P3**): Die kontextbezogene Hilfe war erreichbar, aber ihre häufigen Fragen begannen mit Inschrift, Steinformen, Planungsstudio und Lieferplatten. „abgeben“ lieferte keinen Treffer; „Zeit“ zeigte hauptsächlich Timer/Nachtrag/Offline-Verhalten. Den Zusammenhang von Einreichen, Prüfen und Rückgabe verstand ich durch die Hinweise auf der Zeitseite besser. Beleg ist das automatisch gespeicherte eigene Aktionsprotokoll der Hilfe- und Suchschritte.

Positiv waren klare Erfolgsmeldungen, ein nach Navigation weiter vorhandener eigener Zeiteintrag, nachvollziehbare Freigabegrenzen und gut lesbare Dialoge. Escape schloss die geöffnete Auftragsauswahl; Tab führte sichtbar zum Tätigkeitsfeld mit deutlichem Fokus. Mindestens drei relevante Screenshots wurden tatsächlich angesehen: Einstieg, Nacherfassung, Sperre/Nachweis und Abwesenheiten.

Umgebungs- und Prüfgrenzen: Die nativen Datumsfelder zeigten englische Datumsreihenfolge bzw. AM/PM; die fertigen Zeitnachweise waren deutsch. Die Browser-Lokalisierung wurde nicht verändert, daher keine eindeutige Produktzuordnung. Anfangssaldo und Urlaubsanspruch waren nicht hinterlegt. Es gab keine fremden Abgaben zur Durchsicht; ich habe weder Freigaben noch eine endgültig genehmigte Sperre praktisch geprüft. Die Abwesenheitsübersicht war leer und es wurde kein Antrag gespeichert. Keine Rechts-/Anspruchswerte ergänzt, keine KI gestartet, kein Mobiltest. Alle Ziele waren nach etwa fünf Minuten Browserzeit erreicht; es wurde keine künstliche Testdauer erzeugt.

Die vollständig strukturierten Ziele, Schritte, Erwartungen, Auswirkungen und Grenzen stehen in [hr_b.json](hr_b.json). Weitere Belege: Einstieg (`evidence/hr_b/0001-1792761079788.png`), erneut sichtbarer gestriger Eintrag (`evidence/hr_b/0008-1792761370182.png`).
