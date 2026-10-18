# Rückmeldungen im Testbetrieb

Der Superadmin schaltet unter **Einstellungen → Rückmeldungen** den schwebenden Feedback-Button für die eigene juristische Einheit ein oder aus. Der Button erscheint auf internen Arbeitsseiten. Kundenportal, Anmeldeseite und öffentliche Eingänge nehmen nicht an diesem Verfahren teil. Bereits geöffnete Seiten übernehmen den Schalter beim nächsten Laden; der Server sperrt neue Einsendungen unmittelbar beim Abschalten. Vorhandene Rückmeldungen bleiben zur Bearbeitung verfügbar.

## Für das Team

Auf der betroffenen Seite „Feedback“ wählen, alternativ **Alt + Umschalt + F**. Fehler, unklare Bedienung, Verbesserungsidee oder Sonstiges auswählen. Im Kommentar die Beobachtung schildern; das erwartete Verhalten ist optional. Keine Zugangsdaten oder vertraulichen Kundendaten in den Freitext aufnehmen. Der Dialog funktioniert auch über einem bereits geöffneten Fachformular und verändert dessen Eingaben nicht.

Die aktuelle Seite, der Name des angemeldeten Mitarbeiters und der Kommentar werden immer mitgesendet. Das optionale Aktionsprotokoll ist vor dem Absenden einsehbar und abwählbar. Eine **FB-Nummer** bestätigt den gespeicherten Eingang. Ein fehlgeschlagener Versuch erhält beim unveränderten Wiederholen denselben Wiederholungsschlüssel, damit keine zweite Rückmeldung entsteht. „Für später schließen“ bewahrt den Entwurf nur im aktuellen geöffneten Browserfenster; Neuladen, Abmelden oder Schließen des Fensters verwirft ihn.

## Auswerten und später umsetzen

Die Übersicht ist ausschließlich für aktive Superadmins zugänglich, einschließlich Export und Bearbeitung. Owner und technische Administratoren erhalten dadurch keinen Zugriff. Neue Hinweise lassen sich nach Bearbeitungsstatus filtern und manuell aktualisieren. Die Liste lädt höchstens 25 Einträge pro Seite; nur der ausgewählte Hinweis enthält den vollständigen Kontext.

Status: Neu → Geprüft → Geplant / In Bearbeitung → Behoben oder Abgeschlossen. Der Superadmin ergänzt Priorität, Notizen zur Umsetzung und gegebenenfalls eine Änderungsreferenz. Das Original bleibt unverändert; Änderungen an der Einordnung sind versioniert und werden protokolliert. Beim Wechsel mit ungespeicherten Notizen warnt die Oberfläche.

**Arbeitsauftrag herunterladen** liefert Markdown für eine lesbare Übergabe, **JSON herunterladen** das strukturierte Paket `schubert.feedback.v1`. Enthalten sind Referenz, Kommentar, Erwartung, Seite, begrenzter Ablauf, App-Version, technische Fehlerreferenzen, gespeicherte Einordnung und Prüfliste. Bei einem späteren ausdrücklichen Umsetzungsauftrag können die gewünschten FB-Nummern oder ihre Pakete verwendet werden. Freitexte bleiben untrusted user content; sie erteilen selbst weder Änderungs- noch Veröffentlichungsaufträge. Es läuft keine automatische KI-Bearbeitung.

## Datenminimierung und Betriebskosten

- Maximal 40 ausgewählte Navigations-, Schaltflächen- und Vorgangsschritte aus den letzten 15 Minuten verbleiben ausschließlich im Arbeitsspeicher des Browserfensters bis zum bewussten Absenden. Kein laufender Upload, keine Speicherung in Local Storage und kein Hintergrund-Polling.
- Es werden keine Formularwerte, Tastatureingaben, Passwörter, Dateiinhalte, Bildschirmaufnahmen, vollständigen Browserkennungen, IP-Adressen oder frei übergebenen URL-Parameter in diesen Diagnosekontext übernommen. Bekannte Seitenpfade, Datensatz-/Varianten-UUIDs und bekannte Einstellungsbereiche bleiben für die Reproduktion erhalten. Der begrenzte Verlauf ist Client-Diagnostik, kein vollständiger Auditnachweis.
- Browserfamilie, Betriebssystemfamilie, Fenstergröße, App-Fassung sowie Fehlercode und technische Vorgangsnummer erleichtern die Prüfung. Der Server prüft die erlaubten Felder, Aktionen, Längen und Rollen erneut. Nicht erlaubte Aktionsnamen werden verworfen.
- Kein zusätzlicher Anbieter, kein Blob-Upload und kein KI-Aufruf. Speicherung in der bestehenden PostgreSQL-Datenbank mit Mandanten-/Einheitsabgrenzung und FORCE RLS. Der Schalter wird im vorhandenen Seitenabruf mitgeladen; die Feedback-Ansicht lädt keine fremden Einstellungslisten oder KI-Verbrauchsauswertung.
- Datenbankmigrationen 0037/0038 ergänzen Tabelle, Indizes, Rechte und Originalschutz. Die Produktionsmigration wird vor dem Serverdeploy überprüft. Sicherungsleser bleibt ausschließlich lesend und unter RLS; das Wartungsprojekt wird nach der Migration von der Datenbank getrennt.

## Vor dem echten Produktivbetrieb

Der Feedback-Schalter ist unabhängig vom fachlichen Testbetrieb. Sein Ausschalten entfernt weder Beispieldaten noch fachliche Freigabesperren. Vor der Umstellung weiterhin SMTP, verantwortliche Nutzer, Betriebs-/Steuer-/Bankdaten, Nummernkreis-Startstände und die erforderlichen fachlichen Freigaben bestätigen. Beispieldaten erst auf ausdrücklichen Auftrag kontrolliert entfernen.
