import {z} from 'zod';
import {dec,requireRule} from './index.js';
/** Parameters belong to an approved dated rule. The application always emits full EN16931. */
export const invoicePolicySchema=z.object({schemaVersion:z.literal(1),output:z.literal('en16931_hybrid'),firstTransitionEnds:z.iso.date(),secondTransitionEnds:z.iso.date(),turnoverThreshold:z.string().regex(/^\d+(?:\.\d+)?$/),smallInvoiceThreshold:z.string().regex(/^\d+(?:\.\d+)?$/),smallExcludedCategories:z.array(z.enum(['S','Z','E','AE','K','G','O'])),sourceReferences:z.array(z.string().min(8)).min(1)});
export function invoicePolicyDecision(parameters:unknown,input:{serviceDate:string;issuedOn:string;transmissionOn:string;gross:string;taxCategories:string[];recipient:'consumer'|'business'|'public';domestic:boolean;previousYearTurnover:string|null;smallBusiness:boolean}){
 const p=invoicePolicySchema.parse(parameters);for(const day of [input.serviceDate,input.issuedOn,input.transmissionOn])z.iso.date().parse(day);requireRule(input.transmissionOn>=input.issuedOn,'TRANSMISSION_DATE','Die geplante Übermittlung darf nicht vor der Ausstellung liegen.');
 const smallInvoice=dec(input.gross).abs().lte(p.smallInvoiceThreshold)&&!input.taxCategories.some(category=>p.smallExcludedCategories.includes(category as any))&&input.domestic;
 const consumer=input.recipient==='consumer',publicRecipient=input.recipient==='public';
 const firstTransition=input.serviceDate<=p.firstTransitionEnds&&input.transmissionOn<=p.firstTransitionEnds;
 const secondTransition=input.serviceDate<=p.secondTransitionEnds&&input.transmissionOn<=p.secondTransitionEnds&&input.previousYearTurnover!==null&&dec(input.previousYearTurnover).lte(p.turnoverThreshold);
 const exception=consumer?'consumer':input.smallBusiness?'small_business':smallInvoice?'small_invoice':!input.domestic?'cross_border_requires_review':publicRecipient?'public_recipient_requires_profile':firstTransition?'transition_2026':secondTransition?'transition_turnover':'none';
 return{schemaVersion:1,selectedFormat:'en16931_hybrid',serviceDate:input.serviceDate,issuedOn:input.issuedOn,plannedTransmissionOn:input.transmissionOn,recipient:input.recipient,domestic:input.domestic,smallInvoice,previousYearTurnover:input.previousYearTurnover,exception,legacyEligibility:!publicRecipient&&input.domestic&&(consumer||input.smallBusiness||smallInvoice||firstTransition||secondTransition),usesException:false,reason:'Die Suite erstellt unabhängig von einer möglichen Formatvereinfachung ein vollständiges strukturiertes EN16931-Hybridoriginal.',sourceReferences:p.sourceReferences};
}
