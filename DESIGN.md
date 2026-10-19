---
name: "SCHUBERT Design Suite"
description: "Bestehendes ruhiges Arbeitswerkzeug mit persönlicher Akzentfarbe und Hell-/Dunkeldarstellung."
colors:
  forest: "light-dark(#315c4c,#9fd5ba)"
  forest-dark: "light-dark(#244638,#bce8cf)"
  ocean: "light-dark(#245aa0,#a3c9ff)"
  ocean-hover: "light-dark(#18437c,#c1dcff)"
  violet: "light-dark(#6b45a0,#d0b5f6)"
  violet-hover: "light-dark(#503178,#e1ccff)"
  rose: "light-dark(#984368,#f2b3cd)"
  rose-hover: "light-dark(#75304f,#ffd0e2)"
  clay: "light-dark(#934c31,#edb79d)"
  clay-hover: "light-dark(#723921,#ffd3bd)"
  slate: "light-dark(#4b5868,#bdcbdc)"
  slate-hover: "light-dark(#34404f,#d7e0ec)"
  on-accent: "light-dark(#ffffff,#101827)"
  canvas: "light-dark(#f6f5f2,#0d1422)"
  paper: "light-dark(#ffffff,#151f30)"
  ink: "light-dark(#202522,#eef3fc)"
  muted: "light-dark(#58625b,#b8c6d9)"
  line: "light-dark(#dfe3de,#40546e)"
  wash: "light-dark(#eeefea,#1c2b40)"
  bronze: "light-dark(#8a6c44,#dbbd89)"
  danger: "light-dark(#993c35,#ffb3a9)"
  danger-wash: "light-dark(#fff0ed,#37232d)"
  warning: "light-dark(#7a581e,#f1cc88)"
  warning-wash: "light-dark(#faf0d9,#302c24)"
  success: "light-dark(#315c4c,#a3d8b6)"
  success-wash: "light-dark(#eaf2ec,#18332f)"
  accent-wash: "light-dark(color-mix(in srgb,#315c4c 9%,#fff),color-mix(in srgb,#9fd5ba 12%,#151f30))"
typography:
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.035em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "-.025em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-.01em"
  body-copy:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "-.01em"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "-.01em"
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-.01em"
  mobile-field:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-.01em"
rounded:
  studio-field: "4px"
  status: "6px"
  control: "8px"
  choice: "10px"
  panel: "12px"
  modal: "14px"
spacing:
  compact-gap: "8px"
  control-gap: "9px"
  mobile-inline: "20px"
  field-column-gap: "22px"
  field-row-gap: "24px"
  panel-inset: "26px"
  page-inline: "43px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  button-primary-hover:
    backgroundColor: "{colors.forest-dark}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  button-danger:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 13px"
  navigation-active:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "11px 15px"
  status-success:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.success}"
    rounded: "{rounded.status}"
    padding: "4px 8px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "26px"
  appearance-choice:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.choice}"
    padding: "12px 5px"
  disclosure:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.choice}"
    padding: "14px 16px"
---

# Design System: SCHUBERT Design Suite

## Overview

**Creative North Star: "Das ruhige Arbeitswerkzeug"**

Die SCHUBERT Design Suite ist ein hochwertiges, ruhiges Arbeitswerkzeug für einen Handwerksbetrieb. Die Oberfläche unterstützt deutschsprachige Menschen mit unterschiedlicher digitaler Erfahrung durch klare Beschriftungen, sichtbare Zustände und vertraute Formularabläufe. Die bestätigte Richtung bleibt sachlich: Inter, warme helle Flächen und Waldgrün als Schubert-Standard.

Die persönliche Darstellung erweitert diese bestehende Identität um sechs geprüfte Farbfamilien und die Modi Hell, Dunkel und Wie mein Gerät. Sie verändert den Bedienrahmen, nicht die fachliche Bedeutung von Plänen, Originalschriftbildern oder Materialien. Abstände, Typografie und bestehende Komponentenformen bleiben erhalten.

**Key Characteristics:**

- Ruhige, flächige Oberflächen mit präzisen Konturen.
- Akzent für Handlung, Navigation und Auswahl; eigene Bedeutungsfarben für Status.
- Lesbare deutsche Namen, ergänzende Symbole und sichtbarer Tastaturfokus.
- Persönliche Auswahl mit Vorschau und ausdrücklichem Speichern.

