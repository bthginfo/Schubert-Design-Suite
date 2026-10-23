> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Nutzertest superadmin_b – David Scholl

23.10.2026, etwa 13:15–13:23 UTC. Simulierte Rolle: Benutzerverwaltung und Backofficeunterstützung im deutschen Steinmetzbetrieb, kein Entwickler. Hauptansicht 1280 × 900; ergänzender Sichttest bei 390 × 844. 74 Browserbefehle, darunter etwa 46 Bedienhandlungen; weitere Befehle dienten Inspektion und Evidenz. Browser geschlossen.

## Zielstatus

| Ziel | Status | Tatsächliches Ergebnis |
| --- | --- | --- |
| G1: Einen fiktiven Office-Benutzer anlegen | Erreicht | `UX superadmin_b Demo`, `ux-superadmin-b@example.invalid`, mit vorausgewählter Rolle „Büro“ angelegt. Zufällige lange initiale Passphrase verwendet und mit eigenem Passwort bestätigt. Die App meldete die erfolgreiche Anlage und bat um Übermittlung der Zugangsdaten auf dem betrieblich vorgesehenen Weg. Keine Nachricht gesendet. |
| G2: Gezielten Bibliothekszugriff und Mitarbeitereinbindung prüfen | Teilweise erreicht | Am eigenen neuen Zugang ausschließlich „Herstellerbibliothek verwalten · Dateien, Nutzungszwecke und Studiozuordnung“ ergänzt, begründet und bestätigt. Erneutes Öffnen zeigte Version 2, unveränderte Office-/Büro-Rolle und angehakte Bibliotheksfähigkeit. Die Auswahl dieses Zugangs im Beschäftigtenformular funktionierte. Das Beschäftigtenprofil ließ sich mit dem angezeigten Pflichtumfang nicht speichern; nach einem weiteren Versuch mit Beschäftigungsbeginn blieb dieselbe allgemeine Fehlermeldung. Ungespeicherte Eingaben anschließend ausdrücklich verworfen. |
| G3: Herstellerbibliothek und Integrationsstatus finden | Erreicht | Bibliothek über die Hauptnavigation, Dienste über Administration → Integrationen gefunden. Status und konkrete Einrichtungswege für E-Mail/OpenAI verständlich. Anschlussweg für mehrere technische Dienste blieb unklar; siehe F3. Keine Integration geändert und keinen kostenpflichtigen Test gestartet. |

## Wichtigste Befunde

### F1 · P2 · Beschäftigtenformular nennt nach fehlgeschlagener Anlage kein zu korrigierendes Feld

**Erwartung vor dem Speichern:** Das einzige mit Stern markierte Feld „Bezeichnung“ genügt für ein minimales Profil. Die ausgewählte Benutzer-ID verbindet es mit der Anmeldung; optionale Beschäftigungsdaten können später ergänzt werden.

**Beobachtung:** Unter Team → Beschäftigter anlegen trug ich Bezeichnung, geschäftliche E-Mail, den eigenen neuen Zugang und ein eigenes Testteam ein. Speichern zeigte „Eingaben prüfen. Erforderliche Werte fehlen oder sind ungültig.“ Die Werte blieben erhalten. Der anschließende Versuch mit „Beschäftigt ab“ am 23.10.2026 ergab dieselbe Meldung. Auch im unteren Formularteil war kein konkreter Feldfehler zu sehen. Wochenstunden, Arbeitswoche, Feiertagsregion und Urlaub waren nicht als Pflichtfelder gekennzeichnet und blieben leer.

**Auswirkung:** Die Mitarbeitereinbindung blieb unvollständig. Ich wusste nicht, welchen Wert ich berichtigen oder ergänzen sollte. Die tatsächliche Ursache des Speicherns konnte ich aus der Oberfläche nicht bestimmen.

**Empfehlung:** Ungültige Felder benennen und direkt markieren. Wenn zusätzliche Angaben für ein Profil notwendig sind, diese vor dem Speichern als Pflichtumfang ausweisen.

