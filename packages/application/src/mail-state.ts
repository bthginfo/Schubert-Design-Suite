/** No transport is invoked while an earlier attempt may already have handed off bytes. */
export function mailAttemptDecision(status:string):'send'|'receipt'|'uncertain'|'blocked'{
 if(status==='provider_accepted')return'receipt';
 if(status==='sending'||status==='outcome_unknown')return'uncertain';
 return status==='queued'?'send':'blocked';
}
export function mailFailureState(code?:string):'queued'|'failed'|'outcome_unknown'{
 if(code==='SMTP_TEMPORARY')return'queued';
 if(['SMTP_REJECTED','INTEGRATION_UNAVAILABLE'].includes(code??''))return'failed';
 return'outcome_unknown';
}
