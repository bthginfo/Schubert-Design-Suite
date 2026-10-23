# Blackbox-Nachtest superadmin_b – drei getrennte Läufe

23.10.2026, etwa 14:32–14:44 UTC, lokaler Working Tree auf `http://127.0.0.1:5173`, angemeldet als UX David Scholl. Desktop 1280 × 900. Ausschließlich sichtbare Browserbedienung, keine Quellen/API-/Datenbankprüfung. Nur eigener vorhandener Demo-Zugang und eigene neue Testobjekte verwendet. Browser um 14:44 UTC geschlossen.

## Ergebnisstand – erster Lauf, 14:32–14:44 UTC

| Prüfung | Ergebnis |
| --- | --- |
| Zugangsliste durchsuchen | **Bestanden.** Suche nach `ux-superadmin-b@example.invalid` filterte sofort auf genau `UX superadmin_b Demo`; kein Scrollen durch die gesamte Liste erforderlich. |
| Rollenbearbeitung unmittelbar im Dialog | **Bestanden.** „Rolle prüfen“ öffnete direkt „Rolle & Fähigkeiten prüfen“, mit richtigem Namen, aktueller Rolle und vorhandener Bibliotheksfähigkeit. Mit „Abbrechen“ geschlossen; keine Rechte verändert. |
| Beschäftigtenprofil ohne bestätigtes Arbeitsmodell | **Bestanden.** Name und geschäftliche E-Mail eingetragen, eigenen Zugang über die Suche im Feld „Verknüpfter Zugang“ gewählt. Einmaliges Speichern erfolgreich; Profil `MA-2026-00017` anschließend geöffnet. Zugang und E-Mail sind korrekt verbunden; Team, Beschäftigungsdaten, Wochen-/Tagesstunden, Feiertagsregion und Urlaub blieben leer. |
| Herstellerbibliothek: Suche mit Enter | **Bestanden.** Eingabe `UX Nachtest superadmin_b` und Enter erzeugte die entsprechende Such-URL und die erwartete leere Trefferansicht. |
| Quellenoriginal hochladen, Entwurfstatus und sichere Wiederholung | **Teilweise; Upload blockiert.** Dateiauswahl gelang. Der erste Speichervorgang blieb mehrere Minuten bei „Wird gespeichert …“. Erst nach Browser-Zurück und erneuter Bibliotheksnavigation war genau ein gespeicherter Quellenentwurf mit „Datei ergänzen“ erkennbar. Derselbe Eintrag ließ sich mit erhaltenen Angaben öffnen; ein erneuter Dateiversuch an diesem Eintrag blieb ebenfalls beim Speichern. Details unten. |

## Upload-Blocker

Eigene neue Quelle: **UX Nachtest superadmin_b · Quellenoriginal**. Hersteller: **UX Nachtest superadmin_b · Synthetischer Testhersteller**. Zuordnung: beide Planungsstudios, Dateiart Datenblatt. Eigene Datei: `work/ai-usability/synthetic/superadmin_b-nachtest-original.pdf`, 822 Bytes, eine harmlose Textseite ohne echte Herstellerangaben, technische Bemessungswerte oder Freigaben.

Am 23.10.2026 um etwa **14:36:41 UTC** einmal „Speichern & Verwendung prüfen“ geklickt. Um **14:39:51 UTC** – nach mindestens 190 Sekunden – zeigte der Dialog weiterhin ausschließlich Schritt 1 und „Wird gespeichert …“. Schließen, Abbrechen und Dateiauswahl waren deaktiviert. Kein sichtbarer Hinweis darauf, ob der Quellenentwurf schon gespeichert ist, ob die Originaldatei noch übertragen wird oder ob bereits eine Sicherheitsprüfung läuft. Der Blocker wurde nach über einer Minute sofort an den Parent gemeldet.

Als realistischer Ausweg diente normales Browser-Zurück. Der erste Rückschritt entfernte nur den Suchparameter: Der Dialog blieb blockiert, aber im Hintergrund war der eigene Quellenentwurf bereits mit „Datei ergänzen“ sichtbar. Erst der weitere Rückschritt zur Beschäftigtenakte und erneute Navigation zur Bibliothek erlaubten die Fortsetzung. Die Suche mit Enter zeigte **genau einen** eigenen Quellenentwurf.

„Datei ergänzen“ an diesem vorhandenen Eintrag öffnete dessen gespeicherte Angaben. Ich wählte dieselbe eigene PDF und startete um etwa **14:41:54 UTC** genau einen erneuten Dateiversuch. Auch dieser blieb bis zur abschließenden Beobachtung um **14:43:28 UTC**, also mindestens 94 Sekunden, in Schritt 1 bei „Wird gespeichert …“. Kein weiterer Assetentwurf wurde über „Herstellerunterlage hinzufügen“ angelegt.

