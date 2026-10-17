import { DomainError } from '@schubert/domain';

/** A permanent time conflict needs review, not an endless retry of the same recording. */
export function timeSyncFailure(cause: unknown) {
  const detail=cause as {code?:string;status?:number};
  const error=detail?.code==='23P01'
    ? new DomainError('TIME_OVERLAP','Der aufgezeichnete Zeitraum überschneidet sich mit einer vorhandenen Zeit. Die Originalaufzeichnung bleibt erhalten. Prüfen Sie die betroffenen Zeiten über „Aufzeichnungen klären“.',409)
    : cause;
  const value=error as {code?:string;status?:number};
  const status=value?.code==='DEPENDENCY_WAITING'?'waiting'
    : [401,403].includes(value?.status??0)?'unauthorized'
    : [409,422].includes(value?.status??0)?'conflict':'retry';
  return {status,error:{code:value?.code??'REQUEST_FAILED',message:error instanceof DomainError?error.message:'Die Übertragung ist vorübergehend fehlgeschlagen. Ihre Aufzeichnung bleibt erhalten; versuchen Sie die Synchronisierung später erneut.'}};
}
