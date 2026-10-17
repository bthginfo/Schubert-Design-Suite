import {describe,it,expect} from 'vitest';
import {DomainError} from '@schubert/domain';
import {timeSyncFailure} from './time-sync-errors.js';
describe('Offline time failure classification',()=>{
  it('turns a PostgreSQL exclusion failure into a reviewable overlap without leaking SQL',()=>{
    const result=timeSyncFailure({code:'23P01',message:'private SQL detail'});
    expect(result.status).toBe('conflict');expect(result.error.code).toBe('TIME_OVERLAP');expect(result.error.message).toContain('überschneidet');expect(result.error.message).not.toContain('SQL');
  });
  it('keeps dependent commands waiting while preserving the original explanation',()=>{
    expect(timeSyncFailure(new DomainError('DEPENDENCY_WAITING','Vorherige Aktion fehlt.',409))).toEqual({status:'waiting',error:{code:'DEPENDENCY_WAITING',message:'Vorherige Aktion fehlt.'}});
  });
  it('stops retrying revoked permissions and invalid recordings',()=>{
    expect(timeSyncFailure(new DomainError('FORBIDDEN','Kein Zugriff.',403)).status).toBe('unauthorized');
    expect(timeSyncFailure(new DomainError('TIME_POINT','Zeitpunkt prüfen.',422)).status).toBe('conflict');
  });
  it('allows transient errors to be retried without disclosing infrastructure details',()=>{
    const result=timeSyncFailure(new Error('private database address'));expect(result.status).toBe('retry');expect(result.error.message).not.toContain('database');
  });
});
