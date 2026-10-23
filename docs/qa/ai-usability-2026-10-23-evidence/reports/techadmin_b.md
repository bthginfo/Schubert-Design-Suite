> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Nutzertest techadmin_b – technische Administratorin

Dana, 27, neu im Betrieb; sichtbarer Name „UX Dana Kern“, Rolle „Technik“. Simulierter Black-box-Test am 23.10.2026, etwa 13:24–13:30 UTC / 15:24–15:30 Uhr Deutschland. Beginn anhand des ersten gesicherten Screenshots, Anmeldung wenige Sekunden davor. Desktop 1280 × 900, ergänzend Mobilansicht 390 × 844. Rund 60 Browserbefehle einschließlich Einstieg, Inspektionen, Screenshots und Abschluss; Browser geschlossen. Die Richtdauer von 10–15 Minuten wurde unterschritten.

**Ergebnis:** Alle drei Ziele teilweise erreicht. Fehlende KI- und Speicheranbindung waren erkennbar und eine konkrete Supportfrage ließ sich sicher formulieren. Für einen eigenständigen technischen Überblick und die Diagnose einer Jobakte fehlten mir Informationen beziehungsweise ein erreichbarer Einstieg.

| Ziel | Status | Tatsächlich erreicht / offen |
| --- | --- | --- |
| G1: Integrations-/Systemstatus | Teilweise | KI-Chat nennt fehlendes OpenAI-Projekt, Modell und Kostenbudget. Dokumentjobs nennen fehlenden privaten Dateispeicher. Ein zusammenhängender System-/Integrationsüberblick war über die angebotene Navigation nicht auffindbar. |
| G2: Protokolle, Jobdetails, sichere Supportfrage | Teilweise | Nicht verfügbare Jobs gefiltert und Akte gelesen. Kein technisches Protokoll gefunden. Feedbackentwurf mit Zustandsbezug formuliert, Kontextvorschau gelesen, nicht gesendet. |
| G3: Erreichbare Bereiche und sinnvolle Rechtehinweise | Teilweise | Heute, Verarbeitung, eigener Zugang und Hilfe erreichbar. FAQ erklärt rollenabhängige Sichtbarkeit und nennt Superadmin. Kontaktadresse fehlt. Keine Sperrseite über sichtbare Links erreicht; korrekte Rechtevergabe und Durchsetzung nicht verifiziert. |

## Ablauf und überprüfbare Evidenz

1. Anmeldung mit Browser-ID `techadmin_b`, Viewport eingestellt, Einführung betrachtet. Die kurze Tour erklärt freigegebene Bereiche und sagt, dass keine Geschäftsdaten verändert werden. Tab ausprobiert; „Weiter“ gezielt per Enter ausgelöst und Schrittwechsel kontrolliert. Einstieg (`evidence/techadmin_b/0001-1792761860332.png`)
2. Nach Abschluss der Einführung „Administration“ gewählt. Erwartung: technische Einstellungen oder Überblick. Tatsächlich öffnet sich ausschließlich „Verarbeitung“ mit Suchfeld, Statusfilter und Jobliste.
3. „Status filtern“ → „Nicht verfügbar“ → „Anwenden“. Ergebnis: 14 Einträge, darunter Berichtsexporte und Angebots-PDFs. Hinweis: „Privater Dateispeicher ist noch nicht eingerichtet. Die übrigen Funktionen bleiben verfügbar.“ Gefilterte Liste (`evidence/techadmin_b/0002-1792761913159.png`)
4. Berichtsexport vom 23.10.2026, 15:21 geöffnet. Übersicht, Verlauf, verknüpfte Vorgänge und Dokumente gelesen. Später die bereits beobachtete Jobadresse erneut geöffnet; die Übersicht blieb leer. Kein Job neu gestartet. Jobübersicht (`evidence/techadmin_b/0003-1792761926900.png`)
5. Feedback an der Jobakte geöffnet, „Mitgesendeten Kontext ansehen“ aufgeklappt, Supportfrage im Kommentar formuliert und per Escape geschlossen. Nicht gesendet. Supportentwurf (`evidence/techadmin_b/0006-1792761999586.png`)
6. Assistent geöffnet: Seitenhilfe gelesen, anschließend Chat, „Unterlagen & Modell“ und Kostenrahmen geprüft. Keine KI-Anfrage gestartet; Eingabe und Senden waren deaktiviert. Assistent mit Einrichtungsverweis (`evidence/techadmin_b/0007-1792762032815.png`)
7. „Hilfe zu dieser Seite“ geöffnet. FAQ „Warum sehe ich einen Bereich nicht?“ gelesen. Hilfesuchen „Integration“ und „System“ ohne Treffer; „Betrieb“ lieferte Hinweise zum Testbetrieb und Feedback.
8. „Meine Einstellungen“ geöffnet: eigener Zugang mit Profil, Passphrase und Darstellung, keine Betriebseinstellungen. Ansprechpersonenkarte meldet fehlende Kontaktadresse. Keine Eingaben oder Änderungen im Profil. Persönlicher Zugang (`evidence/techadmin_b/0008-1792762089510.png`)
9. Zur Verarbeitung zurück, „Fehlgeschlagen“ gefiltert: 0 Einträge, verständlicher Rückweg „Filter zurücksetzen“. Es war deshalb kein tatsächlicher fehlgeschlagener Job zu bewerten.
10. Mobilansicht geprüft. „Mehr“ öffnet Navigation, Escape schließt sie mit sichtbarem Fokus. Karten sind grundsätzlich lesbar; der Assistent liegt am unteren Rand teilweise über einem langen Hinweis, weitere Inhalte sind scrollbar. Mobile Navigation (`evidence/techadmin_b/0009-1792762145895.png`), mobile Verarbeitung (`evidence/techadmin_b/0010-1792762159035.png`)
11. Desktop wiederhergestellt, bekannte Jobakte und Seitenhilfe erneut geöffnet, letzte Evidenz gesichert, Browser geschlossen. Seitenhilfe (`evidence/techadmin_b/0011-1792762192920.png`)

