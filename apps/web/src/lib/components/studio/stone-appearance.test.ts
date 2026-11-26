import {describe,expect,it} from 'vitest';
import {stoneAppearance,UNKNOWN_STONE_COLOR,UNKNOWN_STONE_HINT} from './stone-appearance.ts';

const catalog=(name:string,family:string,sourceKey='')=>({name:name+' · Katalogreferenz',properties:{family,stoneType:family,sourceKey}});

describe('stone appearance',()=>{
  it('draws Belgian bluestone dark, not as beige sandstone',()=>{
    const appearance=stoneAppearance(catalog('Belgisch (Granit)','kalkstein','belgian-blue-limestone'));
    expect(appearance.known).toBe(true);
    expect(appearance.color).toBe('#3e4548');
    expect(appearance.texture).not.toBe('Travertine009');
  });
  it('uses a neutral grey with a hint when the data names no colour',()=>{
    const appearance=stoneAppearance(catalog('Padang TG34 Cristallo','granit','padang-tg34-cristallo'));
    expect(appearance).toMatchObject({known:false,color:UNKNOWN_STONE_COLOR,path:null,hint:UNKNOWN_STONE_HINT});
    expect(stoneAppearance(catalog('Galilee Grey','kalkstein')).known).toBe(true);
    expect(stoneAppearance(null).known).toBe(false);
  });
  it('prefers an explicit colour property and keeps family textures for named colours',()=>{
    expect(stoneAppearance({name:'Hausstein',properties:{family:'granit',color:'#123456'}}).color).toBe('#123456');
    expect(stoneAppearance(catalog('Bianco Carrara','marmor'))).toMatchObject({color:'#f1efea',texture:'Marble019'});
    expect(stoneAppearance(catalog('Jura gelb','kalkstein'))).toMatchObject({color:'#d9cbb1',texture:'Travertine009'});
    expect(stoneAppearance(catalog('Nero Assoluto Zimbabwe','granit','nero-assoluto-zimbawe')).color).toBe('#343b3a');
    // A floor in Botticino shows its cream marble tone in plan and 3D.
    expect(stoneAppearance(catalog('Botticino','marmor'))).toMatchObject({known:true,color:'#d9cbb1',texture:'Marble012'});
  });
});
