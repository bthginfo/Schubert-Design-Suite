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
 return `color-scheme:${pref.mode==='system'?'light dark':pref.mode};--forest:light-dark(${p.light},${p.dark});--forest-dark:light-dark(${p.hover},${p.darkHover});--on-accent:light-dark(#ffffff,#101827);--accent-wash:light-dark(color-mix(in srgb,${p.light} 9%,#fff),color-mix(in srgb,${p.dark} 12%,#151f30));--canvas:light-dark(#f6f5f2,#0d1422);--paper:light-dark(#ffffff,#151f30);--ink:light-dark(#202522,#eef3fc);--muted:light-dark(#58625b,#b8c6d9);--line:light-dark(#dfe3de,#40546e);--wash:light-dark(#eeefea,#1c2b40);--navigation-surface:light-dark(#eeefea,#101a2b);--surface-raised:light-dark(#ffffff,#1b293d);--surface-shadow:light-dark(0 6px 22px #23354a0b,0 12px 30px #00000029);--overlay-shadow:light-dark(0 18px 60px #23354a22,0 22px 70px #00000066);--bronze:light-dark(#8a6c44,#dbbd89);--danger:light-dark(#993c35,#ffb5af);--danger-wash:light-dark(#fff0ed,#37232d);--warning:light-dark(#7a581e,#f1cc88);--warning-wash:light-dark(#faf0d9,#302c24);--success:light-dark(#315c4c,#a3d8b6);--success-wash:light-dark(#eaf2ec,#18332f);--text:var(--ink);--surface:var(--paper)`;
}
