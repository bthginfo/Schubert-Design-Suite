import{describe,it,expect}from'vitest';import{retryRolledBackCommand}from'../packages/application/src/command-retry.ts';
describe('Replay only a transaction known to be rolled back',()=>{
 it.each(['40P01','40001'])('replays %s after rollback and returns one committed result',async code=>{let calls=0;const waits:number[]=[];const result=await retryRolledBackCommand(async()=>{if(++calls===1)throw Object.assign(Error('aborted'),{code});return{id:'one-result'};},async delay=>{waits.push(delay);});expect(calls).toBe(2);expect(result.id).toBe('one-result');expect(waits).toHaveLength(1);});
 it.each(['23505','VERSION_CONFLICT','ECONNRESET','OUTCOME_UNKNOWN'])('does not replay %s, including unknown network outcomes',async code=>{let calls=0;await expect(retryRolledBackCommand(async()=>{calls++;throw Object.assign(Error(code),{code});},async()=>{})).rejects.toHaveProperty('code',code);expect(calls).toBe(1);});
 it('bounds contention to three transactions and returns an actionable failure',async()=>{let calls=0;await expect(retryRolledBackCommand(async()=>{calls++;throw{code:'40P01'};},async()=>{})).rejects.toHaveProperty('code','CONCURRENT_WRITE_BUSY');expect(calls).toBe(3);});
});