Nach erneutem Browser-Zurück und Navigation zur Bibliothek wurde um etwa **14:43:50 UTC** abschließend nochmals gesucht: Die Oberfläche zeigte weiterhin **genau einen eigenen Quellenentwurf**, wiederum mit „Datei ergänzen“. Im tatsächlich bedienten Wiederholungsweg entstand somit kein zweiter sichtbarer Assetentwurf. Das Verhalten nach einer konkreten terminalen Upload-Fehlermeldung konnte nicht bewertet werden, da beide Versuche im Wartezustand verblieben.

**Erwartung:** Zeitnaher Übergang zu einem eindeutigen Zustand, etwa gespeicherter Entwurf mit Originaldatei in Quarantäne, oder eine verständliche Fehlermeldung mit sicherer Wiederholungsaktion am bestehenden Entwurf.

**Auswirkung:** Der Uploadablauf lässt sich nicht fortsetzen oder regulär abbrechen. Der vorhandene Quellenentwurf lässt sich über den Umweg wiederfinden und fortsetzen; der laufende Dialog selbst erklärt diesen Zwischenstand nicht. Eine erfolgreiche Sicherheitsprüfung, abgeschlossene Ablage der Originalbytes oder Verfügbarkeit in den Studios wird ausdrücklich nicht behauptet.

**Einordnung:** Beobachteter Bedienblocker. Die technische Ursache wurde nicht untersucht. Dass der echte Scanner/Worker lokal fehlt, ist eine bekannte Umgebungsgrenze; sie erklärt ohne weitere Evidenz weder die lange blockierte Oberfläche noch einen gespeicherten Entwurfstatus. Kein Scan und keine Freigabe wurden simuliert.

## Selbst angesehene Screenshots

- [Gefilterter eigener Zugang](../evidence/superadmin_b/0001-1792765964906.png)
- [Direkter Rollen-Dialog](../evidence/superadmin_b/0002-1792765973583.png)
- [Minimales Beschäftigtenformular und Erklärung](../evidence/superadmin_b/0003-1792766045128.png)
- [Erfolgreich angelegtes Profil in der Trefferliste](../evidence/superadmin_b/0004-1792766046690.png)
- [Gespeichertes Profil mit verknüpftem Zugang und leeren Personalparametern](../evidence/superadmin_b/0005-1792766062661.png)
- [Bibliothekssuche nach Enter](../evidence/superadmin_b/0006-1792766093697.png)
- [Ausgewählte eigene PDF vor dem Speichern](../evidence/superadmin_b/0009-1792766177987.png)
- [Speichern wartet weiterhin](../evidence/superadmin_b/0011-1792766215688.png)
- [Blocker nach mehr als einer Minute](../evidence/superadmin_b/0012-1792766270142.png)
- [Unveränderter Zustand nach mindestens 107 Sekunden](../evidence/superadmin_b/0013-1792766307961.png)
- [Genau ein eigener Quellenentwurf nach erneuter Navigation](../evidence/superadmin_b/0016-1792766483544.png)
- [Datei ergänzen erhält die Angaben des bestehenden Eintrags](../evidence/superadmin_b/0017-1792766484517.png)
- [Erneuter Dateiversuch am bestehenden Eintrag wartet ebenfalls](../evidence/superadmin_b/0018-1792766514449.png)
- [Zweiter Versuch nach mindestens 94 Sekunden unverändert](../evidence/superadmin_b/0019-1792766607870.png)
- [Abschluss: weiterhin genau ein eigener Quellenentwurf](../evidence/superadmin_b/0020-1792766630130.png)

## Grenzen und Datenstand

Beim ersten Dateiauswahlversuch war der zuvor geöffnete Dialog verschwunden. Zu diesem Zeitpunkt war noch keine neue Quelle gespeichert worden. Nach frischem Öffnen ließ sich die Datei regulär auswählen. Laut Parent führten vor dem Einfrieren des Appcodes noch Änderungen zu automatischen Reloads; dieser erste Vorgang wird daher als Umgebungseinfluss und nicht als reproduzierter Produktfehler bewertet.

Die frühere Inkonsistenz „Aktuell Office“ neben „Büro“ ist im Rollen-Dialog weiterhin sichtbar, behindert den nun direkten Ablauf aber nicht. Die Beschäftigtenakte nennt die leere Arbeitswoche weiterhin „Arbeitstage Mo–So (Stunden, JSON)“; dieser technische Begriff war für die erfolgreiche Minimalanlage nicht erforderlich.