## Drei wichtigste Produktbefunde

### techadmin_b-F1 · P2 · Jobakte verliert die Diagnose aus der Liste

**Beobachtung:** Unter `/jobs/934f6e82-257a-41ac-85ad-301d71eea7f6` zeigt die Übersicht nur „Aktueller Stand: Nicht verfügbar“ und eine große leere Fläche. In der Liste waren Fehlerhinweis, ein Versuch und Zeitpunkt sichtbar. „Verlauf“ meldet „Noch kein sichtbarer Verlauf“. „Verknüpfte Vorgänge“ verweist auf Angaben in der leeren Übersicht. „Dokumente“ meldet „Dokumentübersicht hier nicht geladen“ und verweist auf einen Dokumentbereich, ohne einen Einstieg anzubieten. Die prominente Aktion ist „Erneut ausführen“; deren Verhalten wurde nicht geprüft.

**Erwartung vor dem Öffnen:** Fehlergrund, Zeitpunkt, Versuche, technischer Verlauf und ein sicherer nächster Prüfschritt.

**Auswirkung / Interpretation:** Für die Supportfrage muss ich die Listeninformationen erinnern oder zurückgehen. Die Akte hilft mir nicht bei der technischen Eingrenzung. Hohe Sicherheit der Beobachtung, keine Aussage über intern gespeicherte Daten.

**Empfehlung:** In der Jobübersicht mindestens den vorhandenen Listenhinweis erhalten und den technischen Verlauf oder seine Nichtverfügbarkeit konkret erklären. Evidenz: gefilterte Liste, Jobübersicht und spätere Seitenhilfe oben.

### techadmin_b-F2 · P2 · Kein auffindbarer Systemüberblick für den technischen Zugang

**Beobachtung:** Desktop und mobile Navigation bieten Heute, Administration, Meine Einstellungen und Hilfe. Administration führt zur Jobliste; Meine Einstellungen zum eigenen Zugang. Der KI-Sperrhinweis nennt „Betriebseinstellungen“, ohne einen Link dorthin. Hilfesuche „Integration“ und „System“ liefert keine passende Anleitung. FAQ nennt den Superadmin für zusätzliche Rechte. Die Kontaktadresse ist laut Zugang nicht hinterlegt.

**Erwartung:** Die Konfigurationszustände von KI, Dokumenten und Betrieb lesend zusammenfinden oder einen eindeutigen Rollen- und Kontaktweg erhalten.

**Auswirkung / Interpretation:** Der Einrichtungsstand wird nur über einzelne Fehlzustände verständlich. Ich weiß nicht, ob mir ein Überblick fehlt, mein Zugang nicht dafür vorgesehen ist oder ein anderer Einstieg existiert. Mittlere Sicherheit: Die Nichtauffindbarkeit wurde beobachtet; die Existenz für andere Rollen ist unbekannt.

**Empfehlung:** Lesenden technischen Überblick anbieten oder die Zugangsgrenze mit präziser Rollenbezeichnung und erreichbarer Ansprechperson erklären. Die tatsächlich fehlende Kontaktadresse ist zusätzlich ein Einrichtungszustand. Evidenz: Jobübersicht, Assistent, persönlicher Zugang und mobile Navigation.

