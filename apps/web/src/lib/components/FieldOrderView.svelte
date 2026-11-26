<script lang="ts">
  // Order file for field roles (Employee, Workshop): where, when and what is open – no
  // commercial figures. The server scopes the order and the own assignments in it.
  import type { AppData, Row } from '#lib/client/types.ts';
  import { display, permitted, recordName } from '#lib/client/api.ts';
  import Icon from './Icon.svelte';
  import Status from './Status.svelte';
  import UploadPanel from './UploadPanel.svelte';

  let { data }: { data: AppData } = $props();
  const record = $derived(data.detail || {});
  const brief = $derived(data.summary?.fieldOrder ?? null);
  const employeeId = $derived(data.context?.employeeId ?? null);
  const assignments = $derived<Row[]>(brief?.assignments ?? []);
  const nextAssignment = $derived(assignments[0] ?? null);
  const navigable = (slug: string) => (data.navigation || []).some((item: { slug: string }) => item.slug === slug);

  const done = ['done', 'completed', 'closed', 'cancelled', 'deleted', 'archived'];
  const workPackages = $derived(
    (data.related?.work_packages || [])
      .filter((item: Row) => !done.includes(item.status))
      .toSorted((a: Row, b: Row) =>
        Number(b.assigned_to === employeeId) - Number(a.assigned_to === employeeId) ||
        Number(b.status === 'in_progress') - Number(a.status === 'in_progress')),
  );
  const defects = $derived((data.related?.defects || []).filter((item: Row) => !done.includes(item.status)));
  const documentsLoaded = $derived(Array.isArray(data.related?.documents));
  const documents = $derived<Row[]>(data.related?.documents || []);
  const plans = $derived<Row[]>(permitted(data, 'planning') ? data.summary?.orderHandoff?.plans ?? [] : []);
  const scope = $derived(
    (data.related?.lines || []).filter((line: Row) => line.line_type !== 'subtotal' && !(line.optional && !line.selected)),
  );

  const phone = $derived(brief?.customer_phone?.replace(/[^0-9+]/g, '') ?? '');
  const place = $derived(brief?.site_address || nextAssignment?.location || brief?.customer_address || '');
  const placeSource = $derived(
    brief?.site_address ? 'Objekt' + (brief.site_name ? ' · ' + brief.site_name : '')
      : nextAssignment?.location ? 'Laut Einsatzplanung'
        : brief?.customer_address ? 'Anschrift des Kunden' : '',
  );
  const locator = $derived([brief?.cemetery_location, brief?.grave_number && 'Grab ' + brief.grave_number].filter(Boolean).join(' · '));
  const canRecordTime = $derived(
    permitted(data, 'time') && !!employeeId && !['cancelled', 'deleted'].includes(record.status),
  );

  const berlinDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
  const clock = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
  const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
  function when(item: Row) {
    const start = new Date(item.starts_at), end = new Date(item.ends_at);
    if (!Number.isFinite(start.getTime())) return '—';
    const today = berlinDay.format(new Date());
    const tomorrow = berlinDay.format(new Date(Date.parse(today + 'T12:00:00Z') + 86_400_000));
    const day = berlinDay.format(start);
    const label = day === today ? 'Heute' : day === tomorrow ? 'Morgen' : weekday.format(start);
    const sameDay = Number.isFinite(end.getTime()) && berlinDay.format(end) === day;
    return `${label}, ${clock.format(start)}${sameDay ? '–' + clock.format(end) : ''}`;
  }
  function packageFacts(item: Row) {
    return [
      item.kind ? display(item.kind) : '',
      item.status === 'in_progress' ? 'In Arbeit' : '',
      item.planned_hours ? display(item.planned_hours, 'planned_hours') + ' h geplant' : '',
      item.due_date ? 'Termin ' + display(item.due_date, 'due_date') : '',
    ].filter(Boolean).join(' · ');
  }
</script>

