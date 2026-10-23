> Kopierter Einzelbericht. Vollständige Bild- und Browserbelege liegen im Workspace unter `work/ai-usability/`. Die ausgewählten Belege dieses Pakets sind verlinkt.

# Simulierter Nutzertest · superadmin_a

Eva, 41, fachliche Verwalterin für Herstellerunterlagen und Stammdaten im deutschen Steinmetzbetrieb. Getestet am 23.10.2026 als **UX Eva Brandt / Superadmin**, Desktop 1440 × 1000. Rund 61 Browseraktionen von etwa 13:14 bis 13:22 UTC; Kontext vor der Berichterstellung geschlossen. Dies ist ein simulierter Black-box-Test, keine Studie mit einer echten Testperson.

## Zielstatus

| Ziel | Status | Tatsächliches Ergebnis |
| --- | --- | --- |
| G1 · Herstellerbereich und eigene Quelle | Teilweise erreicht | „Herstellerbibliothek“ direkt in der Hauptnavigation gefunden. **UX superadmin_a · Test Naturstein-Datenblatt** mit synthetischem Hersteller und Zuordnung zu beiden Studios als Entwurf angelegt. Das eigene synthetische PDF konnte wegen fehlenden privaten Dateispeichers nicht gespeichert werden. |
| G2 · Planung, KI, Herkunft, Rechte, Dateistatus | Teilweise erreicht | Datenblattart, Herkunftshinweis und Datum eingegeben. Schritt 2 mit getrennten Optionen für Planung und KI-Referenz gefunden. Planung lokal ausgewählt, konkrete Berechtigung und Prüfbestätigung eingegeben; Bereitstellung blieb wegen fehlender Originaldatei gesperrt. Speicherung dieser Rechte nicht nachgewiesen. Scan und tatsächliche KI-Übermittlung nicht prüfbar. |
| G3 · Zugriff und Verwendung in beiden Studios | Teilweise erreicht | Zugriffpfad bis zur Zusatzfähigkeit „Herstellerbibliothek verwalten“ gefunden, nur angesehen und abgebrochen. Eigene leere Entwürfe in Grabmal- und Raumstudio angelegt. In beiden über „Herstellerdaten“ nach eigener Quelle gesucht: „Keine passenden Originale“. Die eigene Quelle konnte wegen der fehlenden Originaldatei nicht eingesetzt werden. |

Eigene ungefährliche Entwürfe: **UX superadmin_a · Quellenprobe Grabmal** und **UX superadmin_a · Quellenprobe Raum**. Keine fremden Datensätze verändert, keine Rollen bestätigt, keine KI-Jobs gestartet und keine Integrationen geändert.

## Wichtigste Befunde

### superadmin_a-E1 · P1 · Umgebung: Originalupload durch fehlenden Dateispeicher blockiert

**Erwartung vor dem Schritt:** Nach Auswahl des synthetischen PDF und Ausfüllen der Pflichtfelder führt „Speichern & Verwendung prüfen“ zur Dateiprüfung und getrennten Nutzungsfreigabe.

**Beobachtung:** Nach dem Speichern erschien „Privater Dateispeicher ist noch nicht eingerichtet. Die übrigen Funktionen bleiben verfügbar.“ Die Originaldatei fehlte danach. Im zweiten Schritt stand „Noch keine Originaldatei“ und „Ergänzen Sie zuerst die Originaldatei. Der Entwurf ist bereits gespeichert.“ Auch nach „Dateistatus aktualisieren“ blieb die Bereitstellung deaktiviert.

**Auswirkung:** Die Kernaufgabe ist nur bis zum Metadatenentwurf möglich. Dateispeicherung, Scan, technische Dateiprüfung, erfolgreiche Studioverwendung und KI-Referenz können hier nicht bewertet werden. Dies ist eine nachgewiesene Umgebungseinschränkung, kein Beleg für einen allgemeinen Produktfehler beim Upload.

**Route:** `/manufacturer-assets`, anschließend `/manufacturer-assets?q=UX+superadmin_a`.

**Evidenz:** Dateispeicher-Meldung (`evidence/superadmin_a/0005-1792761385276.png`), fehlendes Original / Schritt 2 (`evidence/superadmin_a/0007-1792761452399.png`), Grabmal-Auswahl ohne eigene Quelle (`evidence/superadmin_a/0015-1792761611342.png`), Raum-Auswahl ohne eigene Quelle (`evidence/superadmin_a/0016-1792761683502.png`). Sicherheit: hoch.

