import {it,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {evaluationBudget} from '../scripts/ai-quality-budget.js';

it('enforces the agreed total ceiling across evaluation runs and retains uncertain usage',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'schubert-eval-budget-')),path=join(directory,'ledger.json');
  try{
    const first=await evaluationBudget(path,'0.50');
    expect(await first.reserve('0.30')).toBe(true);expect(await first.reserve('0.21')).toBe(false);
    await expect(evaluationBudget(path,'0.50')).rejects.toMatchObject({code:'EEXIST'});
    await first.settle('0.30','0.10',false);expect(first.snapshot()).toMatchObject({spent:'0.1',held:'0.2'});await first.close();
    const second=await evaluationBudget(path,'0.50');expect(await second.reserve('0.21')).toBe(false);expect(await second.reserve('0.20')).toBe(true);
    await second.settle('0.20','0.03',true);expect(second.snapshot()).toMatchObject({spent:'0.13',held:'0.2'});await second.close();
  }finally{
    if(dirname(resolve(directory))!==resolve(tmpdir())||!basename(directory).startsWith('schubert-eval-budget-'))throw Error('Unexpected temporary cleanup path.');
    await rm(directory,{recursive:true,force:true});
  }
});