Route: `/team`. Evidenz: [Fehlermeldung und ausgefüllter Pflichtumfang](../selected/superadmin_b-F1-0010-1792761568362.png), [unterer Formularteil ohne Feldhinweis](../selected/superadmin_b-F1-0011-1792761599534.png). Vertrauen: hoch für die beobachtete Rückmeldung; keine Aussage zur technischen Ursache.

### F2 · P2 · Zugangsliste erzwingt lange Wege zum Finden und Bearbeiten

**Erwartung:** Einen gerade angelegten Mitarbeiter schnell finden und seinen gezielten Zugriff direkt an dessen Eintrag bearbeiten können.

**Beobachtung:** „Persönliche Zugänge“ zeigte knapp 50 Einträge als hohe Kartenliste. Ein lokales Such- oder Filterfeld war nicht sichtbar. Der neue Zugang wurde alphabetisch weit unten einsortiert. „Rolle prüfen“ öffnete den Änderungsbereich unter der gesamten Liste; zum Bearbeiten musste ich weiter nach unten. Bei 390 Pixel Breite stand auch „Zugang gezielt anlegen“ erst hinter allen Zugangskarten. Einzelne „Rolle prüfen“-Schaltflächen brachen mobil ungünstig über drei Zeilen um.

**Auswirkung:** Wiederkehrende Verwaltung benötigt viel Scrollen. Nach dem Wechsel zwischen Liste, Änderung und Anlage geht der Zusammenhang mit dem ausgewählten Zugang leichter verloren.

**Empfehlung:** Lokale Suche und eine gut sichtbare Aktion zum Anlegen ergänzen; ausgewählten Zugang und Änderungsformular räumlich zusammenhalten oder direkt zum Formular führen.

Route: `/settings?tab=users`. Evidenz: Desktopliste und Anlage (`evidence/superadmin_b/0003-1792761369584.png`), eigener neuer Eintrag weit unten (`evidence/superadmin_b/0005-1792761425636.png`), Änderung unter der Liste (`evidence/superadmin_b/0006-1792761439993.png`), mobile Liste (`evidence/superadmin_b/0018-1792761758221.png`), mobile Anlage hinter der Liste (`evidence/superadmin_b/0019-1792761766433.png`). Vertrauen: hoch.

### F3 · P3 · Für gesperrte technische Dienste fehlt ein verständlicher Anschlussweg

**Erwartung:** Als administrativer Nutzer erkennen, welche Einrichtung ich selbst vornehmen kann und wen ich für die übrigen Voraussetzungen brauche.

**Beobachtung:** Die Dienstübersicht zeigte PostgreSQL als „Verfügbar“ und sechs weitere Dienste als „Gesperrt“. Für E-Mail und OpenAI gab es Einrichtungslinks, Formulare und verständliche Erläuterungen. Bei privatem Dateispeicher, Dateiprüfung und exaktem 3D-Rendering standen dagegen nur Texte wie „Privater Virenprüfer noch einzurichten“ oder „Isolierter Dokument-/Blender-Worker noch einzurichten“. Im geprüften Bereich fand ich dafür keinen Einrichtungslink oder zuständigen Ansprechpartner. Die kontextuelle Hilfe lieferte zur Suche „Dateispeicher“ 0 Anleitungen und empfahl allgemein die Weitergabe an den Superadmin – meine eigene Rolle.

**Auswirkung:** Die Nichtverfügbarkeit war sichtbar, aber als David konnte ich den nächsten organisatorischen Schritt für diese Dienste nicht selbst bestimmen.

**Empfehlung:** Je Dienst einen verständlichen nächsten Schritt nennen, beispielsweise erforderliche IT-Zuständigkeit und benötigte Informationen. E-Mail/OpenAI können als Vorbild dienen.

Routen: `/settings?tab=integrations`, `/help?from=settings&tab=integrations`. Evidenz: Dienststatus und Einrichtungshinweis (`evidence/superadmin_b/0016-1792761676709.png`), Hilfesuche ohne Treffer (`evidence/superadmin_b/0017-1792761721672.png`). Vertrauen: hoch für die geprüften Ansichten.

## Stärken und weitere Beobachtungen

