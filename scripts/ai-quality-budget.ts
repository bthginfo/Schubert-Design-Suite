import {mkdir,open,readFile,rename,writeFile,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
import {dec} from '@schubert/domain';

/** A shared ceiling across live evaluation runs, including uncertain paid work. */
export async function evaluationBudget(path:string,maximum:string){
  await mkdir(dirname(path),{recursive:true});
  const lock=await open(path+'.lock','wx',0o600);
  let ledger:{spent:string;held:string;currency:'USD';updated?:string}={spent:'0',held:'0',currency:'USD'};
  try{
    try{ledger=JSON.parse(await readFile(path,'utf8'));}catch(error:any){if(error.code!=='ENOENT')throw error;}
    if(ledger.currency!=='USD'||!dec(ledger.spent).gte(0)||!dec(ledger.held).gte(0))throw Error('Invalid evaluation budget ledger.');
  }catch(error){await lock.close();await unlink(path+'.lock');throw error;}
  const save=async()=>{ledger.updated=new Date().toISOString();await writeFile(path+'.next',JSON.stringify(ledger,null,2),{mode:0o600});await rename(path+'.next',path);};
  return{
    snapshot:()=>({...ledger}),
    async reserve(amount:string){
      if(!dec(amount).gt(0)||dec(ledger.spent).add(ledger.held).add(amount).gt(maximum))return false;
      ledger.held=dec(ledger.held).add(amount).toString();await save();return true;
    },
    async settle(reserved:string,actual:string|null,knownOutcome:boolean){
      if(dec(reserved).gt(ledger.held))throw Error('Evaluation reservation mismatch.');
      if(actual!==null){ledger.spent=dec(ledger.spent).add(actual).toString();}
      const release=actual===null?'0':knownOutcome?reserved:dec(actual).lt(reserved)?actual:reserved;
      ledger.held=dec(ledger.held).minus(release).toString();await save();
    },
    async close(){await lock.close();await unlink(path+'.lock');},
  };
}
