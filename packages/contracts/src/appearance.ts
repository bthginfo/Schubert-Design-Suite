import {z} from 'zod';

export const accentNames={forest:'Waldgrün',ocean:'Ozeanblau',violet:'Violett',rose:'Beere',clay:'Terrakotta',slate:'Graphit'} as const;
export const darkAccentNames={forest:'Mintgrün',ocean:'Hellblau',violet:'Flieder',rose:'Rosé',clay:'Apricot',slate:'Silbergrau'} as const;
export const appearanceModes={light:'Hell',dark:'Dunkel',system:'Wie mein Gerät'} as const;
export const appearanceSchema=z.object({accent:z.enum(['forest','ocean','violet','rose','clay','slate']),mode:z.enum(['light','dark','system'])}).strict();
export type Appearance=z.infer<typeof appearanceSchema>;
export const defaultAppearance:Appearance={accent:'forest',mode:'light'};
export const accentPalette={
 forest:{light:'#315c4c',hover:'#244638',dark:'#9fd5ba',darkHover:'#bce8cf'},
 ocean:{light:'#245aa0',hover:'#18437c',dark:'#a3c9ff',darkHover:'#c1dcff'},
 violet:{light:'#6b45a0',hover:'#503178',dark:'#d0b5f6',darkHover:'#e1ccff'},
 rose:{light:'#984368',hover:'#75304f',dark:'#f2b3cd',darkHover:'#ffd0e2'},
 clay:{light:'#934c31',hover:'#723921',dark:'#edb79d',darkHover:'#ffd3bd'},
 slate:{light:'#4b5868',hover:'#34404f',dark:'#bdcbdc',darkHover:'#d7e0ec'}
} as const;
/** Only validated enums enter CSS; no arbitrary user CSS, storage reads or scripts. */
export function appearanceStyle(value:unknown):string{
 const parsed=appearanceSchema.safeParse(value),pref=parsed.success?parsed.data:defaultAppearance,p=accentPalette[pref.accent];
 return `color-scheme:${pref.mode==='system'?'light dark':pref.mode};--forest:light-dark(${p.light},${p.dark});--forest-dark:light-dark(${p.hover},${p.darkHover});--on-accent:light-dark(#ffffff,#15201c);--accent-wash:light-dark(color-mix(in srgb,${p.light} 9%,#fff),color-mix(in srgb,${p.dark} 12%,#1d2421));--canvas:light-dark(#f6f5f2,#151a18);--paper:light-dark(#ffffff,#1d2421);--ink:light-dark(#202522,#ecf0ed);--muted:light-dark(#58625b,#b5c1b9);--line:light-dark(#dfe3de,#46524a);--wash:light-dark(#eeefea,#29332d);--bronze:light-dark(#8a6c44,#dbbd89);--danger:light-dark(#993c35,#ffb3a9);--danger-wash:light-dark(#fff0ed,#402925);--warning:light-dark(#7a581e,#f1cc88);--warning-wash:light-dark(#faf0d9,#393222);--success:light-dark(#315c4c,#a3d8b6);--success-wash:light-dark(#eaf2ec,#26392d);--text:var(--ink);--surface:var(--paper)`;
}
