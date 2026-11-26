import type {Row} from './types.ts';

/**
 * German number entry for editable form values.
 *
 * - `money`: "2.400,00", "2400,5", "2400.50", "2 400,00 €". A single "." followed by exactly
 *   three digits (and no comma) is read as a thousands separator ("2.400" → 2400).
 * - `decimal` / `percent`: a single "." or "," is the decimal separator ("1.5" → 1.5,
 *   "1.234" → 1.234); `percent` also accepts a trailing "%".
 *
 * The result is the canonical decimal string the commands expect ("2400.00"): digits, an
 * optional leading "-" and an optional "." fraction. The typed fraction is kept unchanged, so
 * nothing is rounded on the client.
 */
export type NumberKind='money'|'decimal'|'percent';
export type ParsedNumber={ok:true;value:string;ambiguous:boolean}|{ok:false;empty:boolean};

const invalid:ParsedNumber={ok:false,empty:false};
const grouped=(value:string,separator:'.'|',')=>(separator==='.'?/^\d{1,3}(?:\.\d{3})+$/:/^\d{1,3}(?:,\d{3})+$/).test(value);

export function parseNumberInput(input:unknown,kind:NumberKind='decimal'):ParsedNumber{
  if(typeof input==='number'){
    // A JavaScript number has no thousands separators; never reinterpret 1.234 as 1234.
    const value=Number.isFinite(input)?String(input):'';
    return /^-?\d+(?:\.\d+)?$/.test(value)?{ok:true,value:value==='-0'?'0':value,ambiguous:false}:{ok:false,empty:!value};
  }
  let text=String(input??'').trim();
  if(kind==='money')text=text.replace(/€|EUR/gi,'').trim();
  if(kind==='percent')text=text.replace(/%$/,'').trim();
  if(!text)return {ok:false,empty:true};
  let sign='';
  if(/^[-−]/.test(text)){sign='-';text=text.slice(1).trim();}
  else if(text.startsWith('+'))text=text.slice(1).trim();
  if(/\s/.test(text)){
    // Spaces only as thousands groups: "2 400,00".
    if(!/^\d{1,3}(?:\s\d{3})+(?:[.,]\d*)?$/.test(text))return invalid;
    text=text.replace(/\s/g,'');
  }
  if(!/^[\d.,]+$/.test(text)||!/\d/.test(text))return invalid;
  const commas=text.split(',').length-1,dots=text.split('.').length-1;
  let integer=text,fraction='',ambiguous=false;
  if(commas&&dots){
    // Both present: the last one is the decimal separator, the other one groups thousands.
    const decimal=text.lastIndexOf(',')>text.lastIndexOf('.')?',':'.',group=decimal===','?'.':',';
    if(text.split(decimal).length!==2)return invalid;
    [integer,fraction]=text.split(decimal);
    if(!grouped(integer,group))return invalid;
    integer=integer.split(group).join('');
  }else if(commas){
    if(commas>1)return invalid;
    [integer,fraction]=text.split(',');
  }else if(dots>1){
    if(!grouped(text,'.'))return invalid;
    integer=text.split('.').join('');
  }else if(dots===1){
    const [before,after]=text.split('.');
    ambiguous=/^[1-9]\d{0,2}$/.test(before)&&/^\d{3}$/.test(after);
    if(kind==='money'&&ambiguous)integer=before+after;
    else [integer,fraction]=[before,after];
  }
  if(!integer&&!fraction)return invalid;
  integer=integer.replace(/^0+(?=\d)/,'')||'0';
  const value=sign+integer+(fraction?'.'+fraction:'');
  return {ok:true,value:/^-0(?:\.0*)?$/.test(value)?value.slice(1):value,ambiguous};
}

/** Canonical decimal string, or undefined when the input is empty or not an unambiguous number. */
export function canonicalNumber(input:unknown,kind:NumberKind='decimal'){
  const parsed=parseNumberInput(input,kind);
  return parsed.ok?parsed.value:undefined;
}

/** Command payload value: canonical when valid, `fallback` when empty, otherwise the raw text so the command reports it. */
export function payloadNumber(input:unknown,kind:NumberKind,fallback:string){
  const text=String(input??'').trim();
  if(!text)return fallback;
  return canonicalNumber(text,kind)??text;
}