Dies ist eine Bestandsdokumentation der persönlichen Darstellung und der weiterentwickelten Bedienmuster für Begleiter, Einführung und Arbeitsbereiche, keine neue Produkt- oder Markenpositionierung. Produktkontext: [PRODUCT.md](PRODUCT.md) und [Master-Spezifikation](docs/master-specification.md), insbesondere Kapitel 3. Die Erweiterungen übernehmen die bestätigte Identität und ergänzen nur im Code belegte, wiederverwendbare Regeln.

## Colors

Warme neutrale Arbeitsflächen und gezielt eingesetzte Akzentflächen tragen die bestehende Gestaltung. Die normativen Werte stehen im Frontmatter; `light-dark()` enthält jeweils die helle und die dunkle Ausprägung.

### Primary

Die Farbfamilie ist eine persönliche Auswahl, keine zusätzliche Hierarchie von Markenfarben:

| Schlüssel | Name im hellen Modus | Name im dunklen Modus | Hover-Token |
| --- | --- | --- | --- |
| forest | Waldgrün | Mintgrün | forest-dark |
| ocean | Ozeanblau | Hellblau | ocean-hover |
| violet | Violett | Flieder | violet-hover |
| rose | Beere | Rosé | rose-hover |
| clay | Terrakotta | Apricot | clay-hover |
| slate | Graphit | Silbergrau | slate-hover |

Die Palette stammt aus `accentPalette`, die sichtbaren Namen aus `accentNames` und `darkAccentNames` in [appearance.ts](packages/contracts/src/appearance.ts). Der bestehende CSS-Name `--forest` bezeichnet zur Laufzeit den ausgewählten Akzent; `--forest-dark` bezeichnet dessen Hover-Zustand, auch bei einer anderen Farbfamilie. Die alternativen Palettenschlüssel im Frontmatter sind keine zusätzlichen globalen CSS-Variablen.

`on-accent` trägt Text und Symbole auf der Akzentfläche. `accent-wash` ist eine zurückgenommene Auswahlfläche. Das Frontmatter zeigt dessen Schubert-Standard; die zentrale Funktion berechnet dieselbe Mischung mit der tatsächlich ausgewählten Familie. Das ist eine gleichmäßige Farbfläche, kein Verlauf.

### Neutral

- **canvas:** Hintergrund des persönlichen Arbeitsbereichs.
- **paper:** Karten, Formulare, Kopfleisten und Bedienelemente; der Name bezeichnet hier eine UI-Fläche, nicht das physische Zeichenpapier.
- **ink / muted:** Primärer und sekundärer Text. Platzhalter verwenden im Anwendungsrahmen `muted` mit voller Deckkraft.
- **line:** Konturen und Trennlinien.
- **wash:** Zurückgesetzte Flächen, Seitennavigation und unterstützende Bereiche.
- **bronze:** Bestehender unterstützender Farbwert; kein weiterer frei wählbarer Akzent.

### Semantische Zustände

`danger`, `warning` und `success` mit ihren jeweiligen `-wash`-Flächen sind feste Bedeutungsrollen. Die zugehörigen Texte und Symbole bleiben auch ohne Farbwahrnehmung verständlich.

**The Akzent und Bedeutung Rule.** Die persönliche Akzentfarbe kennzeichnet Bedienung und Auswahl. Fehler, Warnung und Erfolg behalten ihre eigenen semantischen Farben und verständliche Texte.

**The Original bleibt Original Rule.** Technisches Zeichenpapier, Originalschriftbilder, reale Materialien, native 3D-Inhalte und erzeugte PDF-Inhalte behalten ihre fachlichen Farben.

Die zentrale Funktion `appearanceStyle()` setzt `color-scheme` und sämtliche `light-dark()`-Werte serverseitig inline an der `.app-shell`-Grenze. Statische Komponentenstyles lesen semantische `var(...)`-Tokens. Die bestehenden Aliase `--text` und `--surface` zeigen auf `--ink` und `--paper`. Diese Grenze verhindert, dass der CSS-Build die Umschaltung in versteckte private Hilfsvariablen verschiebt.

Der Standard ist Waldgrün und Hell. Im Gerätemodus entscheidet der Browser über die Darstellung; es entstehen keine Theme-Abfragen, Polling-Schleifen oder KI-Aufrufe. Die persönliche Auswahl wird pro Zugang in der jeweiligen juristischen Einheit gespeichert und mit der bestehenden Seitendatenabfrage geladen. Die Vorschau besitzt ihre eigene Darstellungsgrenze, damit eine ungespeicherte Auswahl sichtbar wird.