### superadmin_a-F1 · P2 · Produkt: Uploadfehler verdeckt zugleich entstandenen Entwurf

**Erwartung:** Ein fehlgeschlagener Speichervorgang zeigt sofort sichtbar, was gespeichert wurde und was noch fehlt.

**Beobachtung:** Bei geöffnetem Bereich „Quellenlink & Hinweise ergänzen“ lag die Fehlermeldung nach dem Speichern unterhalb des sichtbaren Dialoginhalts. Sichtbar blieben Formular und derselbe Speicherbutton. Erst Scrollen zeigte die Meldung. Der Dialog blieb in Schritt 1 und erklärte dort nicht, dass der Entwurf schon existierte. Nach Abbrechen und expliziter Suche fand ich dennoch den eigenen Datensatz mit „Datei ergänzen“. Erneutes Öffnen und Speichern ohne neue Datei führte zu Schritt 2, der den gespeicherten Entwurf endlich ausdrücklich benannte.

**Auswirkung:** Unklar, ob Abbrechen Daten verliert oder erneutes Speichern nötig ist; unnötige Suche und Wiederöffnung. Bei einem unbekannten Teilerfolg wäre wiederholtes Speichern naheliegend. Ich habe nicht mehrfach blind gespeichert und keinen zweiten Quelldatensatz angelegt.

**Empfehlung:** Fehler in den sichtbaren Bereich bringen und direkt erklären: „Entwurf gespeichert; Originaldatei konnte nicht hochgeladen werden“, mit klarer Fortsetzungsaktion.

**Evidenz:** unverändert sichtbarer Formularbereich ohne Fehlermeldung (`evidence/superadmin_a/0004-1792761372997.png`), Meldung nach Scrollen (`evidence/superadmin_a/0005-1792761385276.png`), vorhandener eigener Datensatz nach Wiederöffnung (`evidence/superadmin_a/0006-1792761430358.png`), expliziter Entwurfsstatus erst in Schritt 2 (`evidence/superadmin_a/0007-1792761452399.png`). Route wie E1. Sicherheit: hoch.

### superadmin_a-F2 · P2 · Produkt: „Rolle prüfen“ öffnet Formular weit außerhalb des Blicks

**Erwartung:** Nach „Zugriff vergeben“ und „Rolle prüfen“ sehe ich unmittelbar, wie der Bibliothekszugang vergeben würde.

**Beobachtung:** „Zugriff vergeben“ führte richtig zu „Zugänge & Rollen“. Nach „Rolle prüfen“ beim ersten sichtbaren synthetischen Zugang blieb oben die lange Personenliste im Blick. Das Rollenformular wurde unter der gesamten Liste eingefügt. Die Felder lagen laut sichtbarer Feldinspektion mehr als 6000 Pixel unterhalb des Viewports. Erst gezieltes Scrollen brachte die Zusatzfähigkeit „Herstellerbibliothek verwalten · Dateien, Nutzungszwecke und Studiozuordnung“ in den sichtbaren Bereich. Ich habe nichts ausgewählt oder gespeichert und „Abbrechen“ verwendet.

**Auswirkung:** Eine Verwaltungsperson kann den Klick für wirkungslos halten; der vorgesehene Zugriffpfad ist unnötig schwer zu entdecken.

**Empfehlung:** Formular beim betroffenen Zugang, als Dialog oder mit sichtbarem Fokus und Scrollen öffnen.

**Route:** `/settings?tab=users`.

**Evidenz:** lange Zugangsliste am Seitenanfang (`evidence/superadmin_a/0009-1792761510961.png`), Formular nach gezieltem Scrollen (`evidence/superadmin_a/0010-1792761539628.png`). Sicherheit: hoch.

### superadmin_a-F3 · P3 · Produkt: Bibliothekssuche reagiert nicht auf Enter

**Erwartung:** Enter im Suchfeld führt die Suche aus.

**Beobachtung:** Nach Eingabe von „UX superadmin_a“ und Enter blieben die bisherige Liste und URL ohne Suchparameter bestehen. Erst der Klick auf „Suchen“ führte zu `?q=UX+superadmin_a` und genau dem eigenen Datensatz. Escape schloss dagegen sowohl die Einführungsauswahl als auch später den Herstellerdaten-Dialog zuverlässig.

**Auswirkung:** Kleiner Tastaturumweg; Suchergebnisse wirken bis zum zusätzlichen Klick unverändert.

**Route:** `/manufacturer-assets`.