Testdaten werden behalten. Kein neuer Benutzer angelegt, keine fremden Rechte oder Integrationen geändert, keine Nachricht versendet und keine Personalparameter erfunden. Der eigene Beschäftigtendatensatz und genau ein sichtbarer eigener Quellenentwurf bleiben erhalten. Der Browserkontext wurde nach der abschließenden Sichtprüfung geschlossen.

---

## Zweiter Lauf – gezielter Upload-Nachtest, 14:50–14:56 UTC

**Der Upload-Blocker aus Lauf 1 ist im zweiten Lauf nicht mehr aufgetreten.** Dieselbe 822-Byte-PDF wurde über „Datei ergänzen“ am vorhandenen Eintrag `UX Nachtest superadmin_b · Quellenoriginal` übertragen. Der Ablauf erreichte Schritt 2 mit offener Dateiprüfung. Ein gesondert erprobter Abbruch eines weiteren Übertragungsversuchs funktionierte unmittelbar. Eine kleine widersprüchliche Statusmeldung bleibt nach dem Abbruch bestehen.

### Tatsächlicher Ablauf und Ergebnis

1. Frisch angemeldet, Bibliothek nach `UX Nachtest superadmin_b` mit Enter gefiltert: genau ein vorhandener Eintrag. Keine neue Quelle angelegt.
2. „Datei ergänzen“ geöffnet; die eigenen gespeicherten Angaben waren vorhanden. Dieselbe harmlose PDF ausgewählt und einmal „Speichern & Verwendung prüfen“ geklickt.
3. Unmittelbar danach bestätigte der Dialog: **„Quellenangaben sind gespeichert. Die Originaldatei wird jetzt übertragen.“** Zusätzlich erschien die aktive Schaltfläche **„Dateiübertragung abbrechen“**. Der gespeicherte Teilfortschritt war damit bereits während der Übertragung verständlich.
4. Zwischen dem Speicherklick um etwa **14:51:18 UTC** und dem Screenshot um **14:51:36 UTC** erfolgte der Übergang zu **„Datei & Verwendung prüfen“, Schritt 2 von 2**. Die ausgewählte Originaldatei wurde dort namentlich zugeordnet. Die Bibliothek zeigte einen „Original öffnen“-Link und **„Dateiprüfung offen“** statt „Datei ergänzen“.
5. Der Dialog erklärte **„Dateiprüfung noch offen“** und **„Die Originaldatei bleibt privat. Nach bestandener Virenprüfung kann sie für die Studios bereitgestellt werden.“** „Dateistatus aktualisieren“ ließ die offene Prüfung korrekt bestehen. Keine erfolgreiche Virenprüfung behauptet oder simuliert; keine Bereitstellung versucht. Die Nutzungs- und Bestätigungsfelder blieben unangetastet, „In den Studios bereitstellen“ deaktiviert.
6. „Für später schließen“ funktionierte regulär. Die Liste bestätigte den gespeicherten Entwurf und zeigte weiterhin genau einen eigenen Eintrag mit offener Dateiprüfung. „Verwendung festlegen“ öffnete denselben zugeordneten Stand erneut.
7. Für die ausdrücklich geforderte Abbruchprüfung am bestehenden Eintrag „Angaben / Datei ergänzen“ gewählt, dieselbe PDF erneut ausgewählt, Übertragung gestartet und **„Dateiübertragung abbrechen“ tatsächlich angeklickt**. Der laufende Versuch endete unmittelbar. Schließen, Abbrechen und Speichern waren wieder bedienbar. Der Hinweis bestätigte den gespeicherten Entwurf und erklärte, erneutes Speichern setze denselben Entwurf fort. Anschließend mit „Abbrechen“ regulär geschlossen.
8. Danach weiterhin genau ein eigener Bibliothekseintrag. Der zuvor erfolgreich zugeordnete Original-Link war unverändert vorhanden, die Dateiprüfung blieb offen. Kein zweiter sichtbarer Assetentwurf entstand.

### Verbleibende kleine Hürde · P3

Nach dem aktiven Übertragungsabbruch blieb gleichzeitig die blaue Meldung **„Quellenangaben sind gespeichert. Die Originaldatei wird jetzt übertragen.“** stehen. Darunter erklärte der rote Hinweis bereits **„Die Dateiübertragung wurde beendet.“** Nach dem Dialogschließen blieb die laufende Übertragung sogar als Status oberhalb der Bibliotheksliste stehen.

