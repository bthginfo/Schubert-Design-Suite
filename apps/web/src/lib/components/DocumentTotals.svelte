<script lang="ts">
  import {calculateLines} from '@schubert/domain';
  import type {SalesLine} from '@schubert/contracts';
  import {lineProblems,payloadNumber} from '#lib/client/number-input.ts';
  import type {Row} from '#lib/client/types.ts';
  let {lines,currency='EUR'}:{lines:Row[];currency?:string}=$props();
  const units=new Set(['piece','mm','m','m2','m3','kg','h','day','package']);
  const lineTypes=new Set(['item','heading','text','subtotal']);
  // Same parser and fallbacks as the saved payload; the text of a position does not change the sum.
  const summary=$derived.by(():{totals:ReturnType<typeof calculateLines>|null;problems:string[]}=>{
    if(!lines.some(line=>(line.line_type??'item')==='item'))return {totals:null,problems:[]};
    const problems=lineProblems(lines,['quantity','unit_price','tax_rate','discount_percent']).map(problem=>problem.summary);
    if(problems.length)return {totals:null,problems};
    try{
      return {problems:[],totals:calculateLines(lines.map((line):SalesLine=>{
        const item=(line.line_type??'item')==='item';
        const number=(value:unknown,kind:'money'|'decimal'|'percent',fallback:string)=>item?payloadNumber(value,kind,fallback):'0';
        return {
          description:String(line.description??''),
          quantity:number(line.quantity,'decimal','0'),
          unit:units.has(line.unit)?line.unit:'piece',
          unit_price:number(line.unit_price,'money','0'),
          tax_rate:number(line.tax_rate,'percent','0'),
          discount_percent:number(line.discount_percent,'percent','0'),
          line_type:lineTypes.has(line.line_type)?line.line_type:'item',
          optional:!!line.optional,
          selected:!!line.selected,
          // An empty select value means "no special tax case", exactly as the payload omits it.
          tax_category:line.tax_category||null,
          tax_exemption_reason:line.tax_exemption_reason||null,
        };
      }))};
    }catch(cause){return {totals:null,problems:[cause instanceof Error&&cause.message?cause.message.replace(/\.$/,''):'Positionswerte prüfen']};}
  });
  const selectedCount=$derived(lines.filter(line=>(line.line_type??'item')==='item'&&(!line.optional||line.selected)).length);
  function money(value:string){try{return new Intl.NumberFormat('de-DE',{style:'currency',currency}).format(Number(value));}catch{return value+' '+currency;}}
</script>

<div class="document-totals" aria-label="Summe der ausgewählten Positionen" aria-live="polite">
  <div class="totals-label"><strong>Summe der Positionen</strong><span>{selectedCount} ausgewählt · Entwurf</span></div>
  {#if summary.totals}<dl><div><dt>Netto</dt><dd>{money(summary.totals.net_total)}</dd></div><div><dt>Umsatzsteuer</dt><dd>{money(summary.totals.tax_total)}</dd></div><div class="gross"><dt>Brutto</dt><dd>{money(summary.totals.gross_total)}</dd></div></dl>
  {:else if summary.problems.length}<p class="totals-problem">Summe noch nicht berechenbar: {summary.problems[0]}{summary.problems.length>1?` (und ${summary.problems.length-1} weitere Angabe${summary.problems.length===2?'':'n'})`:''}.</p>
  {:else}<p>Fügen Sie eine Leistung mit Menge, Preis und Steuersatz hinzu, um die Summe zu sehen.</p>{/if}
  <p class="totals-note">Abgewählte Optionen zählen nicht mit. Die verbindlichen Beträge werden beim Speichern noch einmal geprüft.</p>
</div>

<style>
  .document-totals{margin-top:22px;padding:18px 20px;border:1px solid var(--line);border-radius:13px;background:var(--wash)}
  .totals-label{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}.totals-label strong{font-size:13px}.totals-label span{font-size:11px;color:var(--muted)}
  dl{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin:16px 0 0}dl>div{min-width:0}dt{font-size:12px;color:var(--muted)}dd{margin:4px 0 0;font-size:18px;font-weight:500;letter-spacing:-.025em;font-variant-numeric:tabular-nums;color:var(--ink);overflow-wrap:anywhere}.gross dd{color:var(--forest);font-weight:600}
  .document-totals p{font-size:12px;line-height:1.7;margin-top:12px}.document-totals .totals-note{font-size:11px;color:var(--muted)}
  .document-totals .totals-problem{color:var(--ink)}
  @media(max-width:500px){.document-totals{padding:16px}dl{gap:9px}dd{font-size:16px}}
</style>