**Evidenz:** Browseraktionsfolge Eingabe → Enter → „Suchen“; der gefilterte eigene Datensatz ist im Hintergrund von 0006 (`evidence/superadmin_a/0006-1792761430358.png`) sichtbar. Sicherheit: mittel, da keine zusätzliche Wiederholung durchgeführt wurde.

## Was gut verständlich war

- Die Hauptnavigation benennt „Herstellerbibliothek“ klar; die Seite erklärt Original hinzufügen, Studio zuordnen und Verwendung festlegen knapp.
- Die Dialoghierarchie und primären Aktionen sind auf dem Desktop gut lesbar. Pflichtfelder für Bezeichnung und Hersteller sind mit Stern markiert. Der Versuch mit leerem Formular blieb in Schritt 1; anschließend ließen sich die Angaben ergänzen.
- „In welchem Studio?“ enthält „Beide Planungsstudios“; „Wofür ist die Datei?“ unterscheidet Grundriss/Kontur, KI-Referenzbild, Datenblatt und 3D-Originaldatei.
- Schritt 2 trennt Planung von KI und erklärt ausdrücklich, dass Bild- oder Textreferenzen an den KI-Anbieter übermittelt werden dürfen. Die KI-Option war ohne Original deaktiviert. Es gab keine vorgetäuschte Verfügbarkeit.
- „In der Planung verwenden“ erklärt für PDFs/Fotos die Verwendung als Planvorlage. Daraus habe ich keine automatische Übernahme von Herstellerangaben als geprüfte Fakten abgeleitet.
- Der Nachweis der Nutzungsberechtigung verlangt Quelle und Umfang; die zusätzliche Prüfbestätigung ist verständlich. Maßstab und technische Eignung werden ausdrücklich erst beim Einsatz weiter geprüft.
- In beiden Studios ist „Herstellerdaten“ derselbe Einstieg. Der leere Suchzustand erklärt die nötige Bereitstellung durch Superadmin oder berechtigte Person.

## Grenzen und offene Punkte

- **Storage:** explizit nicht eingerichtet; PDF ausgewählt, aber keine erfolgreiche Dateiablage.
- **Scan:** kein erfolgreicher Upload, deshalb weder Scanstatus noch Scanergebnis beurteilt. „Dateistatus aktualisieren“ änderte den fehlenden Originalstatus nicht.
- **KI:** Erklärung und deaktivierte Auswahl geprüft. Kein Anbieter konfiguriert oder verändert; Anbieter-Verfügbarkeit und Ausgabequalität nicht geprüft. Kein KI-Auftrag gestartet und keine Referenz übertragen.
- **Herkunft/Datum:** Im ersten Schritt gibt es unter „Quellenlink & Hinweise ergänzen“ ein URL-Feld und Freitext, aber kein sichtbar separates Stand-/Datumsfeld. Den 23.10.2026 habe ich im Freitext eingetragen. Eine Persistenz dieses Freitexts habe ich nicht erneut überprüft.
- **Rechte:** Die unterschiedliche Verwendung wurde im Dialog eingestellt, konnte ohne Datei aber nicht bereitgestellt werden. Dauerhafte Speicherung der Rechte ist nicht belegt.
- **Zugriff:** nur Verwaltungspfad angesehen. Keine Benutzer angelegt und keine fremden Rechte verändert.
- Desktop geprüft; mobile Darstellung nicht getestet. Die Einführung bot 20 Stationen, aber keine eigene Station für die Herstellerbibliothek; sie ließ sich für später schließen.
- Ein Inspektionsversuch auf den alten Dialogtitel lief nach dem Wechsel zu Schritt 2 ins Leere. Die anschließende normale Inspektion zeigte den neuen Dialog; dies war kein Appfehler.

Selbst visuell geprüft: Einstieg 0001 (`evidence/superadmin_a/0001-1792761256257.png`), Eingabe 0002 (`evidence/superadmin_a/0002-1792761294096.png`), Fehlerrückmeldung 0004 (`evidence/superadmin_a/0004-1792761372997.png`)/0005 (`evidence/superadmin_a/0005-1792761385276.png`), Nutzungsprüfung 0007 (`evidence/superadmin_a/0007-1792761452399.png`), Rollenverwaltung 0009 (`evidence/superadmin_a/0009-1792761510961.png`)/0010 (`evidence/superadmin_a/0010-1792761539628.png`), beide Studioergebnisse 0015 (`evidence/superadmin_a/0015-1792761611342.png`)/0016 (`evidence/superadmin_a/0016-1792761683502.png`).