Die Abbruchfunktion selbst war bedienbar und gab die Oberfläche sofort frei. Die gegensätzlichen Texte lassen jedoch offen, ob im Hintergrund noch etwas läuft. Erwartet wäre nach dem Abbruch ausschließlich der bestätigte Abbruch-/Entwurfstatus. Dieser Restbefund wurde dem Parent separat gemeldet.

### Selbst angesehene Evidenz aus Lauf 2

- [Vor Beginn: genau ein vorhandener eigener Entwurf](../evidence/superadmin_b/0001-1792767061682.png)
- [Sofortiger Teilfortschritt und angebotener Übertragungsabbruch](../evidence/superadmin_b/0003-1792767078882.png)
- [Erreichter Schritt 2: Original zugeordnet, Dateiprüfung offen](../evidence/superadmin_b/0004-1792767096558.png)
- [Offene Prüfung und deaktivierte Bereitstellung](../evidence/superadmin_b/0005-1792767108264.png)
- [Regulär geschlossener Dialog: Entwurf gespeichert und ein eigener Eintrag](../evidence/superadmin_b/0006-1792767194342.png)
- [Tatsächlich abgebrochener weiterer Übertragungsversuch; widersprüchlicher blauer Status](../evidence/superadmin_b/0007-1792767213413.png)
- [Nach Abbruch und Schließen: genau ein Eintrag mit ursprünglichem Original, laufender Status bleibt stehen](../evidence/superadmin_b/0008-1792767240441.png)

### Grenzen dieses zweiten Laufs

Der normale Upload erreichte innerhalb von ungefähr 18 Sekunden den zugeordneten Originalstand. Die automatische Wartezeitbegrenzung wurde deshalb nicht ausgelöst und kann aus diesem Lauf nicht als geprüft gelten; die manuelle Abbruchfunktion wurde dagegen tatsächlich genutzt und funktionierte. Die Originalbytes wurden nicht gesondert heruntergeladen; der Upload-Erfolg ist anhand des neuen, dauerhaft zugeordneten Originalstands und des Übergangs zur Dateiprüfung in der Oberfläche belegt. Keine API-, Datenbank- oder Quellenprüfung.

Der fehlende lokale Scanner ist weiterhin die erwartete Umgebungsgrenze. Die Datei bleibt bei offener Prüfung privat. Es wurden keine Nutzungsrechte oder Freigaben erfunden, keine Studiobereitstellung erzwungen, kein zweiter Assetentwurf und kein weiterer Benutzer angelegt. Der Browserkontext wurde nach der Berichtsergänzung um 14:56 UTC geschlossen; Testdaten bleiben erhalten.

---

## Dritter Lauf – Statushinweis nach Abbruch-Fix, 15:16–15:17 UTC

**Bestanden: Der P3-Restbefund aus Lauf 2 ist im geprüften Ablauf behoben.** Am selben vorhandenen Eintrag `UX Nachtest superadmin_b · Quellenoriginal` erneut die identische harmlose PDF ausgewählt, Übertragung gestartet und die aktive Schaltfläche „Dateiübertragung abbrechen“ angeklickt.

Unmittelbar danach lautete der blaue Status nun korrekt: **„Quellenangaben gespeichert. Die Dateiübertragung ist beendet; den Dateistand vor einer Wiederholung prüfen.“** Der zusätzliche Abbruchhinweis passte dazu. Die Meldung behauptete keine laufende Übertragung mehr. Schließen, Abbrechen und Speichern waren wieder bedienbar.

Nach regulärem Schließen mit „Abbrechen“ zeigte auch die Bibliotheksliste den korrekten beendeten Zustand. Es blieb genau ein eigener Quellenentwurf vorhanden. „Original öffnen“ verwies unverändert auf dieselbe bereits vorhandene Originalfassung wie vor diesem Abbruchversuch. „Dateiprüfung offen“ blieb erhalten; keine Bereitstellung oder Prüfung erzwungen.

Beide Screenshots wurden selbst visuell geprüft:

- [Korrigierter Status direkt nach aktivem Übertragungsabbruch](../evidence/superadmin_b/0001-1792768621147.png)
- [Korrigierter Status nach Dialogschließen; Quelle und Original erhalten](../evidence/superadmin_b/0002-1792768634275.png)

Keine neue Quelle, kein zusätzlicher Benutzer und keine Rechteänderung. Keine Quellen-, API- oder Datenbankprüfung; keine Geheimnisse verwendet. Der Browser wurde nach dieser Berichtsergänzung um 15:17 UTC geschlossen, alle Testdaten bleiben erhalten.
