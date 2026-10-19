export type SearchableOption={index:number;label:string;group:string;disabled:boolean};

/** Local label matching: neither references nor enum values are inferred from typed text. */
export function choiceSearchText(value:string):string{
 return value.normalize('NFKD').replace(/\p{Mark}/gu,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/\s+/g,' ').trim();
}

export function filterChoices(options:SearchableOption[],query:string):SearchableOption[]{
 const terms=choiceSearchText(query).split(' ').filter(Boolean);
 if(!terms.length)return options;
 return options.filter(option=>{const text=choiceSearchText(option.label+' '+option.group);return terms.every(term=>text.includes(term));});
}

/** Navigates actual option indices, retaining disabled results for truthful list display. */
export function nextChoice(options:SearchableOption[],active:number,key:'ArrowDown'|'ArrowUp'|'Home'|'End'):number{
 const enabled=options.filter(option=>!option.disabled);
 if(!enabled.length)return -1;
 if(key==='Home')return enabled[0].index;
 if(key==='End')return enabled[enabled.length-1].index;
 const at=enabled.findIndex(option=>option.index===active);
 if(at<0)return key==='ArrowUp'?enabled[enabled.length-1].index:enabled[0].index;
 return enabled[Math.max(0,Math.min(enabled.length-1,at+(key==='ArrowDown'?1:-1)))].index;
}