## Typography

**Display Font:** Inter, sans-serif  
**Body Font:** Inter, sans-serif  
**Label/Mono Font:** Inter; Zahlen erhalten dort tabellarische Ziffern, wo die bestehenden Komponenten dies vorsehen.

Die lokal eingebundenen Inter-Schnitte tragen die sachliche, gut lesbare Hierarchie. Die hier erfassten Rollen beschreiben die tatsächliche Kaskade in [app.css](apps/web/src/app.css); sie ersetzen keine vorhandenen Spezialregeln durch eine neue globale Skala.

### Hierarchy

- **Headline:** Seitenüberschrift; mobil verwendet die bestehende Regel eine kleinere Ausprägung (28px).
- **Title:** Abschnittsüberschriften in regulären Panels.
- **Body:** Grundschrift des Anwendungsrahmens.
- **Body copy:** Erklärende Texte; Seitenbeschreibungen reichen bis zur bestehenden Textbreite (72ch).
- **Label:** Feldbeschriftungen und kompakte Bedieninformationen.
- **Button:** Reguläre Schaltflächen mit eigener Zeilenhöhe.
- **Mobile field:** Eingaben auf kleinen Bildschirmen; die bestehende mobile Größe bleibt erhalten.

Studioinspektor, Statuslabels und weitere kompakte Bereiche haben eigene Bestandsgrößen. Diese Dokumentation ist kein Auftrag, sie pauschal anzugleichen.

**The Bestehende Schrift Rule.** Inter bleibt die bestehende Anwendungsschrift. Ein generischer Design-Detektorhinweis auf Inter ist als bekannte Bestandsentscheidung akzeptiert und kein Auftrag zum Schriftaustausch.

## Layout

Die Desktopoberfläche besteht aus fester linker Seitennavigation, oberer Kontextleiste und begrenztem Inhaltsbereich. Die bestehende Seitenbreite beträgt maximal (1640px); die Seitennavigation ist regulär (246px) und unter dem kompakten Desktop-Breakpoint (215px) breit. Die im Frontmatter genannten Abstände sind beobachtete Rollenwerte, keine neu eingeführten Runtime-Tokens.

Reguläre Panels nutzen denselben Aufbau aus Kopf, Inhalt und optionalem Aktionsfuß. Formularfelder stehen auf breiten Ansichten meist in zwei Spalten. Die Auswahl der sechs Farbfamilien erscheint in sechs Spalten, unter (650px) in drei Spalten; die drei Modusoptionen werden dann untereinander angezeigt. Die Vorschau darf umbrechen, ohne Text oder Aktion abzuschneiden.

Unter dem bestehenden mobilen Breakpoint (760px) wechseln Navigation und Inhalte in die mobile Anordnung. Reguläre Schaltflächen und Eingaben behalten mobile Mindesthöhen von (48px); große Schaltflächen verwenden den bestehenden höheren Wert. Aktionsfüße und lange Schaltflächentexte dürfen umbrechen. Die Bereichsnavigation wird mobil zur beschrifteten nativen Auswahl. Aktiviertes Testfeedback erhält einen eigenen Platz in der vorhandenen unteren Navigation; der schwebende Einstieg bleibt auf Desktopansichten beschränkt.

Begleiter und Dialoge begrenzen ihre Höhe am sichtbaren Fenster. Lange Inhalte und erweiterte Optionen scrollen innerhalb der Oberfläche, während die primären Aktionen erreichbar bleiben. Der Begleiter ist auf breiten Ansichten ein rechter, nichtmodaler Arbeitsbereich; mobil schützt eine Fokusbegrenzung die geöffnete Ansicht. Die Einführung liegt als nativer Dialog über der tatsächlichen Seite und ordnet ihre Erklärung am hervorgehobenen Bedienelement an. Ihre Karte bleibt innerhalb des Fensters; auf kleinen Ansichten bleibt der Aktionsfuß sichtbar.

**The Erreichbare Aktion Rule.** Lange Beschriftungen dürfen umbrechen. Scrollbare Inhalte, Dialoge und Hilfeansichten halten ihre Abschluss- und Schließaktionen erreichbar; schwebendes Feedback verdeckt keine geöffnete Hilfe oder modale Oberfläche.