### techadmin_b-F3 · P3 · Seitenhilfe beschreibt die Tagesübersicht

**Beobachtung:** Der Begleiter nennt die aktuelle Seite „Verarbeitung“. „Hilfe für diese Seite“ erklärt unter „Diese Seite verstehen“ dennoch „Ihre Tagesübersicht bündelt anstehende Aufgaben, Termine und Aufträge“, gefolgt von allgemeinen Navigations- und Speicherhinweisen. Die gesonderte Hilfeseite erwähnt „Erneut ausführen“, erklärt aber keine Statusunterschiede oder Diagnose.

**Erwartung:** Bedeutung von „Nicht verfügbar“ gegenüber „Fehlgeschlagen“ und einen passenden Diagnoseweg.

**Auswirkung / Interpretation:** An der Stelle meiner Unsicherheit fehlt eine arbeitsbezogene Erklärung. Hohe Sicherheit; Screenshot der Seitenhilfe (`evidence/techadmin_b/0011-1792762192920.png`).

## Einrichtung und Testgrenzen

- **techadmin_b-E1, Umgebung:** KI-Chat ist „Noch nicht verfügbar“; OpenAI-Projekt, Modell und Kostenbudget seien noch einzurichten. Das ist eine klar benannte Sperre, keine bewertete schlechte KI-Antwort. Unter Modell/Kostenrahmen werden trotzdem Standardmodell und Beispielrahmen angezeigt. Keine Antwortqualität oder KI-Dokumentverarbeitung bewertet.
- **techadmin_b-E2, Umgebung:** Privater Dateispeicher fehlt laut Jobliste. Kein erfolgreicher Export geprüft. Der lesbare Hinweis erklärt, dass übrige Funktionen weiter verfügbar bleiben.
- **Berechtigungen:** Geschäftliche Bereiche werden nicht angeboten. Das allein ist kein Defekt und beweist keine serverseitige Rechteprüfung. Keine URL geraten und keine Rolle geändert.
- **Betrieb:** Die Liste zeigt abgeschlossene Mitteilungsjobs. Daraus leite ich keine geprüfte externe Zustellung ab.
- **Werkzeug:** Ein Füllversuch mit Label „Ihr Kommentar“ lief in einen Locator-Timeout. Anschließender Screenshot zeigte das unveränderte Formular; Füllen über die beobachtete Textbox-Rolle funktionierte. Kein Appfehler daraus abgeleitet. Magenta-Flächen im Profilscreenshot sind Passwortmaskierung des Testwerkzeugs.
- Ausschließlich die drei vorgegebenen Leitfäden und sichtbare UI genutzt. Keine Sourcen, APIs, Datenbanken, privaten Dateien oder fremden Berichte gelesen. Keine Konfiguration, Rollen oder Geschäftsdaten verändert, keine Jobs erneut gestartet und keine Nachrichten gesendet.

## Sicherer Supportentwurf und Stärken

Der ungesendete Entwurf lautete:

> UX techadmin_b – Supportfrage: In Verarbeitung steht beim Berichtsexport vom 23.10.2026, 15:21 der Status Nicht verfügbar. Die Liste nennt fehlenden privaten Dateispeicher. In der Jobakte sehe ich dazu keinen Fehlerhinweis oder Verlauf. Welche Ansprechperson prüft die Einrichtung, und wo kann ich den aktuellen Speicherstatus sicher nachlesen? Ich habe den Job nicht erneut ausgeführt.

Das Feedbackformular zeigt den Seitenbezug „Verarbeitung · Detail“, warnt vor Passwörtern und vertraulichen Kundendaten und erlaubt das Ansehen beziehungsweise Abwählen des begrenzten Aktionskontexts. Die Vorschau enthielt allgemeine Schritte, Browser/Viewport, Seitenpfad und App-Version. Keine Feldinhalte, Kundendokumente oder Geheimnisse wurden in den gesehenen Diagnoseansichten angezeigt. Das ist eine begrenzte Sichtprüfung, kein Sicherheitsaudit.

Positiv waren die kurze Einführung, gut lesbare Statusliste, funktionierende Filter, verständliche leere Trefferansicht, explizite KI-Nichtverfügbarkeit und der sichere Feedbackentwurf mit Kontextvorschau. Mobil war die Navigation über „Mehr“ verständlich und per Escape schließbar.

Maschinenlesbarer Bericht: [techadmin_b.json](techadmin_b.json). Automatische Aktions-/Fehlerevidenz liegt unter `work/ai-usability/evidence/techadmin_b/`.
