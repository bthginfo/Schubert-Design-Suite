export function currencyAmount(value:unknown,currency='EUR'){
  if(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))return '—';
  return new Intl.NumberFormat('de-DE',{style:'currency',currency:/^[A-Z]{3}$/.test(currency)?currency:'EUR'}).format(Number(value));
}
export function enteredAmount(value:string){return Number(value.trim().replace(',','.'));}