Das Studio behält seine eigene räumliche Struktur aus Elementliste, Arbeitsansicht und Inspektor. Seine bestehenden Breakpoints sind gesondert im Sidecar erfasst; sie werden durch die Darstellungserweiterung nicht vereinheitlicht.

## Elevation & Depth

Die Anwendung gliedert reguläre Oberflächen primär durch Tonwerte und feine Konturen. Bestehende Überlagerungen und ausgewählte Studiozustände nutzen begrenzte Schatten. Die tatsächlich verwendeten Schattenwerte stehen ausschließlich in den Erweiterungen des Sidecars; es werden keine neuen Tiefenstufen eingeführt.

**The Fläche vor Schatten Rule.** Reguläre Bedienflächen werden durch Tonwert und Kontur gegliedert. Bestehende Schatten dienen begrenzten Überlagerungen oder Zuständen; zusätzliche dekorative Schatten sind nicht Bestandteil dieser Erweiterung.

Kurze bestehende Zustandsübergänge unterstützen Hover, Fokus und Navigation. Die globale Regel für reduzierte Bewegung bleibt wirksam. Die persönliche Darstellung braucht keine zusätzliche Animation.

## Shapes

Reguläre Bedienelemente haben sanft gerundete Ecken; Panels und Dialoge sind etwas stärker gerundet. Farboptionen behalten ihre eigenen Auswahlkarten und runden Farbfelder. Studiofelder bleiben in ihrer vorhandenen kompakteren Form. Die Rollenwerte im Frontmatter dokumentieren diese Unterschiede und sind kein Vereinheitlichungsauftrag.

Konturen verwenden den semantischen Linienwert. Auswahl wird durch Kombination aus Kontur, Fläche und erkennbarem Auswahlzeichen vermittelt. Farbfelder sind Kreise (34px); ein Häkchen ergänzt die gewählte Option.

## Components

### Buttons

Primäraktionen nutzen den gewählten Akzent mit `on-accent`; Hover nutzt den passenden familienabhängigen Hover-Wert. Sekundäre Aktionen stehen auf `paper`, Ghost-Aktionen sind im Ruhezustand transparent. Gefahrenaktionen nutzen `danger` und `danger-wash`. Reguläre Buttons haben eine bestehende Mindesthöhe (44px), mobil (48px); das Frontmatter-Padding beschreibt den Desktopzustand. Beschriftungen umbrechen innerhalb der verfügbaren Breite, ergänzende Symbole schrumpfen nicht. Der aktive Zustand verschiebt eine bedienbare Schaltfläche leicht (1px). Deaktivierte Aktionen bleiben als solche erkennbar.

### Inputs / Fields

Eingaben verwenden `paper`, `ink` und `line`, eine sichtbare Beschriftung sowie bedarfsgerechte Hilfe oder Fehlermeldung. Platzhalter sind ergänzende Hinweise und behalten im Anwendungsrahmen `muted` bei voller Deckkraft. Ungültige Felder verwenden die semantische Fehlerkontur. Die vorhandenen Fokusregeln verwenden sichtbare Akzentkonturen; ihre Breite unterscheidet sich je nach bestehendem Selektor (2–3px).

### Navigation

Die aktive Seitennavigation verwendet Akzentfläche und `on-accent`, einschließlich des Symbols. Inaktive Einträge bleiben zurückgenommen. Tabs kennzeichnen die aktive Ansicht durch Akzenttext und Unterstreichung. Bezeichnungen und die jeweils vorhandene semantische Auswahlkennzeichnung bleiben erhalten.

Die gemeinsame Bereichsnavigation zeigt bis zu vier Kernbereiche und hält den aktuell geöffneten Bereich sichtbar. **Alle Bereiche** öffnet ein durchsuchbares Verzeichnis unterhalb der Leiste; Escape schließt es und führt den Fokus zum Auslöser zurück. Die Verzeichnislinks nutzen `wash` und Akzenttext für die Auswahl. Auf kleinen Bildschirmen übernimmt eine native Auswahl die vollständige Liste.

### Disclosures

Wiederverwendbare aufklappbare Hilfen verwenden native `details`/`summary`, eine zurückgesetzte Fläche und einen sichtbaren Richtungsindikator. Die globale Zusammenfassung ist mindestens (48px), mobil (50px) hoch; lokale Begleiter- und Formularvarianten behalten ihre belegten Abweichungen. Der Indikator dreht sich beim Öffnen. Ein vorhandenes abschließendes Symbol ersetzt den zusätzlichen Indikator. Tastaturfokus bleibt sichtbar und lange Titel dürfen umbrechen.