<div class="field-order">
  <a class="text-link mb" href="/orders"><Icon name="back" size={16} />Aufträge</a>
  <div class="page-heading">
    <div>
      <h1>{recordName(record, data)}</h1>
      <p class="field-order-meta">Auftrag{record.number ? ' · ' + record.number : ''} <Status value={record.status} /></p>
    </div>
    {#if canRecordTime}
      <div class="page-heading-actions">
        <a class="btn primary field-order-start" href={'/time?order=' + encodeURIComponent(record.id)}><Icon name="clock" size={17} />Zeit für diesen Auftrag starten</a>
      </div>
    {/if}
  </div>

  <section class="panel" aria-labelledby="field-order-site">
    <header class="panel-header"><h2 id="field-order-site">Vor Ort</h2></header>
    <dl class="field-order-facts">
      <div>
        <dt><Icon name="user" size={16} />Kunde</dt>
        <dd>{brief?.customer_name || display(record.customer_id, 'customer_id', data)}
          {#if phone}<a class="text-link" href={'tel:' + phone}><Icon name="phone" size={15} />{brief.customer_phone}</a>{/if}
        </dd>
      </div>
      <div>
        <dt><Icon name="map" size={16} />Einsatzort</dt>
        <dd>{place || 'Noch keine Anschrift hinterlegt'}
          {#if placeSource}<span class="muted">{placeSource}</span>{/if}
          {#if locator}<span>{locator}</span>{/if}
        </dd>
      </div>
      {#if record.due_date}
        <div><dt><Icon name="calendar" size={16} />Zieltermin</dt><dd>{display(record.due_date, 'due_date')}</dd></div>
      {/if}
    </dl>
    {#if record.notes}<div class="field-order-notes"><h3>Hinweise zum Auftrag</h3><p>{record.notes}</p></div>{/if}
  </section>

  <section class="panel" aria-labelledby="field-order-assignments">
    <header class="panel-header"><h2 id="field-order-assignments">Ihre Einsätze</h2>{#if assignments.length}<span class="count">{assignments.length}</span>{/if}</header>
    {#each assignments as item (item.id)}
      <a class="field-order-row" href={'/assignments/' + item.id}>
        <Icon name="calendar" size={18} />
        <span><strong>{when(item)}</strong><span>{item.title}</span>{#if item.location}<small>{item.location}</small>{/if}{#if item.status !== 'confirmed'}<Status value={item.status} />{/if}</span>
        <Icon name="chevron" size={16} />
      </a>
    {:else}
      <p class="field-order-empty">Für Sie ist zu diesem Auftrag kein weiterer Einsatz geplant. Fragen Sie bei Bedarf die Disposition.</p>
    {/each}
  </section>

  <section class="panel" aria-labelledby="field-order-packages">
    <header class="panel-header"><h2 id="field-order-packages">Offene Arbeitspakete</h2>{#if workPackages.length}<span class="count">{workPackages.length}</span>{/if}</header>
    {#each workPackages as item (item.id)}
      {@const mine = !!employeeId && item.assigned_to === employeeId}
      <svelte:element this={navigable('work-packages') ? 'a' : 'div'} class="field-order-row" href={navigable('work-packages') ? '/work-packages/' + item.id : undefined}>
        <Icon name="briefcase" size={18} />
        <span><strong>{recordName(item)}</strong>{#if packageFacts(item)}<small>{packageFacts(item)}</small>{/if}<small>{mine ? 'Ihnen zugeteilt' : item.assigned_name ? 'Zuständig: ' + item.assigned_name : 'Zuständigkeit offen'}</small></span>
        {#if navigable('work-packages')}<Icon name="chevron" size={16} />{/if}
      </svelte:element>
    {:else}
      <p class="field-order-empty">Zu diesem Auftrag sind keine Arbeitspakete offen.</p>
    {/each}
  </section>

  {#if defects.length}
    <section class="panel" aria-labelledby="field-order-defects">
      <header class="panel-header"><h2 id="field-order-defects">Offene Mängel</h2><span class="count">{defects.length}</span></header>
      {#each defects as item (item.id)}
        <svelte:element this={navigable('defects') ? 'a' : 'div'} class="field-order-row" href={navigable('defects') ? '/defects/' + item.id : undefined}>
          <Icon name="alert" size={18} />
          <span><strong>{recordName(item)}</strong>{#if item.due_date}<small>Frist {display(item.due_date, 'due_date')}</small>{/if}</span>
          {#if navigable('defects')}<Icon name="chevron" size={16} />{/if}
        </svelte:element>
      {/each}
    </section>
  {/if}

  {#if documentsLoaded || plans.length}
    <section class="panel" aria-labelledby="field-order-documents">
      <header class="panel-header"><h2 id="field-order-documents">Unterlagen</h2>{#if documents.length}<span class="count">{documents.length}</span>{/if}</header>
      {#each plans as plan (plan.id)}
        <a class="field-order-row" href={'/studio/' + plan.id}><Icon name="pen" size={18} /><span><strong>{plan.name}</strong><small>Planung öffnen</small></span><Icon name="chevron" size={16} /></a>
      {/each}
      {#each documents as document (document.id)}
        <div class="field-order-row">
          <Icon name="file" size={18} />
          <span><strong>{recordName(document)}</strong><small>{display(document.created_at, 'created_at')}</small></span>
          {#if ['clean', 'released', 'available', 'archived'].includes(document.scan_status || document.status)}
            <a class="btn small" data-sveltekit-reload download href={'/api/v1/documents/' + document.id + '/download'}><Icon name="download" size={16} />Download</a>
          {:else}<Status value={document.scan_status || document.status} />{/if}
        </div>
      {:else}
        {#if !plans.length}<p class="field-order-empty">Zu diesem Auftrag sind noch keine Unterlagen hinterlegt.</p>{/if}
      {/each}
      {#if assignments.length && !plans.length}<p class="field-order-hint">Freigegebene Pläne finden Sie im jeweiligen Einsatz.</p>{/if}
    </section>
    {#if permitted(data, 'documents.upload')}<UploadPanel {data} entityType="orders" entityId={record.id} />{/if}
  {/if}

  {#if scope.length}
    <details class="panel field-order-scope">
      <summary class="panel-header"><h2>Leistungsumfang</h2><span class="count">{scope.length}</span></summary>
      <ul>
        {#each scope as line (line.id)}
          <li class:heading={line.line_type === 'heading'}>
            <span>{line.description}</span>
            {#if !['heading', 'text'].includes(line.line_type) && line.quantity != null}<small>{display(line.quantity, 'quantity')} {display(line.unit)}</small>{/if}
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style>
  .field-order { max-width: 58rem; }
  .field-order .page-heading h1 { overflow-wrap: anywhere; }
  .field-order-meta { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }
  .field-order-start { min-height: 48px; }
  .field-order .panel { margin-bottom: 1rem; }
  .field-order-facts { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .field-order-facts > div { min-width: 0; padding: 1rem 1.25rem; border-bottom: 1px solid var(--line-soft); }
  .field-order-facts dt { display: flex; align-items: center; gap: .5rem; font-size: .85rem; color: var(--muted); }
  .field-order-facts dd { margin: .35rem 0 0; overflow-wrap: anywhere; font-weight: 550; }
  .field-order-facts dd > span { display: block; margin-top: .2rem; font-weight: 400; font-size: .88rem; }
  .field-order-facts dd > a { display: inline-flex; align-items: center; gap: .4rem; min-height: 44px; margin-top: .1rem; }
  .field-order-notes { padding: 1rem 1.25rem; }
  .field-order-notes h3 { font-size: .85rem; font-weight: 600; color: var(--muted); }
  .field-order-notes p { margin-top: .35rem; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .92rem; }
  .field-order-row {
    min-height: 60px; display: flex; align-items: center; gap: .75rem; padding: .7rem 1.25rem;
    border-bottom: 1px solid var(--line-soft); color: var(--ink); text-decoration: none;
  }
  .field-order-row:last-child { border-bottom: 0; }
  a.field-order-row:hover { background: var(--wash); }
  .field-order-row > :global(svg) { flex: none; color: var(--muted); }
  .field-order-row > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .field-order-row > span > span, .field-order-row small { display: block; }
  .field-order-row small { margin-top: .15rem; color: var(--muted); font-size: .82rem; }
  .field-order-row :global(.status) { margin-top: .35rem; }
  .field-order-row .btn { flex: none; min-height: 44px; }
  .field-order-empty, .field-order-hint { margin: 0; padding: 1rem 1.25rem; color: var(--muted); font-size: .9rem; }
  .field-order-hint { padding-top: .25rem; font-size: .82rem; }
  .field-order-scope summary { cursor: pointer; list-style: none; }
  .field-order-scope summary::-webkit-details-marker { display: none; }
  .field-order-scope ul { margin: 0; padding: .5rem 1.25rem 1rem; list-style: none; }
  .field-order-scope li { display: flex; justify-content: space-between; gap: 1rem; padding: .45rem 0; border-bottom: 1px solid var(--line-soft); font-size: .9rem; }
  .field-order-scope li:last-child { border-bottom: 0; }
  .field-order-scope li span { min-width: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
  .field-order-scope li small { flex: none; color: var(--muted); }
  .field-order-scope li.heading { font-weight: 600; border-bottom: 0; padding-top: .8rem; }
  @media (max-width: 560px) {
    .field-order-facts { grid-template-columns: 1fr; }
    .field-order-start { width: 100%; justify-content: center; }
    .field-order-row { padding-inline: 1rem; }
    .field-order-row .btn { padding-inline: .7rem; }
  }
</style>
