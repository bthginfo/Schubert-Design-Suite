import iconv from 'iconv-lite';
import {dec,money,requireRule} from '@schubert/domain';
// DATEV Developer Portal, Buchungsstapel format 700/13, retrieved 2026-10-17.
// https://developer.datev.de/de/file-formats/details/datev-format/getting-started
export const datevColumns=[
 'Umsatz (ohne Soll/Haben-Kz)','Soll/Haben-Kennzeichen','WKZ Umsatz','Kurs','Basis-Umsatz','WKZ Basis-Umsatz','Konto','Gegenkonto (ohne BU-Schlüssel)','BU-Schlüssel','Belegdatum','Belegfeld 1','Belegfeld 2','Skonto','Buchungstext','Postensperre','Diverse Adressnummer','Geschäftspartnerbank','Sachverhalt','Zinssperre','Beleglink',
 ...Array.from({length:8},(_,i)=>['Beleginfo - Art '+(i+1),'Beleginfo - Inhalt '+(i+1)]).flat(),
 'KOST1 - Kostenstelle','KOST2 - Kostenstelle','Kost-Menge','EU-Land u. UStID (Bestimmung)','EU-Steuersatz (Bestimmung)','Abw. Versteuerungsart','Sachverhalt L+L','Funktionsergänzung L+L','BU 49 Hauptfunktionstyp','BU 49 Hauptfunktionsnummer','BU 49 Funktionsergänzung',
 ...Array.from({length:20},(_,i)=>['Zusatzinformation - Art '+(i+1),'Zusatzinformation- Inhalt '+(i+1)]).flat(),
 'Stück','Gewicht','Zahlweise','Forderungsart','Veranlagungsjahr','Zugeordnete Fälligkeit','Skontotyp','Auftragsnummer','Buchungstyp','USt-Schlüssel (Anzahlungen)','EU-Land (Anzahlungen)','Sachverhalt L+L (Anzahlungen)','EU-Steuersatz (Anzahlungen)','Erlöskonto (Anzahlungen)','Herkunft-Kz','Buchungs GUID','KOST-Datum','SEPA-Mandatsreferenz','Skontosperre','Gesellschaftername','Beteiligtennummer','Identifikationsnummer','Zeichnernummer','Postensperre bis','Bezeichnung SoBil-Sachverhalt','Kennzeichen SoBil-Buchung','Festschreibung','Leistungsdatum','Datum Zuord. Steuerperiode','Fälligkeit','Generalumkehr (GU)','Steuersatz','Land','Abrechnungsreferenz','BVV-Position','EU-Land u. UStID (Ursprung)','EU-Steuersatz (Ursprung)','Abw. Skontokonto'
];
const quoted=(value:unknown)=>'"'+String(value??'').replace(/[\x00-\x1f\x7f]/g,' ').replaceAll('"','""')+'"';
export function createDatevLedgerCsv(records:any[],profile:{advisor:string;client:string;accountLength:number;fiscalYear:number},range:{from:string;to:string},createdAt:string){
 requireRule(/^\d{1,7}$/.test(profile.advisor)&&/^\d{1,5}$/.test(profile.client)&&profile.accountLength>=4&&profile.accountLength<=8,'DATEV_PROFILE','DATEV-Grundlagen sind unvollständig.');
 requireRule(datevColumns.length===125,'DATEV_FORMAT','Versionsgebundene DATEV-Spalten stimmen nicht.');
 const stamp=new Date(createdAt).toISOString().replace(/[-:TZ.]/g,'').slice(0,17),from=range.from.slice(0,10).replaceAll('-',''),to=range.to.slice(0,10).replaceAll('-','');
 const header=[quoted('EXTF'),'700','21',quoted('Buchungsstapel'),'13',stamp,'',quoted('RE'),quoted('Schubert'),quoted(''),profile.advisor,profile.client,String(profile.fiscalYear)+'0101',String(profile.accountLength),from,to,quoted('Schubert Belegübergabe'),quoted(''),1,0,0,quoted('EUR'),'',quoted(''),'','',quoted(''),'','',quoted(''),quoted('')];
 const lines=[header.join(';'),datevColumns.map(quoted).join(';')];
 for(const record of records){
  requireRule(record.currency==='EUR','DATEV_CURRENCY','Fremdwährung benötigt bestätigte Umrechnungsdaten; hierfür getrennten Kanzleiablauf verwenden.');
  const date=new Date(record.date);requireRule(!Number.isNaN(date.getTime())&&date.getUTCFullYear()===profile.fiscalYear,'DATEV_DATE','Belegdatum liegt außerhalb des Wirtschaftsjahres.');
  const accounts=record.accounts;requireRule(/^\d{4,9}$/.test(accounts.account)&&/^\d{4,9}$/.test(accounts.counter_account)&&/^\d{0,4}$/.test(accounts.tax_key??''),'DATEV_MAPPING','Bestätigte Konten und Steuerschlüssel fehlen.');
  const number=String(record.number??'').slice(0,36);requireRule(/^[\w\-./ ]*$/.test(number),'DATEV_DOCUMENT_NUMBER','Die Original-Belegnummer benötigt ein ausdrücklich bestätigtes DATEV-Mapping.');
  const values=Array<string>(125).fill('');values[0]=money(dec(record.amount).abs()).replace('.',',');values[1]=quoted((record.direction==='incoming')===dec(record.amount).gte(0)?'S':'H');values[2]=quoted(record.currency);values[6]=accounts.account;values[7]=accounts.counter_account;values[8]=accounts.tax_key??'';values[9]=String(date.getUTCDate()).padStart(2,'0')+String(date.getUTCMonth()+1).padStart(2,'0');values[10]=quoted(number);values[13]=quoted(('Schubert '+(record.kind==='payment'?'Zahlung ':'')+number).slice(0,60));
  // Local ZIP paths are in the manifest. A DATEV Beleglink is only valid after a real Belege-online upload.
  values[19]=quoted('');values[113]='0';lines.push(values.join(';'));
 }
 const source=lines.join('\r\n')+'\r\n',encoded=iconv.encode(source,'windows-1252');requireRule(iconv.decode(encoded,'windows-1252')===source,'DATEV_CHARSET','Ein exportierter Text enthält Zeichen außerhalb des DATEV-Zeichensatzes. Ein geprüftes Textmapping ist erforderlich.');return encoded;
}