### Begleiter, Dialoge und Einführung

Der Begleiter trennt **Hilfe für diese Seite** und **Chat** mit beschrifteten Auswahlflächen. Lokale Hilfen bestehen aus einer kurzen Einordnung, aufklappbaren Schritten und passenden Aktionen. Chatvorschläge landen zuerst im Eingabefeld; die sichtbare Senden-Aktion startet die Anfrage. Unterlagen und Modelloptionen bleiben in einer aufklappbaren Gruppe. Nachrichten und prüfbare Vorschläge verwenden die vorhandenen semantischen Flächen und Konturen.

Der Desktopbegleiter bleibt rechts neben der Arbeit verfügbar. Mobil begrenzt er den Tastaturfokus und stellt ihn beim Schließen wieder her. Native Dialoge für Einführung, Feedback und Studioabläufe schützen den modalen Fokus; bestehende andere Dialoge behalten ihre Fokusbegrenzung. Fehlerrückmeldungen erscheinen innerhalb der betroffenen Oberfläche und werden dort sichtbar fokussiert. Inhaltsbereiche dürfen scrollen, ohne die abschließenden Aktionen wegzuschieben.

Die Einführung hebt reale, sichtbare Seitenbereiche mit Akzentkontur und abgedunkeltem Umfeld hervor. Schrittzahl, verständliche Erklärung, Zurück/Weiter und eine Möglichkeit zum späteren Fortsetzen bleiben an der Karte zusammen. Die persönliche Darstellung bildet den letzten Schritt. Position und Größe der Karte richten sich nach dem tatsächlichen Bedienelement und dem sichtbaren Fenster, nicht nach festen Bildschirmkoordinaten.

### Monatsauswertungen

Monatsbalken beginnen bei null und führen zu den zugehörigen Belegen. Ein fehlender bestätigter Wert erhält einen offenen Kreis und eine verständliche Beschriftung. Mobil wird derselbe Zeitraum als Folge lesbarer Zeilen mit Monat, ausgeschriebenem Wert und Balken dargestellt. Tabellarische Ziffern erleichtern den Vergleich; negative Werte verwenden die semantische Warnfarbe. Ein Datenloch erhält keinen erfundenen Balken.

### Chips / Status

Statuslabels kombinieren Text und, wo vorhanden, einen ergänzenden Punkt mit der semantischen Zustandsfläche. Ihre Farbe folgt der Bedeutung und nicht der persönlichen Akzentwahl.

### Cards / Containers

Panels verwenden `paper` mit feiner Kontur und getrennten Kopf-, Inhalts- und Aktionsbereichen. Die Farbwahl verändert ihre Flächen und Texte, nicht die etablierte Struktur oder Inhaltsdichte.

### Persönliche Darstellung

[AppearancePicker.svelte](apps/web/src/lib/components/AppearancePicker.svelte) ist das gemeinsame Element in persönlichen Einstellungen und im letzten Einführungsschritt. Native Radiogruppen, sichtbare Namen, Fokusrahmen und das Häkchen machen die Auswahl bedienbar. `AccentName` zeigt stets den Namen der tatsächlich gerenderten hellen oder dunklen Farbe, auch bei der Geräteeinstellung.

Die Vorschau ändert sich sofort; die übrige Anwendung folgt nach **Darstellung speichern** oder **Einführung abschließen**. **Schubert-Standard auswählen** setzt die Auswahl auf Waldgrün und Hell zurück und erfordert anschließend Speichern. Ladezustände sperren doppelte Bedienung; Erfolg und Fehler erhalten verständliche Rückmeldung.

Fehler beim Speichern der Einführung erscheinen innerhalb der Tourkarte. Die Meldung wird fokussiert und in den sichtbaren Bereich gebracht. Im Studio zeigt der gemeinsame Auswahlversatz kurze sichtbare X-/Y-/Z-Beschriftungen mit Einheit und vollständigen zugänglichen Eingabenamen.

### Quellen und Prüfevidenz

Maßgeblich sind [appearance.ts](packages/contracts/src/appearance.ts), [app.css](apps/web/src/app.css), [AppearanceSettings.svelte](apps/web/src/lib/components/AppearanceSettings.svelte), [Onboarding.svelte](apps/web/src/lib/components/Onboarding.svelte), [Studio.svelte](apps/web/src/lib/components/Studio.svelte) und dessen Unterkomponenten. Betriebsverhalten ist in [Persönliche Darstellung](docs/operations/personal-appearance.md) dokumentiert.

