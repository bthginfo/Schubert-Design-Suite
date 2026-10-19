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
 return `color-scheme:${pref.mode==='system'?'light dark':pref.mode};--forest:light-dark(${p.light},${p.dark});--forest-dark:light-dark(${p.hover},${p.darkHover});--on-accent:light-dark(#ffffff,#101827);--accent-wash:light-dark(color-mix(in srgb,${p.light} 9%,#fff),color-mix(in srgb,${p.dark} 12%,#182437));--canvas:light-dark(#eef2f7,#0d1422);--paper:light-dark(#ffffff,#182437);--ink:light-dark(#192337,#eef3fc);--muted:light-dark(#5d6a7c,#b8c6d9);--line:light-dark(#dfe5ee,#35465e);--wash:light-dark(#f0f3f8,#1c2b40);--navigation-surface:light-dark(#eef2f7,#101a2b);--workspace-surface:light-dark(#f1f4f9,#0e1726);--input-surface:light-dark(#f8fafc,#111b2b);--line-soft:light-dark(#edf0f5,#2c3b51);--surface-raised:light-dark(#ffffff,#223149);--surface-shadow:0 3px 10px light-dark(#23354a0c,#0000002b);--panel-shadow:0 2px 5px light-dark(#23354a08,#00000024),0 14px 32px light-dark(#23354a0d,#00000029);--overlay-shadow:0 12px 24px light-dark(#23354a17,#00000038),0 28px 72px light-dark(#23354a26,#00000070);--bronze:light-dark(#8a6c44,#dbbd89);--danger:light-dark(#993c35,#ffb5af);--danger-wash:light-dark(#fff0ed,#37232d);--warning:light-dark(#7a581e,#f1cc88);--warning-wash:light-dark(#faf0d9,#302c24);--success:light-dark(#315c4c,#a3d8b6);--success-wash:light-dark(#eaf2ec,#18332f);--text:var(--ink);--surface:var(--paper)`;
}
