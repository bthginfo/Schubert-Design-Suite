import {afterEach,describe,expect,it,vi} from 'vitest';
import {command,RequestError,request,display} from './api';

afterEach(()=>vi.unstubAllGlobals());
describe('confirmed browser command transport',()=>{
  it('formats dates delivered as Date objects by SvelteKit instead of hiding them',()=>{
    expect(display(new Date('2026-10-17T08:30:00Z'),'created_at')).toContain('17.10.2026');
    expect(display(new Date('2026-10-17T08:30:00Z'),'created_at')).toContain('10:30');
    expect(display(new Date('invalid'),'created_at')).toBe('—');
  });
  it('keeps the same idempotency key after an unknown network result',async()=>{
    const bodies:any[]=[];let attempt=0;
    vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{
      bodies.push(JSON.parse(String(options.body)));
      if(attempt++===0)throw new Error('response lost after a possible server commit');
      return Response.json({ok:true,result:{id:'confirmed-object',version:1}});
    }));
    await expect(command('crm.customer.create',undefined,{name:'Synthetic transport fixture'})).rejects.toBeInstanceOf(RequestError);
    await expect(command('crm.customer.create',undefined,{name:'Synthetic transport fixture'})).resolves.toEqual({id:'confirmed-object',version:1});
    expect(bodies[0].idempotencyKey).toBe(bodies[1].idempotencyKey);
    expect(bodies[0].payload).toEqual(bodies[1].payload);
  });
  it('uses a new key for a deliberately repeated operation after a confirmed result',async()=>{
    const keys:string[]=[];
    vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{keys.push(JSON.parse(String(options.body)).idempotencyKey);return Response.json({ok:true,result:{version:2}});}));
    await command('inventory.stock.move','synthetic-stock',{kind:'receipt',quantity:'1'},1);
    await command('inventory.stock.move','synthetic-stock',{kind:'receipt',quantity:'1'},1);
    expect(keys[0]).not.toBe(keys[1]);
  });
  it('preserves server field errors and correlation evidence without returning success',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({ok:false,error:{code:'FIELD_REQUIRED',message:'Bitte Namen prüfen.',fields:{name:'Name fehlt.'},correlationId:'synthetic-correlation'}},{status:422})));
    try{await request('/api/v1/commands',{});throw new Error('unexpected success');}
    catch(error){expect(error).toBeInstanceOf(RequestError);expect(error).toMatchObject({code:'FIELD_REQUIRED',fields:{name:'Name fehlt.'},correlationId:'synthetic-correlation'});}
  });
});
