import {dec,requireRule} from '@schubert/domain';
const iso=(value:unknown)=>new Date(value as string).toISOString().slice(0,10);
const weekdays=['mon','tue','wed','thu','fri','sat','sun'];
export function paidLeaveSlots(request:{starts_on:any;ends_on:any;days:any},basis:{employment:any[];schedules:any[];calendars:any[]}){
 const start=iso(request.starts_on),end=iso(request.ends_on),length=(Date.parse(end)-Date.parse(start))/86400000+1;
 requireRule(length>0&&length<=366,'LEAVE_INTERVAL','Einen Zeitraum innerhalb eines Kalenderjahres mit höchstens366 Tagen auswählen.');const slots:{on:string;seconds:number;day_fraction:string}[]=[];
 for(let i=0;i<length;i++){
  const current=new Date(Date.parse(start)+i*86400000),on=iso(current),employment=basis.employment.find(p=>iso(p.starts_on)<=on&&(!p.ends_on||iso(p.ends_on)>=on)),schedule=basis.schedules.find(p=>iso(p.valid_from)<=on&&(!p.valid_until||iso(p.valid_until)>=on));
  requireRule(employment&&schedule,'LEAVE_WORK_PATTERN','Für jeden beantragten Tag müssen Beschäftigung und bestätigtes Arbeitsmodell gültig sein.');const calendar=basis.calendars.find(c=>c.region===employment.holiday_region&&Number(c.year)===current.getUTCFullYear());requireRule(calendar&&Array.isArray(calendar.holidays),'LEAVE_CALENDAR','Der bestätigte Feiertagskalender des beantragten Jahres fehlt.');
  const hours=schedule[weekdays[(current.getUTCDay()+6)%7]];requireRule(hours!==null&&hours!==undefined&&dec(hours).gte(0)&&dec(hours).lte(24),'LEAVE_WORK_PATTERN','Bestätigte Tagesstunden fehlen.');if(calendar.holidays.includes(on)||dec(hours).eq(0))continue;
  const fraction=length===1&&dec(request.days).gt(0)&&dec(request.days).lte(1)?dec(request.days):dec(1),seconds=dec(hours).mul(3600).mul(fraction);requireRule(seconds.isInteger(),'LEAVE_PRECISION','Der Abwesenheitsanteil muss sich sekundengenau darstellen lassen.');slots.push({on,seconds:seconds.toNumber(),day_fraction:fraction.toString()});
 }
 requireRule(slots.length>0&&slots.reduce((total,s)=>total.add(s.day_fraction),dec(0)).eq(request.days),'LEAVE_WORKDAYS','Antragstage stimmen nicht mit bestätigtem Arbeitsmodell und Feiertagen überein. Einzelne halbe Tage bitte als eigenen eintägigen Antrag erfassen.');return slots;
}
