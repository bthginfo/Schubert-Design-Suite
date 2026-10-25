export const workspaces = {
  office: {
    title: 'Büro', intro: 'Angebote vorbereiten, Rechnungen bearbeiten und Zahlungen im Blick behalten.',
    cards: [
      {slug:'quotes', label:'Angebote', icon:'file', description:'Entwürfe, Prüfung und Kundenfreigabe.'},
      {slug:'invoices', label:'Rechnungen', icon:'file', description:'Vom Rechnungsentwurf bis zum ausgestellten Beleg.'},
      {slug:'payments', label:'Zahlungen', icon:'check', description:'Eingänge und Ausgänge nachvollziehbar zuordnen.'},
      {slug:'receivables', label:'Offene Forderungen', icon:'clock', description:'Welche Kundenbeträge noch offen sind.', open:true},
      {slug:'payables', label:'Offene Verbindlichkeiten', icon:'calendar', description:'Lieferantenbelege und offene Beträge.', open:true},
      {slug:'datev', label:'DATEV-Übergaben', icon:'download', description:'Belege prüfen und für die Kanzlei zusammenstellen.'},
    ],
    extra:['change-orders','deliveries','acceptances','defects','bank-accounts','bank-imports','bank-transactions','dunning','accounting-periods','cost-estimates','performance-valuations','liquidity-openings','credit-offsets'],
  },
  purchasing: {
    title:'Einkauf & Lager', intro:'Lieferanten, Bestellungen und verfügbares Material an einem Ort.',
    cards:[
      {slug:'purchase-orders',label:'Bestellungen',icon:'briefcase',description:'Bestellbedarf vorbereiten und Lieferungen verfolgen.'},
      {slug:'supplier-invoices',label:'Rechnungseingang',icon:'file',description:'Originale hinzufügen und Eingangsbelege prüfen.'},
      {slug:'stock',label:'Lager & Naturstein',icon:'box',description:'Platten, Reststücke und Materialreservierungen.'},
      {slug:'products',label:'Produkte & Leistungen',icon:'grid',description:'Artikel und Herstellerstände für die Planung.'},
      {slug:'suppliers',label:'Lieferanten',icon:'users',description:'Kontaktdaten und zugehörige Vorgänge.'},
      {slug:'inventory',label:'Inventur',icon:'check',description:'Bestände zählen und Differenzen nachvollziehen.'},
    ],
    extra:['price-imports','sales-prices','stock-locations','goods-receipts','material-requirements','manufacturer-assets'],
  },
} as const;
export type WorkspaceArea = keyof typeof workspaces;
