import {one,rows,type DbClient} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {requireRule,assertFreshAuth,assertVersion,dec} from '@schubert/domain';
import {register,getRecord} from './core.js';
const date=(value:unknown)=>new Date(value instanceof Date?value:typeof value==='number'?value:String(value)).toISOString().slice(0,10);
const days=['mon','tue','wed','thu','fri','sat','sun'];
for(const [prefix,table]of Object.entries({'workforce.employment':'employment_periods','workforce.schedule':'work_schedules','workforce.cost_rate':'employee_cost_rate_versions','workforce.entitlement':'leave_entitlements','workforce.calendar':'work_calendars','workforce.time_opening':'time_account_openings','workforce.time_adjustment':'time_account_adjustments'})){
 register(prefix+'.approve','hr',async r=>{
  assertFreshAuth(r.ctx.reauthenticatedAt);const record=await getRecord(r.db,table,r.command.id,true);assertVersion(record.version,r.command.expectedVersion);requireRule(record.status==='draft','HR_STATE','Nur den ungeprüften Stand bestätigen.');requireRule(String(r.payload.reason??'').trim().length>=5,'REASON_REQUIRED','Prüfung und fachliche Grundlage dokumentieren.');
  if(record.employee_id)await getRecord(r.db,'employees',record.employee_id,true);const data:Record<string,unknown>={status:'approved',notes:r.payload.reason};
  if(table==='work_schedules'){for(const key of days)requireRule(record[key]!==null&&dec(record[key]).gte(0)&&dec(record[key]).lte(24),'WORK_PATTERN','Alle sieben Tagesstunden zwischen 0 und 24 bestätigen.');requireRule(days.reduce((sum,key)=>sum+Number(record[key]),0)>0,'WORK_PATTERN','Arbeitsmodell benötigt positive Wochenstunden.');}
  if(table==='employment_periods')requireRule(record.weekly_hours!==null&&dec(record.weekly_hours).gt(0)&&record.holiday_region,'EMPLOYMENT_PROFILE','Wochenstunden und Feiertagsregion bestätigen.');
  if(table==='employee_cost_rate_versions')requireRule(dec(record.rate).gte(0)&&record.currency==='EUR','COST_RATE','Bestätigten internen Kostensatz in EUR angeben.');
  if(table==='leave_entitlements'){requireRule(Number.isInteger(record.year)&&record.year>=2000&&record.year<=2100,'LEAVE_YEAR','Jahr prüfen.');if(['annual','confirmed_annual'].includes(record.kind)){const prior=await one(r.db,"SELECT id FROM leave_entitlements WHERE employee_id=$1 AND year=$2 AND kind IN('annual','confirmed_annual') AND status='approved'",[record.employee_id,record.year]);requireRule(!prior,'ANNUAL_EXISTS','Jahresanspruch ist bereits bestätigt. Eine begründete Korrektur verwenden.');}}
  if(table==='work_calendars'){const dates=String(record.holiday_dates??'').split(/[\s,;]+/).filter(Boolean);requireRule(dates.length<=366&&dates.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&date(d)===d&&Number(d.slice(0,4))===record.year),'CALENDAR_DATES','Feiertage mit echtem Datum innerhalb des Kalenderjahres angeben.');data.holidays=[...new Set(dates)].sort();}
  if(['time_account_openings','time_account_adjustments'].includes(table)){const seconds=dec(record.hours).mul(3600);requireRule(seconds.isInteger()&&seconds.abs().lte(2147483647),'TIME_ACCOUNT_VALUE','Zeitbetrag muss sich sekundengenau darstellen lassen.');requireRule(record.employee_id!==r.ctx.employeeId,'SELF_APPROVAL','Eigene Kontogrundlagen bestätigt eine zweite berechtigte Person.');data.seconds=seconds.toNumber();if(table==='time_account_adjustments')await r.insert('time_account_ledger',{employee_id:record.employee_id,submission_id:null,effective_on:record.effective_on,seconds:seconds.toNumber(),kind:'adjustment:'+record.id,source_version:record.version,status:'confirmed'});}
  if(['work_calendars','time_account_openings','time_account_adjustments'].includes(table))Object.assign(data,{approved_at:new Date(),approved_by:r.ctx.actorId});return r.update(table,record.id,data,record.version);
 });
}
export async function timeAccountBalance(db:DbClient,ctx:ActorContext){
 if(!ctx.employeeId)return {timeBalance:null,timeBalanceMessage:'Zuerst einen persönlichen Beschäftigtenstamm zuordnen.'};
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date()),asOf=date(Date.parse(today)-86400000);
 const opening=await one<any>(db,"SELECT * FROM time_account_openings WHERE employee_id=$1 AND status='approved' AND as_of<=$2::date ORDER BY as_of DESC LIMIT 1",[ctx.employeeId,asOf]);
 if(!opening)return {timeBalance:null,timeBalanceMessage:'Bestätigter Anfangssaldo fehlt. HR kann eine Zeitkonto-Eröffnung hinterlegen.'};
 const from=date(opening.as_of),n=(Date.parse(asOf)-Date.parse(from))/86400000+1;requireRule(n<=3660,'TIME_ACCOUNT_RANGE','Für mehr als zehn Jahre eine abgeglichene neue Eröffnung verwenden.');
 const data=await one<any>(db,`SELECT
 (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM(SELECT * FROM employment_periods WHERE employee_id=$1 AND status IN('active','approved') ORDER BY starts_on DESC)x) employment,
 (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM(SELECT * FROM work_schedules WHERE employee_id=$1 AND status='approved' ORDER BY valid_from DESC)x) schedules,
 (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM(SELECT region,year,holidays FROM work_calendars WHERE status='approved' AND year BETWEEN EXTRACT(year FROM $2::date) AND EXTRACT(year FROM $3::date))x) calendars,
 (SELECT COALESCE(sum(l.seconds),0)::text FROM time_account_ledger l LEFT JOIN time_submissions s ON s.id=l.submission_id LEFT JOIN time_corrections c ON c.id=l.correction_id LEFT JOIN time_sessions t ON t.id=c.session_id WHERE l.employee_id=$1 AND COALESCE(l.effective_on,s.starts_on,(t.started_at AT TIME ZONE 'Europe/Berlin')::date) BETWEEN $2::date AND $3::date) actual`,[ctx.employeeId,from,asOf]);
 let target=dec(0);for(let i=0;i<n;i++){
  const point=new Date(Date.parse(from)+i*86400000),day=point.toISOString().slice(0,10),employment=data.employment.find((p:any)=>date(p.starts_on)<=day&&(!p.ends_on||date(p.ends_on)>=day));if(!employment)continue;
  const schedule=data.schedules.find((s:any)=>date(s.valid_from)<=day&&(!s.valid_until||date(s.valid_until)>=day)),calendar=data.calendars.find((c:any)=>c.region===employment.holiday_region&&c.year===point.getUTCFullYear());
  if(!schedule||!calendar)return {timeBalance:null,timeBalanceAsOf:asOf,timeBalanceMessage:!schedule?'Für einen Zeitraum fehlt das bestätigte Arbeitsmodell.':'Der bestätigte Feiertagskalender fehlt für einen Zeitraum.'};
  if(!calendar.holidays.includes(day))target=target.add(dec(schedule[days[(point.getUTCDay()+6)%7]]??0).mul(3600));
 }
 const seconds=dec(opening.seconds).add(data.actual).minus(target);return {timeBalance:seconds.div(3600).toNumber().toLocaleString('de-DE',{maximumFractionDigits:2})+' h',timeBalanceAsOf:asOf,timeBalanceMessage:'Abgeglichener Anfangssaldo + bestätigte Arbeit/Gutschriften − Sollstunden, bis einschließlich '+new Intl.DateTimeFormat('de-DE').format(new Date(asOf))+'.'};
}
