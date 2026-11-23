<script lang="ts">
  import type { AppData } from '#lib/client/types.ts';
  import { display, permitted } from '#lib/client/api.ts';
  import Icon from './Icon.svelte';
  import Status from './Status.svelte';

  let { data }: { data: AppData } = $props();
  const assignment = $derived(data.summary.assignment);
  const can = (permission: string) => permitted(data, permission) || permitted(data, permission + '.read');
  const phone = $derived(assignment?.contact_phone?.replace(/[^0-9+]/g, '') ?? '');
  const locator = $derived([assignment?.cemetery_location, assignment?.grave_number && 'Grab ' + assignment.grave_number]
    .filter(Boolean).join(' · '));
  const address = $derived(assignment?.location || assignment?.site_address || locator);
  const timeHref = $derived('/time?' + new URLSearchParams({ assignment: assignment?.id ?? '' }));
  const stamp = new Intl.DateTimeFormat('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
  });
</script>

{#if assignment}
  <div class="assignment-workspace">
    <div class="page-heading">
      <div class="assignment-heading">
        <Status value={assignment.status}/>
        <h1>{assignment.title}</h1>
        <p>{assignment.order_name}</p>
      </div>
      {#if assignment.canRecordTime}
        <div class="page-heading-actions">
          <a class="btn primary" href={timeHref}><Icon name="clock" size={17}/>Zeit nachtragen</a>
        </div>
      {/if}
    </div>

    <section class="panel assignment-panel" aria-labelledby="assignment-facts-title">
      <header class="panel-header"><h2 id="assignment-facts-title">Vor Ort</h2></header>
      <dl class="assignment-facts">
        <div><dt><Icon name="calendar" size={17}/>Termin</dt>
          <dd><time datetime={new Date(assignment.starts_at).toISOString()}>{stamp.format(new Date(assignment.starts_at))}</time>
            <span class="muted">bis {stamp.format(new Date(assignment.ends_at))}</span></dd>
        </div>
        <div><dt><Icon name="map-pin" size={17}/>Einsatzort</dt>
          <dd>{address || 'Einsatzort offen'}
            {#if assignment.site_address && assignment.site_address !== address}<span class="muted">{assignment.site_address}</span>{/if}
            {#if locator && locator !== address}<span class="muted">{locator}</span>{/if}
          </dd>
        </div>
        <div><dt><Icon name="user" size={17}/>Kundenkontakt</dt>
          <dd>{assignment.contact_name || 'Kontakt offen'}
            {#if phone}<a class="text-link" href={'tel:' + phone}>{assignment.contact_phone}</a>{/if}
          </dd>
        </div>
        <div><dt><Icon name="users" size={17}/>Eingeteilt</dt><dd>{assignment.employee_name}</dd></div>
      </dl>
    </section>

    {#if assignment.plans}
      <section class="panel assignment-panel" aria-labelledby="assignment-plans-title">
        <header class="panel-header"><h2 id="assignment-plans-title">Freigegebene Pläne</h2></header>
        {#each assignment.plans as plan (plan.revision_id)}
          <a class="assignment-plan" data-sveltekit-reload href={'/api/v1/assignments/' + assignment.id + '/plans/' + plan.revision_id}>
            <Icon name="file" size={21}/>
            <span><strong>{plan.project_name}</strong>
              <small>{plan.variant_name ? plan.variant_name + ' · ' : ''}Revision {plan.revision_number}</small>
              <small>Gestaltungsfreigabe · {display(plan.approved_at, 'date')}</small>
            </span>
            <Icon name="chevron" size={18}/>
          </a>
        {:else}
          <p class="panel-body muted">Die freigegebene Fassung erscheint hier nach der Planfreigabe.</p>
        {/each}
      </section>
    {/if}

    <div class="assignment-links">
      {#if can('orders')}<a class="btn" href={'/orders/' + assignment.order_id}><Icon name="briefcase" size={16}/>Zum Auftrag</a>{/if}
      {#if can('dispatch')}<a class="btn" href={'/dispatch/' + assignment.id}><Icon name="calendar" size={16}/>Einsatzplanung öffnen</a>{/if}
    </div>
  </div>
{/if}

<style>
  .assignment-workspace { max-width: 58rem; margin-inline: auto; }
  .assignment-heading { min-width: 0; }
  .assignment-heading h1 { margin-block: .45rem .3rem; overflow-wrap: anywhere; }
  .assignment-panel { margin-bottom: 1rem; }
  .assignment-facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; }
  .assignment-facts > div {
    min-width: 0; padding: 1rem 1.25rem; border-bottom: 1px solid var(--line-soft);
  }
  .assignment-facts dt { display: flex; align-items: center; gap: .5rem; font-size: .87rem; color: var(--muted); }
  .assignment-facts dd { margin: .35rem 0 0; overflow-wrap: anywhere; font-weight: 550; }
  .assignment-facts dd > span, .assignment-facts dd > a { display: block; margin-top: .2rem; }
  .assignment-facts dd > a { width: fit-content; min-height: 44px; display: flex; align-items: center; }
  .assignment-plan {
    min-height: 64px; display: flex; align-items: center; gap: .75rem; padding: .7rem 1.25rem;
    border-bottom: 1px solid var(--line-soft); color: var(--ink); text-decoration: none;
  }
  .assignment-plan:hover { background: var(--wash); }
  .assignment-plan > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .assignment-plan small { display: block; color: var(--muted); }
  .assignment-links { display: flex; gap: .65rem; flex-wrap: wrap; }
  .assignment-links a, .page-heading-actions a { min-height: 44px; }
  @media (max-width: 560px) {
    .assignment-facts { grid-template-columns: 1fr; }
    .page-heading-actions a { width: 100%; }
  }
</style>
