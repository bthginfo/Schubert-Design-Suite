export const guides = [
 {id:'review',permission:'time.approve',title:'Teamzeiten sachlich prüfen',intro:'Fremde Zeitabgaben und Korrekturanträge sind getrennt von Ihrer eigenen Erfassung.',href:'/time?tab=review',action:'Teamzeiten prüfen',steps:['Oben in der Arbeitszeit „Teamzeiten prüfen“ öffnen. Abgaben sind nach Beschäftigten und Zeitraum geordnet.','Tatsächliche Intervalle, Pausen, Tätigkeit und Anlass lesen. Bei Korrekturen bisherigen und beantragten Stand vergleichen.','Mit Begründung freigeben oder mit einer konkreten Rückfrage zurückgeben. Eigene Zeiten prüft eine andere berechtigte Person.']},
 {id:'system',permission:'system',title:'Verarbeitung und Dienste prüfen',intro:'Jobfehler vom betroffenen Dienst bis zum nächsten sicheren Schritt nachvollziehen.',href:'/settings?tab=system',action:'System & Dienste öffnen',steps:['Dienstübersicht öffnen. „Eingerichtet“ bedeutet konfiguriert; „Nicht verfügbar“ zeigt einen fehlenden Dienst, keine erfolgreiche Verarbeitung.','Unter Verarbeitung einen Job öffnen: Ursache, Versuche, Start, Ende und nächsten Versuch lesen.','Zuerst die Konfiguration durch den Superadmin klären. Bei ungewissem Anbieterergebnis den Beleg prüfen, bevor Sie eine möglicherweise kostenpflichtige Aktion erneut ausführen.']},

  {
    id: "feedback",
    permission: "",
    title: "Feedback im Testbetrieb geben",
    intro:
      "Melden Sie einen Fehler, eine unklare Bedienung oder eine Verbesserungsidee direkt auf der betroffenen Seite.",
    href: "/help?from=feedback",
    action: "Hilfe zum Testbetrieb",
    steps: [
      "Wenn der Superadmin die Funktion einschaltet, erscheint rechts unten „Feedback“. Auch mit Alt + Umschalt + F erreichbar.",
      "Beschreiben Sie, was passiert ist und was Sie erwartet haben. Den begrenzten Aktionskontext können Sie vor dem Senden ansehen oder abwählen. Passwörter und vertrauliche Kundendaten gehören nicht in den Kommentar.",
      "Nach dem Senden bestätigt eine FB-Nummer den Eingang. Nur der Superadmin kann Rückmeldungen unter Einstellungen → Rückmeldungen einsehen und einordnen. Beim Schließen bleibt Ihr Entwurf bis zum Neuladen in diesem Browserfenster erhalten.",
    ],
  },
  {
    id: "numbering",
    permission: "admin",
    title: "Nummernkreise beim Umstieg",
    intro:
      "Wählen Sie den Aufbau und die nächste freie Nummer aus Ihrem bisherigen System.",
    href: "/settings?tab=numbering",
    action: "Nummernkreise öffnen",
    steps: [
      "Rechnungen, Angebote oder einen anderen Nummernkreis auswählen. Die Vorschau zeigt die nächste Nummer, ohne sie zu verbrauchen.",
      "Mit {NR}, {JJJJ}, {JJ} und {MM} den Aufbau festlegen. Bei einer letzten Nummer 347 im alten System ist die nächste freie Nummer 348.",
      "Grundlage dokumentieren und mit Ihrer Passphrase speichern. Bereits vergebene Nummern bleiben erhalten; ein jährlicher Neustart benötigt das Jahr im Aufbau.",
    ],
  },
  {
    id: "orientation",
    permission: "",
    title: "Sicher starten",
    intro:
      "Ihre Tagesübersicht bündelt anstehende Aufgaben, Termine und Aufträge.",
    href: "/",
    action: "Tagesübersicht öffnen",
    steps: [
      "Links wählen Sie einen Arbeitsbereich. Auf dem Handy erreichen Sie die Navigation über „Mehr“.",
      "Büro und Einkauf beginnen mit den häufigen Aufgaben. Eine Kundenzeile öffnet die Kundenübersicht mit Kacheln für alle zugehörigen Vorgänge.",
      "Pflichtfelder tragen ein Sternchen. Hinweise unter den Eingaben erklären Format und Bedeutung. Erst „Speichern“ übernimmt einen Entwurf.",
    ],
  },
  {
    id: "customer",
    permission: "crm",
    title: "Vom Kunden zur Anfrage",
    intro:
      "Beginnen Sie mit einer Person oder einem Unternehmen und halten Sie das Vorhaben getrennt fest.",
    href: "/customers",
    action: "Kunden öffnen",
    steps: [
      "„Kunde anlegen“ wählen. Name, Anschrift und vorhandene Kontaktdaten eintragen. Fehlende optionale Angaben können Sie später ergänzen.",
      "In der Kundenübersicht „Anfrage anlegen“ wählen. Der Kunde wird übernommen; Sie beschreiben nur noch das Vorhaben und den nächsten Schritt.",
      "Die Kacheln zeigen Aufträge, Anfragen, Angebote, Planungen, Unterlagen und Rechnungen. „Daten, Kommunikation & Verlauf“ öffnet die vollständige Akte. Prüfen Sie vor dem Anlegen, ob der Kunde bereits existiert.",
    ],
  },
  {
    id: "sales",
    permission: "sales",
    title: "Ein Angebot vorbereiten",
    intro:
      "Leistungen, Mengen und Preise bleiben bis zur Veröffentlichung bearbeitbar.",
    href: "/quotes",
    action: "Angebote öffnen",
    steps: [
      "„Angebot anlegen“ wählen und den Kunden zuordnen. Positionen mit Beschreibung, Menge, Einheit und Preis ergänzen.",
      "Optionale Positionen ausdrücklich kennzeichnen. Netto, Steuer und Gesamtbetrag vor der Freigabe kontrollieren.",
      "Prüfung, Freigabe, Veröffentlichung und Annahme sind getrennte Schritte. Nur die bestätigte Annahme erzeugt einen Auftrag.",
    ],
  },
  {
    id: "orders",
    permission: "orders",
    title: "Einen Auftrag begleiten",
    intro:
      "Die Auftragsakte verbindet Beratung, Planung, Werkstatt und Montage.",
    href: "/orders",
    action: "Aufträge öffnen",
    steps: [
      "Öffnen Sie den Auftrag und prüfen Sie Kundenbezug, Termin und Umfang.",
      "Gliedern Sie die Arbeit in Arbeitspakete. Einsatzplanung, Dokumente und Planungsstände werden dem Auftrag zugeordnet.",
      "Zusätzliche Leistungen als Nachtrag erfassen; den ursprünglichen Umfang nicht still überschreiben.",
    ],
  },
  {
    id: "memorial",
    permission: "planning",
    title: "Ein Grabmal gestalten",
    intro:
      "Maße, Material und Inschrift werden in einem nachvollziehbaren Planungsstand geführt.",
    href: "/studio",
    action: "Planungsstudio öffnen",
    steps: [
      "Planung öffnen oder neu anlegen und „Grabmal“ wählen. Grabstätte und bestätigte Maße zuordnen.",
      "Über „Hinzufügen“ Stein, Sockel oder Inschrift anlegen. Unter der Zeichnung mm, cm oder m wählen. „Bauteile“ öffnet die Liste, „Eigenschaften“ (mobil „Details“) die Angaben zur Auswahl. Den Inschrifttext Zeichen für Zeichen prüfen.",
      "Zwischen 2D und 3D wechseln. Vor Planexport und Freigabe die Prüfliste abarbeiten. Eine KI-Visualisierung ersetzt keine technische Zeichnung.",
    ],
  },
  {
    id: "room",
    permission: "planning",
    title: "Einen Grundriss planen",
    intro: "Ein konsistenter Grundriss beginnt mit einem verlässlichen Aufmaß.",
    href: "/studio",
    action: "Grundriss im Studio öffnen",
    steps: [
      "Eine Raumplanung anlegen oder das vorbereitete Beispiel öffnen. Eine vorhandene Planquelle zuordnen und ihren Maßstab prüfen.",
      "Über „Hinzufügen“ einen Raum und seine Öffnungen anlegen. Mit „Bearbeiten“ ein Bauteil wählen, unter „Eigenschaften“ (mobil „Details“) seine Angaben ändern. Unter der Zeichnung mm, cm oder m wählen. Türanschläge, Wandstärken und Höhen mit den tatsächlichen Maßen vergleichen.",
      "In 2D die Raumaufteilung und Bemaßung prüfen, in 3D Material und räumliche Wirkung. Änderungen speichern und anschließend die Prüfliste öffnen.",
    ],
  },
  {
    id: "finance",
    permission: "billing",
    title: "Rechnungen nachvollziehbar vorbereiten",
    intro: "Ein Entwurf ist noch keine ausgestellte Rechnung.",
    href: "/invoices",
    action: "Rechnungen öffnen",
    steps: [
      "Kunde, Auftrag, Rechnungsart und Leistungsdatum prüfen. Positionen und Steuerangaben vervollständigen.",
      "Die Akte zeigt fehlende Voraussetzungen. Firmierung, Steuerprofil und Archivnachweis müssen betrieblich bestätigt sein.",
      "Ausgestellte Belege bleiben unverändert. Korrekturen erfolgen über den vorgesehenen Berichtigungsweg. Testbelege tragen ausdrücklich „TEST“.",
    ],
  },
  {
    id: "purchasing",
    permission: "purchasing",
    title: "Einkauf und Lieferanten",
    intro: "Bedarf, Bestellung und Wareneingang sind getrennte Vorgänge.",
    href: "/purchase-orders",
    action: "Bestellungen öffnen",
    steps: [
      "Lieferant und Bestellpositionen auswählen; Liefertermin und Auftragsbezug ergänzen.",
      "Vor einer verbindlichen Bestellung Preise, Mengen und Empfänger prüfen. Ein gespeicherter Entwurf ist noch nicht versendet.",
      "Lieferung und Rechnung anhand der Bestellung prüfen. Abweichungen dokumentieren, bevor Bestände oder Kosten bestätigt werden.",
    ],
  },
  {
    id: "inventory",
    permission: "inventory",
    title: "Material im Lager finden",
    intro:
      "Lagerort, Menge und Zustand machen Rohplatten und Reststücke nutzbar.",
    href: "/stock",
    action: "Lager öffnen",
    steps: [
      "Artikel oder Werkstück suchen und den Lagerort kontrollieren. Individuelle Platten und Reststücke behalten ihre eigene Kennung.",
      "Reservierungen vor einer Entnahme prüfen und Bewegungen mit dem passenden Auftrag erfassen.",
      "Bei einer Inventur tatsächlich gezählte Mengen eintragen. Differenzen erst nach Prüfung auflösen.",
    ],
  },
  {
    id: "team",
    permission: "hr",
    title: "Team und Zuständigkeiten einrichten",
    intro:
      "Persönliche Zugänge und Beschäftigtenakten haben unterschiedliche Aufgaben.",
    href: "/team",
    action: "Team öffnen",
    steps: [
      "Beschäftigtenakte mit Arbeitsmodell und Beginn anlegen. Beispielpersonal ist als Testdatensatz gekennzeichnet.",
      "Unter „Zugänge & Rollen“ persönliche Konten zuordnen. Nur die für die Arbeit benötigten Rechte vergeben.",
      "Abwesenheiten, Ansprüche und Kostensätze mit belegten betrieblichen Angaben hinterlegen.",
    ],
  },
  {
    id: "dispatch",
    permission: "dispatch",
    title: "Einsätze in der Disposition planen",
    intro:
      "Monat, Woche und Tag verbinden den Überblick mit konkreten Einsätzen.",
    href: "/dispatch?mode=month",
    action: "Disposition öffnen",
    steps: [
      "Monat, Woche oder Tag auswählen und bei Bedarf nach Mitarbeiter filtern. Mit den Pfeilen wechseln Sie den Zeitraum.",
      "Einen Tag auswählen, um die Einsätze zu sehen. Ein Eintrag öffnet die Akte mit Auftrag, Mitarbeiter, Beginn, Ende und Einsatzort.",
      "Neue Einsätze über „Einsatz anlegen“ vorbereiten. Überschneidungen, Abwesenheiten und benötigte Geräte prüfen, bevor Sie einen Einsatz bestätigen.",
    ],
  },
  {
    id: "time",
    permission: "time",
    title: "Arbeitszeit erfassen",
    intro:
      "Start, Pause, Wechsel und Feierabend begleiten den tatsächlichen Arbeitstag.",
    href: "/time",
    action: "Meine Zeit öffnen",
    steps: [
      "Den passenden Auftrag auswählen und die Arbeit starten. Bei einer Unterbrechung „Pause“ verwenden.",
      "Beim Wechsel den nächsten Auftrag wählen; am Ende die Arbeit beenden. Nachträge brauchen tatsächliche Zeiten und einen Grund.",
      "Offline erfasste Aktionen bleiben auf diesem Gerät und werden bei Verbindung synchronisiert. Vor dem Abmelden auf ungesendete Zeiten achten.",
    ],
  },
  {
    id: "documents",
    permission: "documents",
    title: "Unterlagen ablegen und wiederfinden",
    intro:
      "Dokumente werden dem richtigen Kunden, Auftrag oder Planungsstand zugeordnet.",
    href: "/documents",
    action: "Dokumente öffnen",
    steps: [
      "Datei auswählen, eine verständliche Bezeichnung vergeben und den Fachbezug auswählen.",
      "Nach dem Upload die Dateiprüfung abwarten. Eine noch gesperrte Datei ist kein fehlgeschlagener Upload.",
      "Über die Suche wiederfinden. Neue Fassungen als Versionen führen, statt wichtige Originale zu überschreiben.",
    ],
  },
  {
    id: "reports",
    permission: "reports",
    title: "Auswertungen richtig lesen",
    intro:
      "Zahlen sind nur mit Zeitraum, Datenstand und bestätigten Grundlagen aussagekräftig.",
    href: "/reports",
    action: "Auswertungen öffnen",
    steps: [
      "Zeitraum und Berechtigung prüfen. Fehlende Kostensätze oder unbestätigte Vorgänge erscheinen als Datenlücken.",
      "Kennzahlen bis zu den zugrunde liegenden Aufträgen und Belegen verfolgen.",
      "Im gekennzeichneten Testbetrieb enthalten die Auswertungen Beispieldaten. Daraus keine betrieblichen Entscheidungen ableiten.",
    ],
  },
  {
    id: "ai",
    permission: "admin.integrations",
    title: "KI-Verbrauch und Verbindungen",
    intro: "Sie bestimmen Zugang, Modelle und Budget der Suite.",
    href: "/settings?tab=usage",
    action: "KI-Verbrauch öffnen",
    steps: [
      "Auf dem Dashboard „Verbrauch im Detail“ wählen und den Monat einstellen. Aufgabenarten und Modelle lassen sich direkt vergleichen.",
      "Geschätzte Kosten beruhen auf dem gespeicherten Preisprofil. Offene Kosten sind keine Nullbeträge; die Anbieterabrechnung bleibt maßgeblich.",
      "Unter „Integrationen“ können Sie später den OpenAI-Schlüssel und SMTP-Zugang ersetzen. Ein Verbindungstest startet ausdrücklich einen kleinen kostenpflichtigen Aufruf.",
    ],
  },
];
export const faqs = [
 {permission:'time',q:'Wie kann ich meinen Tag prüfen und abgeben?',a:'Im Tagesverlauf den richtigen Tag wählen. „Tag prüfen & abgeben“ öffnet die Zusammenfassung mit Arbeitszeit, tatsächlichen Pausen und Zuordnungen. Erst „Tag verbindlich einreichen“ gibt diesen Stand zur Prüfung ab. Fehlende Angaben vorher korrigieren; nach der Abgabe kann die prüfende Person eine begründete Rückfrage zurückgeben.'},
 {permission:'time.approve',q:'Wie prüfe ich als Personalverwaltung fremde Zeiten und Korrekturen?',a:'Unter Arbeitszeit oben „Teamzeiten prüfen“ wählen. Tätigkeit und Anlass stehen im lesbaren Nachweis. Für Korrekturen werden bisheriger und beantragter Stand gezeigt. Eigene Abgaben genehmigt eine andere berechtigte Person. Fehlende Arbeitsmodelle oder Ansprüche anhand bestätigter Personalgrundlagen ergänzen.'},

  {
    permission:"planning",q: "Wie bewege ich eine Inschrift direkt auf dem Stein?",
    a: "Wählen Sie „Inschrift ergänzen“, geben Sie Text, Entwurfsschrift und Höhe ein. Der sichtbare Text lässt sich auf dem Stein ziehen. Im Eigenschaftenbereich finden Sie Zentrieren, Drehung sowie u und v für die genaue Lage. Pfeiltasten bewegen um 1 mm, Umschalt und Pfeiltaste um 10 mm. „Am Raster einrasten“ und „An Objekten fangen“ können Sie einzeln ausschalten; Alt setzt das Einrasten beim Ziehen kurz aus.",
  },
  {
    permission:"planning",q: "Wie ändere ich Steinformen, einzelne Ecken oder Radien?",
    a: "Wählen Sie das Bauteil und öffnen Sie „Geometrie & Ausschnitte“. „Grundform und Außenmaße ändern“ bietet 14 bearbeitbare Formen. Unter „Ecken runden und Radien einstellen“ wählen Sie eine einzelne Ecke oder einen Kreisbogen. Kantenprofile für die Bearbeitung der Steinkante werden separat zugeordnet. „Rückgängig“ nimmt eine Gestaltungsänderung zurück.",
  },
  {
    permission:"planning",q: "Kann ich das Planungsstudio im Vollbild öffnen?",
    a: "Ja. Im geöffneten Plan steht oben „Vollbild“. Dadurch haben Zeichnung und Eigenschaften mehr Platz. Mit „Vollbild beenden“ kehren Sie zurück. Unterstützt der Browser keinen Geräte-Vollbildmodus, vergrößert die App den Arbeitsbereich innerhalb des Fensters.",
  },
  {
    permission:"planning",q: "Zeigt die Steinbibliothek das genaue Foto meiner Lieferplatte?",
    a: "Sie enthält reale Handelsnamen und Quellenlinks. Die sichtbaren Strukturmuster dienen der Materialvorstellung. Das genaue Plattenbild, Maße, Oberfläche, Verfügbarkeit und Eignung prüfen Sie anhand des konkreten Lieferantenmusters. Eigene Materialstände können Sie ergänzen.",
  },
  {
    q: "Was wird beim Feedback mitgesendet?",
    a: "Ihr Name, die aktuelle Seite und Ihr Kommentar. Optional kommen bis zu 40 ausgewählte Bedienschritte aus den letzten 15 Minuten, Browsertyp, Fenstergröße und App-Version hinzu. Feldinhalte, Passwörter, Dateien und Bildschirmaufnahmen werden nicht automatisch erfasst. Der Verlauf bleibt bis zum bewussten Absenden im Arbeitsspeicher des Browserfensters; es gibt keine laufenden Protokoll-Uploads.",
  },
  {
    q: "Wo finde ich den Feedback-Button?",
    a: "Im Testbetrieb rechts unten auf internen Seiten, sofern der Superadmin ihn eingeschaltet hat. Mit Alt + Umschalt + F lässt er sich auch bei einem geöffneten Formular aufrufen. Kundenportale haben keinen Feedback-Button. Nach dem Abschalten bleiben bereits eingegangene Rückmeldungen für den Superadmin verfügbar.",
  },
  {
    q: "Wie starte ich die Einführung erneut?",
    a: "Über „Einführung neu starten“ in diesem Hilfebereich. Die Tour führt Sie mit Hervorhebungen und kurzen Erklärungen durch Ihre Seiten. Nach einer Pause bringt „Einführung fortsetzen“ Sie zur gespeicherten Station. Geschäftsdaten werden durch die Tour nicht verändert.",
  },
  {
    q: "Kann ich die Einführung überspringen?",
    a: "Ja. „Für später schließen“ oder die Escape-Taste pausiert die Tour. Mit „Hier selbst ausprobieren“ arbeiten Sie direkt auf der erklärten Seite weiter. Hier können Sie später fortsetzen oder neu beginnen.",
  },
  {
    q: "Was bedeuten Sternchen und ausgegraute Schaltflächen?",
    a: "Ein Sternchen kennzeichnet ein Pflichtfeld. Eine gesperrte Aktion benötigt beispielsweise weitere Angaben, eine Freigabe oder eine passende Rolle. Lesen Sie den Hinweis am Vorgang.",
  },
  {
    q: "Warum sehe ich einen Bereich nicht?",
    a: "Die sichtbaren Bereiche richten sich nach Ihrer persönlichen Rolle. Wenden Sie sich für zusätzliche Rechte an den Superadmin. Ein anderer Zugang sollte nicht geteilt werden.",
  },
  {
    q: "Was passiert mit den Testdaten?",
    a: "Die gekennzeichneten Beispiele dienen der Erprobung. Ihre Datensatzkennungen sind dokumentiert, damit sie vor dem Produktivstart gezielt entfernt werden können. Löschen Sie sie nicht einzeln, wenn andere Beispiele darauf verweisen.",
  },
  {
    q: "Darf ich im Testbetrieb alles verbindlich abschließen?",
    a: "Nutzen Sie zunächst Entwürfe, Planung und interne Prüfungen. Verbindliche Rechnungen, Lieferantenbestellungen und Versand an echte Empfänger gehören nicht zu den Beispielszenarien. Der Testbetrieb ist in der Anwendung sichtbar gekennzeichnet.",
  },
  {
    q: "Speichert die Anwendung jede Eingabe automatisch?",
    a: "Formulare werden über „Speichern“ übernommen. Beachten Sie im Planungsstudio den angezeigten Speicherstand. Wechseln Sie bei ungespeicherten Änderungen erst nach dem Speichern oder bewussten Verwerfen.",
  },
  {
    q: "Kann die KI selbst Angebote oder Rechnungen freigeben?",
    a: "Nein. Der Assistent kann Erklärungen und überprüfbare Vorschläge vorbereiten. Verbindliche Aktionen benötigen Ihre eigene Bestätigung und die passenden Rechte.",
  },
  {
    q: "Warum fehlen Token- oder Kostenangaben?",
    a: "Bei älteren oder unklar abgeschlossenen Aufrufen wurden nicht immer vollständige Verbrauchsdaten übermittelt. Solche Aufrufe bleiben als offen sichtbar. Es werden keine fehlenden Werte erfunden.",
  },
  {
    q: "Sind 3D-Renderings und KI-Bilder dasselbe?",
    a: "Die technische 3D-Ansicht folgt dem gespeicherten Plan. Generative KI-Bilder dienen der visuellen Vorstellung und können von den technischen Maßen abweichen. Nur OpenAI-Aufrufe erscheinen im KI-Verbrauch.",
  },
  {
    q: "Was tun, wenn Speichern fehlschlägt?",
    a: "Die Meldung am Formular lesen und betroffene Felder prüfen. Bei einem Versionskonflikt den aktuellen Stand laden und die Änderung abgleichen. Bei einer Verbindungsstörung Eingaben erhalten und nach Wiederherstellung erneut versuchen.",
  },
  {
    q: "Wo ändere ich Farben oder den Dunkelmodus?",
    a: "Klicken Sie auf Ihren Namen in der Navigation und öffnen Sie „Mein Zugang“. Unter „Ihre Darstellung“ wählen Sie eine Akzentfarbe und Hell, Dunkel oder „Wie mein Gerät“. Speichern Sie Ihre Auswahl. Sie gilt nur für Ihren Zugang, auch auf anderen Geräten. Pläne, Materialien und PDFs behalten ihre fachlichen Farben.",
  },
  {
    q: "Wie melde ich einen Fehler?",
    a: "Notieren Sie Arbeitsbereich, gewünschte Aktion, tatsächliche Meldung und Zeitpunkt. Eine angezeigte Vorgangskennung hilft dem Superadmin bei der Suche. Keine Passwörter oder API-Schlüssel in Screenshots oder Nachrichten aufnehmen.",
  },
];
export function helpFor(permissions: string[]) {
  return guides.filter(
    (g) =>
      !g.permission ||
      permissions.includes(g.permission) ||
      permissions.includes(g.permission + ".read"),
  );
}
export const appearanceStep = {
  id: "appearance",
  permission: "",
  title: "Ihre persönliche Darstellung",
  intro:
    "Wählen Sie, womit Sie gern arbeiten. Diese Auswahl gilt nur für Ihren Zugang und lässt sich später jederzeit ändern.",
  steps: [],
  href: "/account#appearance",
  action: "Meine Einstellungen öffnen",
};
export function onboardingSteps(permissions: string[]) {
  const visible = helpFor(permissions);
  return [
    visible.find((g) => g.id === "orientation")!,
    ...visible.filter((g) => g.id !== "orientation"),
  ].concat(appearanceStep);
}
