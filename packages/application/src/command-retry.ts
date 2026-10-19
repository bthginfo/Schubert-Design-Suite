import{DomainError}from'@schubert/domain';
/** Only PostgreSQL's explicit transaction-abort outcomes are safe to replay. */
export async function retryRolledBackCommand<T>(attempt:()=>Promise<T>,pause:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms))):Promise<T>{
 for(let retry=0;;retry++)try{return await attempt();}catch(error){
  const code=error&&typeof error==='object'&&'code'in error?error.code:null;
  if(code!=='40P01'&&code!=='40001')throw error;
  if(retry===2)throw new DomainError('CONCURRENT_WRITE_BUSY','Mehrere Änderungen treffen gleichzeitig ein. Bitte den unveränderten Vorgang erneut speichern.',503);
  await pause(35*2**retry+Math.floor(Math.random()*30));
 }
}
