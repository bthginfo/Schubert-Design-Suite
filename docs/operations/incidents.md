# Störungen, Änderungen und Schlüsselwechsel

## Unterbrochene Verarbeitung

Unter Administration → Verarbeitung den konkreten Auftrag öffnen. Status, Fehler, nächste Wiederholung und aktuellen Datensatz prüfen. Interne Arbeit wird begrenzt mit Lease und Fencing wiederholt; die tägliche Nachholprüfung erfasst liegengebliebene Übergaben. Ein fehlender Browsererfolg ist keine Erlaubnis, einen Beleg, eine Übermittlung oder einen KI-Aufruf erneut anzulegen. Die bewusste Wiederholung erhält denselben fachlichen Schlüssel beziehungsweise den vorgesehenen getrennten Folgeentwurf.

Bei Mailstatus „Ausgang unbekannt“ zunächst den konkreten Anbieter-/Empfängernachweis beschaffen. Die Aufklärung bindet die genaue Nachricht und Originalversion des Nachweises. Ein bewusster neuer Entwurf bekommt eine neue Nachrichtenkennung und verweist auf den abgeschlossenen Vorgänger. „Vom Mailanbieter angenommen“ ist keine Postfacheingangsbestätigung.

Bei unklaren KI-Kosten die reservierte Summe erhalten. Im tatsächlichen OpenAI-Projekt den konkreten Aufruf prüfen und anschließend unter Integrationen → KI-App-Messwerte mit frischer Passphrase den belegten Betrag abgleichen. Fehlende Antwort bedeutet keine bestätigten Nullkosten. Keine automatische zweite kostenpflichtige Bilderzeugung starten.

Bei Dateiprüfproblemen bleibt das Original in Quarantäne. Scanner-/Signaturverfügbarkeit und den ursprünglichen Auftrag prüfen. Einen Virenbefund oder eine fehlgeschlagene Originalprüfung nicht durch manuelles Umschalten auf „verfügbar“ umgehen. Bei Archiv-/Speichergrenzen zuerst die tatsächlichen Anbieter- und App-Messwerte prüfen; alte Originale nicht zur spontanen Platzgewinnung entfernen.

## Integrationszugänge austauschen

OpenAI und SMTP über die Superadmin-Einstellungen austauschen: eigenen Zugang frisch bestätigen, neue konkrete Verbindung speichern, ihren echten Test abwarten. Erst danach bisherige nicht mehr benötigte Providerzugänge beim Anbieter widerrufen. Vor Widerruf prüfen, ob freigegebene alte Versand-/Bildaufträge noch auf die genaue alte Verbindungsfassung verweisen. Das vorhandene Geheimnis wird bei leerem Feld beibehalten und nicht zurück an den Browser ausgegeben.

Vercel-Deploymentzugänge werden getrennt von der Anwendung verwaltet; sie sind keine App-/Kundenzugänge. Einen betroffenen Deploymentzugang im Vercel-Konto ersetzen und die lokale Betreiberkonfiguration aktualisieren. Keine Geheimnisse in Git, URLs, Prozessargumenten oder Supportnachrichten weitergeben.

BETTER_AUTH_SECRET, INTEGRATION_ENCRYPTION_KEY sowie die Backup-Verschlüsselungs-/Signierschlüssel sind Betreiber-Masterschlüssel. Ein unangekündigter Austausch kann bestehende Sitzungen, verschlüsselte Verbindungsfassungen oder alte Sicherungen unlesbar machen. Für einen geplanten Wechsel zunächst aktuelle geprüfte Sicherung und den bisherigen Schlüsselsatz gesichert erhalten, betroffene Verarbeitung kontrolliert anhalten, die Lesbarkeit der bisherigen Versionen im isolierten Restore mit dem zuständigen Technikverantwortlichen nachweisen und danach erst die passende neue Fassung veröffentlichen. Die Anwendung bietet für diese Infrastruktur-Masterschlüssel bewusst keinen einfachen Austauschknopf.

## Deployment oder Datenstörung

Die Qualitäts-Pipeline und Schema-Checks prüfen, dann die genau zu veröffentlichende Revision auf Vercel bauen. Für Schemaänderungen den getrennten Maintenance-Zugang zeitlich begrenzt verbinden und anschließend wieder trennen. Der Hauptserver bleibt Nichtbesitzer ohne RLS-Umgehung. Bei fehlerhaftem Serverstand die letzte geprüfte Vercel-Ausgabe wiederherstellen; bereits angewandte Migrationen oder ausgestellt unveränderliche Belege dadurch nicht rückwärts überschreiben.

Bei einer erforderlichen Datenwiederherstellung die [Restore-Anleitung](restore.md) verwenden. Erst isoliert entschlüsseln, SHA-/Signatur-/Fremdschlüssel- und spätere Löschbelege prüfen. Bestehende Nummern- und Wiederherstellungssperren erhalten. Personenzugänge und externe Übermittlungen bleiben bis zur bewussten Betriebsfreigabe gesperrt.
