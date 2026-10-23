<script lang="ts">
  import {calculateLines} from '@schubert/domain';
  import {lineSchema} from '@schubert/contracts';
  import type {Row} from '#lib/client/types.ts';
  let {lines,currency='EUR'}:{lines:Row[];currency?:string}=$props();
  const totals=$derived.by(()=>{
    if(!lines.length)return null;
    try{return calculateLines(lines.map(line=>lineSchema.parse(Object.fromEntries(['description','quantity','unit','unit_price','tax_rate','discount_percent','line_type','optional','selected','tax_category','tax_exemption_reason'].filter(key=>line[key]!==undefined).map(key=>[key,line[key]])))));}catch{return null;}
  });
  const selectedCount=$derived(lines.filter(line=>line.line_type==='item'&&(!line.optional||line.selected)).length);
  function money(value:string){try{return new Intl.NumberFormat('de-DE',{style:'currency',currency}).format(Number(value));}catch{return value+' '+currency;}}
</script>

<div class="document-totals" aria-label="Summe der ausgewählten Positionen" aria-live="polite">
  <div class="totals-label"><strong>Summe der Positionen</strong><span>{selectedCount} ausgewählt · Entwurf</span></div>
  {#if totals}<dl><div><dt>Netto</dt><dd>{money(totals.net_total)}</dd></div><div><dt>Umsatzsteuer</dt><dd>{money(totals.tax_total)}</dd></div><div class="gross"><dt>Brutto</dt><dd>{money(totals.gross_total)}</dd></div></dl>{:else}<p>Leistung, Menge, Preis und Steuer vollständig eingeben, um die Summe zu sehen.</p>{/if}
  <p class="totals-note">Abgewählte Optionen zählen nicht mit. Verbindliche Beträge prüft der Server beim Speichern.</p>
</div>

<style>
  .document-totals{margin-top:22px;padding:18px 20px;border:1px solid var(--line);border-radius:13px;background:var(--wash)}
  .totals-label{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}.totals-label strong{font-size:13px}.totals-label span{font-size:11px;color:var(--muted)}
  dl{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin:16px 0 0}dl>div{min-width:0}dt{font-size:12px;color:var(--muted)}dd{margin:4px 0 0;font-size:18px;font-weight:500;letter-spacing:-.025em;font-variant-numeric:tabular-nums;color:var(--ink);overflow-wrap:anywhere}.gross dd{color:var(--forest);font-weight:600}
  .document-totals p{font-size:12px;line-height:1.7;margin-top:12px}.document-totals .totals-note{font-size:11px;color:var(--muted)}
  @media(max-width:500px){.document-totals{padding:16px}dl{gap:9px}dd{font-size:16px}}
</style>
