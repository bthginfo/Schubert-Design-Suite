<script lang="ts">
  import type {AppData,Row} from '#lib/client/types.ts';
  import {display} from '#lib/client/api.ts';
  import {currencyAmount} from '#lib/client/finance.ts';
  import Icon from './Icon.svelte';
  let {data,record={},payload=$bindable()}:{data:AppData;record?:Row;payload:Row}=$props();
  const candidates=$derived(data.related?.candidates||record.candidates||[]);
  function choose(candidate:Row){payload={...payload,party_id:candidate.party_id,target_kind:candidate.target_kind,target_id:candidate.target_id};}
</script>
<section class="bank-candidates mb"><h3>Passenden Beleg prüfen</h3><p class="field-help mt">Vorschläge sind eine Orientierung. Vergleichen Sie Geschäftspartner, Betrag und Verwendungszweck. Die Zahlung wird erst mit Ihrer abschließenden Bestätigung gebucht.</p>
  {#if record.duplicate_of_id}<div class="notice warning mt"><Icon name="alert"/><div>Eine ähnliche oder bereits importierte Buchung wurde erkannt. Prüfen Sie den Originalauszug und stellen Sie eine Dublette mit Begründung zurück.</div></div>{/if}
  {#each candidates as candidate}<article class="bank-candidate"><div><h4>{candidate.document_number||'Offener Beleg'} · {candidate.target_kind==='payable'?'Lieferantenverbindlichkeit':'Kundenforderung'}</h4><p class="small mt">{candidate.party_name||display(candidate.party_id,'party_id',data)}</p><p class="small">Offen: <strong>{currencyAmount(candidate.outstanding,candidate.currency)}</strong></p>{#if candidate.reasons?.length}<p class="field-help mt">{candidate.reasons.join(' · ')}</p>{/if}</div><button type="button" class="btn small" onclick={()=>choose(candidate)}>{payload.target_id===candidate.target_id?'Beleg ausgewählt':'Diesen Beleg auswählen'}<Icon name="check" size={15}/></button></article>{/each}
  {#if !candidates.length}<p class="small mt">Noch kein eindeutiger Vorschlag vorhanden. Wählen Sie unten den bekannten Geschäftspartner und bei Bedarf einen offenen Beleg aus. Eine ungeklärte Zahlung kann zunächst ohne Belegzuordnung bleiben.</p>{/if}
</section>
<style>.bank-candidates{padding:20px;border:1px solid var(--line);border-radius:8px;background:var(--wash)}.bank-candidates h3{font-size:17px;font-weight:500}.bank-candidates>.mt{margin-top:12px}.bank-candidate{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid var(--line);margin-top:20px;padding-top:20px}.bank-candidate h4{font-size:14px;font-weight:600}.bank-candidate p.mt{margin-top:7px}.bank-candidate .btn{flex:none}@media(max-width:760px){.bank-candidates{padding:18px}.bank-candidate{align-items:stretch;flex-direction:column;gap:14px}.bank-candidate .btn{min-height:48px}}</style>