Die ergänzten Bedienmuster sind außerdem in [Assistant.svelte](apps/web/src/lib/components/Assistant.svelte), [CompanionHome.svelte](apps/web/src/lib/components/CompanionHome.svelte), [SectionNavigation.svelte](apps/web/src/lib/components/SectionNavigation.svelte), [TrendPlot.svelte](apps/web/src/lib/components/reporting/TrendPlot.svelte), [FeedbackWidget.svelte](apps/web/src/lib/components/FeedbackWidget.svelte) und dem gemeinsamen Seitenrahmen belegt. Diese Quellenaufnahme ergänzt die Systemdokumentation; sie ist keine neue Gesamtfreigabe.

Die dreizehn aktuellen Aufnahmen unter `.impeccable/review/appearance-*.png` belegen den visuellen Kontext einschließlich mobiler und großer Ansichten sowie gezielt ausgelöster Speicherfehler. Die abschließende fokussierte Nachprüfung der drei Befunde zu Fehlerrückmeldung, Achsenbeschriftung und Platzhalterkontrast ergab am 18.10.2026 **ship**; alle drei sind **resolved**. Diese Wertung gilt für den geprüften Korrektursatz. Der umfassendere Testumfang und seine Grenzen sind in `docs/qa/personal-appearance-2026-10-18.md` dokumentiert.

## Do's and Don'ts

### Do:

- **Do** vorhandene semantische Farbvariablen für Bedienflächen, Text, Konturen, Auswahl und Status verwenden.
- **Do** Farbfeld und sichtbaren Farbnamen auf den gewählten Vorschau-Modus abstimmen, einschließlich der Geräteeinstellung.
- **Do** Text oder Symbol zusätzlich zur Farbe verwenden und Tastaturfokus sichtbar halten.
- **Do** die vorhandenen Abstands-, Typografie- und Responsive-Regeln weiterverwenden; komponentenspezifische Unterschiede bleiben dokumentierter Bestand.
- **Do** Originalschriftbilder, Zeichenpapier, Materialien, 3D-Inhalte und PDF-Farben fachlich unverändert darstellen.
- **Do** Speichern, Ladezustand, Erfolg und Fehler nachvollziehbar anzeigen und Fehlermeldungen nach der auslösenden Aktion fokussieren.
- **Do** lange Aktionsnamen umbrechen lassen und bei scrollbaren Dialog- und Hilfeinhalten die Abschlussaktionen erreichbar halten.
- **Do** umfangreiche Bereichslisten und ergänzende Hilfen über beschriftete, tastaturbedienbare Auswahl- und Aufklappmuster zugänglich machen.
- **Do** fehlende bestätigte Diagrammwerte ausdrücklich benennen und auf kleinen Bildschirmen lesbare Monatszeilen verwenden.

### Don't:

- **Don't** persönliche Akzentfarben als Ersatz für Fehler-, Warn- oder Erfolgsfarben einsetzen.
- **Don't** Inter wegen eines generischen Detektorhinweises austauschen oder aus dieser Erweiterung eine neue Markenidentität ableiten.
- **Don't** freie CSS-Farbwerte, neue Farbverläufe oder zusätzliche Paletten aus den Dokumentationsbeispielen ableiten.
- **Don't** light-dark()-Deklarationen in statische UI-Styles verschieben, wenn der Build daraus private Hilfsvariablen erzeugt; die zentrale Inline-Grenze bleibt maßgeblich.
- **Don't** Theme-Polling, KI-Aufrufe oder zusätzliche Gerätemodus-Schreibvorgänge einführen.
- **Don't** diesen dokumentierten Implementierungsstand als abgeschlossene fachliche oder visuelle Gesamtfreigabe ausgeben.


## Navy and studio interaction - 19 October 2026

The requested dark visual world uses navy backgrounds, a separate navigation depth and slightly raised work surfaces. Directed shadows remain restrained; accent choices retain distinct light/dark names and contrast. Technical drawing paper keeps its physical light color. Studios offer fullscreen, directly visible lettering, independent grid display/object snapping/grid snapping, shape choices, per-corner radius controls and a sourced material library. Shape and material selection use visual previews; technical manufacturer evidence remains separate from the design preview.
