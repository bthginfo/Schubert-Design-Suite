import {describe,expect,it} from 'vitest';
import {get} from 'svelte/store';
import {reportStudioAssistantReply,studioAssistantReply,studioReplyKind} from './studio-assistant.ts';

describe('studio assistant reply state',()=>{
  it('labels replies without applicable commands as notes only',()=>{
    expect(studioReplyKind({text:'Transportprüfung …'})).toEqual({kind:'notes',commandCount:0});
    expect(studioReplyKind({proposal:{id:'p',proposedCommands:[]}})).toEqual({kind:'notes',commandCount:0});
    expect(studioReplyKind({proposal:{id:'p',proposedCommands:[{type:'set_design_target'}]}})).toEqual({kind:'proposal',commandCount:1});
  });
  it('stores the reply for the studio variant it was asked about',()=>{
    reportStudioAssistantReply({variantId:'v',revisionId:'r',step:'design'},{text:'Hinweis'});
    expect(get(studioAssistantReply)).toMatchObject({variantId:'v',step:'design',kind:'notes'});
    reportStudioAssistantReply(null,{text:'Suite'});
    expect(get(studioAssistantReply)?.variantId).toBe('v');
  });
});
