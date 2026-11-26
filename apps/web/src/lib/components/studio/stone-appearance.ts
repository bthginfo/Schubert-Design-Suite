/**
 * Representative CC0 appearance, separate from the supplier's exact slab photograph.
 * One source of truth for plan, 3D, material library and dialog previews. A colour
 * is only shown when the material data names it (explicit colour property, a colour
 * word in the trade name or catalogue key, or a family with an intrinsic colour).
 * Otherwise the stone is drawn neutral grey and marked „Farbe nicht hinterlegt“.
 */
export type StoneAppearance={known:boolean;color:string;texture:string|null;path:string|null;roughness:number;hint:string|null};
export const UNKNOWN_STONE_COLOR='#b4b6b3';
export const UNKNOWN_STONE_HINT='Farbe nicht hinterlegt';

const tones:Array<[RegExp,string]>=[
  // Belgian bluestone („Belgisch Granit“) is a dark blue-grey limestone, not a blue granite.
  [/belgisch|belgian[- ]blue|blue[- ]limestone|blaustein|bluestone|petit granit/,'#3e4548'],
  [/nero|black|schwarz|impala|anthrazit|preto|belvedere|indian black|devil|assolut|absolute|graphit|basalt|dunkel/,'#343b3a'],
  [/rot\b|rosso|rosa|\bred\b|rainforest brown|multicolou?r/,'#ca9b83'],
  [/green|verde|grün|gruen/,'#80927c'],
  [/azul|blue|blau|turchese/,'#829aa9'],
  [/braun|brown|marrone|mocca|mokka/,'#7d6150'],
  [/bianco|branco|white|weiß|weiss|carrara|mont blanc|statuario|calacatta|thassos|sivec/,'#f1efea'],
  [/grau|grey|gray|grigio|silber|silver|argento/,'#a3a7a4'],
  [/crema|marfil|cream|beige|gelb|giallo|yellow|travertin/,'#d9cbb1'],
];
const familyTones:Record<string,string>={travertin:'#d9cbb1',schiefer:'#626e70'};
const hex=/^#[0-9a-f]{6}$/i;

export function stoneAppearance(material:any):StoneAppearance{
  const properties=material?.properties??{};
  const family=String(properties.family??'').toLowerCase();
  const words=[material?.name,properties.sourceKey,properties.colour,properties.color_name].filter(Boolean).join(' ').toLowerCase();
  const explicit=[properties.color,properties.colour,properties.appearance?.color].find(value=>typeof value==='string'&&hex.test(value));
  const color=explicit??tones.find(([pattern])=>pattern.test(words))?.[1]??familyTones[family]??null;
  const roughness=family==='schiefer'?.78:.3;
  if(!color)return{known:false,color:UNKNOWN_STONE_COLOR,texture:null,path:null,roughness:.6,hint:UNKNOWN_STONE_HINT};
  const white=color==='#f1efea',red=color==='#ca9b83',dark=['#3e4548','#343b3a','#626e70'].includes(color);
  // Texture carries structure only; every view multiplies it with the same colour.
  const texture=['marmor','onyx','quarzit'].includes(family)?(white?'Marble019':'Marble012'):['travertin','kalkstein','sandstein'].includes(family)&&!dark?'Travertine009':red?'Granite006B':'Granite007A';
  return{known:true,color,texture,path:'/planning-materials/'+texture+'-color.jpg',roughness,hint:null};
}