- „Zugänge & Rollen“ unter Administration ist gut verständlich. „Büro“ ist sinnvoll vorausgewählt; Mindestlänge der initialen Passphrase und eigene Passwortbestätigung sind klar benannt.
- Die gezielte Bibliotheksfähigkeit beschreibt Dateien, Nutzungszwecke und Studiozuordnung. Sie lässt sich einzeln vergeben, ohne die globale Rolle zu erweitern. Grund, Passwort und bewusste Bestätigung begleiten die Änderung; die App bestätigt deren Protokollierung.
- Im Beschäftigtenformular wird die Trennung von Anmeldung und Beschäftigtenprofil erklärt. Trotz des technischen Labels „Benutzer-ID“ kann der Zugang anhand seines Namens ausgewählt werden. Der E-Mail-Hinweis erklärt ausdrücklich, dass noch keine Nachricht versendet wird.
- Tab brachte den Fokus von der eigenen Passwortbestätigung auf „Persönlichen Zugang anlegen“; der Fokus war sichtbar, Enter startete die Anlage erfolgreich. Escape im ungespeicherten Beschäftigtenformular führte zum Schutz vor Datenverlust; die Eingaben mussten bewusst verworfen werden.
- Die Herstellerbibliothek erläutert Original, Studiozuordnung sowie getrennte Planvorlagen-/KI-Nutzung in drei kurzen Schritten. „Zugriff vergeben“ führt nachvollziehbar zur Zugangseinstellung. Bibliotheksansicht (`evidence/superadmin_b/0015-1792761664349.png`).
- Die Rollenansicht verwendet neben „Büro“ auch „Aktuell Office“. Das ist eine kleine sprachliche Inkonsistenz; sie hinderte die Vergabe nicht.
- Desktopansichten sind gut lesbar und primäre Aktionen grün hervorgehoben. Mobil sind Navigation und Einstellungswahl kompakt; die lange Zugangsliste bleibt dort die wesentliche Hürde.

## Umgebung und Werkzeuggrenzen – keine Produktdefekte abgeleitet

- Privater Dateispeicher, Archiv, E-Mail, OpenAI, Dateiprüfung und 3D-Rendering waren laut Oberfläche nicht eingerichtet. Deren tatsächliche Verarbeitung, Antwortqualität und Verfügbarkeit wurden nicht getestet. Keine Schlüssel eingegeben, keine Einstellungen gespeichert, keine Testmail oder kostenpflichtige Anfrage ausgelöst.
- Die CLI lieferte nach Navigation mehrfach noch die vorherige Ansicht bzw. einen Ladezustand. Nachfolgende Inspektionen bestätigten die Zielseite. Ein begrenzter Gesamtsnapshot schnitt Dialoginhalte hinter langen Listen ab; gezielte Dialoginspektion und selbst angesehene Screenshots klärten den Zustand.
- Klick-Timeouts auf die Hintergrundnavigation entstanden während sichtbarer Onboarding-/Formulardialoge bzw. der Rückfrage zu ungespeicherten Eingaben. Diese Timeoutmeldungen allein wurden nicht als Appfehler gewertet. Ein Suchfeld im Hintergrund konnte vom Werkzeug gefüllt werden, obwohl der Dialog noch offen war; daraus leite ich keine menschlich erreichbare Bedienbarkeit ab.
- Das Werkzeug maskierte Passwortfelder in Screenshots. Die eigene zufällige initiale Passphrase erschien jedoch einmal im Accessibility-Snapshot der CLI. Der Wert wird hier nicht wiedergegeben; weitere betroffene Ausgaben wurden vor Anzeige maskiert. Dies ist eine Grenze des Testwerkzeugs, kein beobachteter Zugriff durch andere Nutzer.
- Native Datumsfelder zeigten `mm/dd/yyyy`; da die Browser-Ländereinstellung nicht geprüft oder geändert wurde, wird dies als mögliche Umgebungseinwirkung separat festgehalten. Die eingetragene Datumsangabe wurde im Formular als 2026-10-23 bestätigt.

Es wurde genau ein eigener Benutzer angelegt. Nur dessen zusätzliche Bibliotheksfähigkeit wurde geändert. Das Beschäftigtenprofil wurde nicht erfolgreich gespeichert; der offene Formularentwurf wurde verworfen. Andere Testpersonen, Rechte, Integrationen und Geschäftsdaten blieben unangetastet.
