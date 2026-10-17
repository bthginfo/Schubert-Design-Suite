import {describe,it,expect} from 'vitest';
import {mailAttemptDecision,mailFailureState} from './mail-state.js';
describe('SMTP ambiguity and replay protection',()=>{
 it('only starts transport for a queued, unsent message',()=>{expect(mailAttemptDecision('queued')).toBe('send');for(const status of ['draft','failed','not_accepted','cancelled'])expect(mailAttemptDecision(status)).toBe('blocked');});
 it('recovers an accepted handoff without invoking transport again',()=>{expect(mailAttemptDecision('provider_accepted')).toBe('receipt');});
 it('does not resend an interrupted or unknown handoff',()=>{expect(mailAttemptDecision('sending')).toBe('uncertain');expect(mailAttemptDecision('outcome_unknown')).toBe('uncertain');});
 it('only retries explicit temporary nonacceptance and preserves ambiguous failures',()=>{expect(mailFailureState('SMTP_TEMPORARY')).toBe('queued');expect(mailFailureState('SMTP_REJECTED')).toBe('failed');expect(mailFailureState('INTEGRATION_UNAVAILABLE')).toBe('failed');for(const code of ['OUTCOME_UNKNOWN','ETIMEDOUT','ECONNRESET','STALE_JOB_FENCE',undefined])expect(mailFailureState(code)).toBe('outcome_unknown');});
});