/**
 * German display of a canonical decimal string that parses back to exactly the same value:
 * money "2400.5" → "2.400,5"; quantities and percentages are not grouped ("1000.5" → "1000,5"),
 * because "1.000" there would mean 1.
 */
export function formatNumberInput(canonical:string,kind:NumberKind='decimal'){
  const match=/^(-?)(\d+)(?:\.(\d+))?$/.exec(canonical);
  if(!match)return canonical;
  return match[1]+(kind==='money'?match[2].replace(/\B(?=(\d{3})+(?!\d))/g,'.'):match[2])+(match[3]?','+match[3]:'');
}

export type LineNumberKey='quantity'|'unit_price'|'tax_rate'|'discount_percent'|'cost_unit';
export const lineNumberKeys:LineNumberKey[]=['quantity','unit_price','tax_rate','discount_percent','cost_unit'];
export const lineNumberKinds:Record<LineNumberKey,NumberKind>={quantity:'decimal',unit_price:'money',tax_rate:'percent',discount_percent:'percent',cost_unit:'money'};
const lineLabels:Record<LineNumberKey,string>={quantity:'Menge',unit_price:'Preis',tax_rate:'Steuersatz',discount_percent:'Rabatt',cost_unit:'Geplante Einzelkosten'};
const formatHelp:Record<LineNumberKey,string>={
  quantity:'Menge als Zahl eingeben, zum Beispiel 1 oder 2,5.',
  unit_price:'Preis als Betrag eingeben, zum Beispiel 2.400,00 oder 2400,50.',
  tax_rate:'Steuersatz in Prozent eingeben, zum Beispiel 19 oder 7.',
  discount_percent:'Rabatt in Prozent eingeben, zum Beispiel 5 oder 2,5.',
  cost_unit:'Kosten als Betrag eingeben, zum Beispiel 120,50.'
};
// Discount and planned costs may stay empty; the payload then sends 0 or "unknown".
const missingHelp:Record<LineNumberKey,string>={quantity:'Bitte eine Menge eingeben.',unit_price:'Bitte einen Einzelpreis eingeben.',tax_rate:'Bitte einen Steuersatz eingeben, zum Beispiel 19.',discount_percent:'',cost_unit:''};
export type LineProblem={index:number;key:LineNumberKey;message:string;summary:string};

/** Inline message for one numeric value of a line; an empty string means it can be saved. */
export function lineNumberProblem(line:Row,key:LineNumberKey):string{
  if((line.line_type??'item')!=='item')return '';
  const parsed=parseNumberInput(line[key],lineNumberKinds[key]);
  if(!parsed.ok)return parsed.empty?missingHelp[key]:formatHelp[key];
  const value=Number(parsed.value);
  if(key==='quantity'&&value<0)return 'Die Menge darf nicht negativ sein.';
  if(key==='cost_unit'&&value<0)return 'Geplante Einzelkosten dürfen nicht negativ sein.';
  if((key==='tax_rate'||key==='discount_percent')&&(value<0||value>100))return `Der ${key==='tax_rate'?'Steuersatz':'Rabatt'} muss zwischen 0 und 100 % liegen.`;
  return '';
}

/** Every numeric problem of the lines in visual order, with a short summary such as "Preis in Position 1 prüfen". */
export function lineProblems(lines:Row[],keys:LineNumberKey[]=lineNumberKeys):LineProblem[]{
  return lines.flatMap((line,index)=>keys.flatMap(key=>{
    const message=lineNumberProblem(line,key);
    if(!message)return [];
    const empty=!String(line[key]??'').trim();
    return [{index,key,message,summary:`${lineLabels[key]} in Position ${index+1} ${empty?'eingeben':'prüfen'}`}];
  }));
}

/** Mon–Fri between two ISO calendar dates, both inclusive. Public holidays are not known here. */
export function weekdaysBetween(start:unknown,end:unknown):number|null{
  const day=(value:unknown)=>{
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const time=Date.parse(value+'T00:00:00Z');
    return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time/86_400_000:null;
  };
  const from=day(start),to=day(end);
  if(from===null||to===null||to<from)return null;
  const total=to-from+1,weeks=Math.floor(total/7);
  let count=weeks*5;
  // Day 0 (1970-01-01) was a Thursday, so (day+4)%7 is 0 for Sunday … 6 for Saturday.
  for(let offset=weeks*7;offset<total;offset++){const weekday=(from+offset+4)%7;if(weekday>=1&&weekday<=5)count++;}
  return count;
}
