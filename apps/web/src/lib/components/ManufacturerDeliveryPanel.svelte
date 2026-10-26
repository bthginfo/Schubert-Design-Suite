<script lang="ts">
  import Icon from "./Icon.svelte";
  import { invalidateAll } from "$app/navigation";
  import { searchableSelect } from "#lib/client/searchable-select.ts";
  import { command, request } from "#lib/client/api.ts";
  import { uploadOriginal } from "#lib/client/uploads.ts";
  import { display } from "#lib/client/api.ts";
  const uid = $props.id();
  let sourceRights = $state(""),
    sourceConfirmed = $state(false);
  let loaded = $state(false);
  let sourceBase64 = $state("");
  let file: File | null = $state(null),
    headers: string[] = $state([]),
    mapping = $state({
      article: "",
      name: "",
      width: "",
      depth: "",
      height: "",
    }),
    unit = $state("mm"),
    sourceUrl = $state(
      "https://pro.duravit.de/pro/html/default/downloadcenter.de-de.html",
    ),
    label = $state(""),
    asset: any = $state(null),
    deliveries: any[] = $state([]),
    selected: any = $state(null),
    busy = $state(false),
    error = $state(""),
    notice = $state("");
  async function refresh() {
    try {
      deliveries = await request(
        "/api/v1/planning/manufacturer-deliveries",
        undefined,
        "GET",
      );
      if (selected)
        selected = deliveries.find((row) => row.id === selected.id) ?? selected;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  async function choose(event: Event) {
    const chosen = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!chosen) return;
    if (chosen.size > 650000) {
      error =
        "Für diese Lieferung eine CSV bis 650 KB verwenden. Größere Artikelbestände in Lieferungen aufteilen.";
      return;
    }
    const bytes = new Uint8Array(await chosen.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    sourceBase64 = btoa(binary);
    file = chosen;
    sourceRights = "";
    sourceConfirmed = false;
    asset = null;
    selected = null;
    error = "";
    label = chosen.name;
    const line = (await chosen.slice(0, 20000).text())
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)[0];
    let quotedHeader = false,
      semicolons = 0,
      commas = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (quotedHeader && line[i + 1] === '"') i++;
        else quotedHeader = !quotedHeader;
      } else if (!quotedHeader) {
        if (line[i] === ";") semicolons++;
        if (line[i] === ",") commas++;
      }
    }
    const delimiter = semicolons > commas ? ";" : ",";
    headers = [];
    let cell = "",
      quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        headers.push(cell.trim());
        cell = "";
      } else cell += char;
    }
    headers.push(cell.trim());
    mapping = {
      article:
        headers.find((h) => /^(article|artikel|artikelnummer|sku)$/i.test(h)) ??
        "",
      name:
        headers.find((h) => /^(name|bezeichnung|produktname)$/i.test(h)) ?? "",
      width: headers.find((h) => /^(width|breite)$/i.test(h)) ?? "",
      depth: headers.find((h) => /^(depth|tiefe|länge|laenge)$/i.test(h)) ?? "",
      height: headers.find((h) => /^(height|höhe|hoehe)$/i.test(h)) ?? "",
    };
  }
  async function upload() {
    if (!file || busy) return;
    busy = true;
    error = "";
    try {
      if (!asset)
        asset = await command("manufacturer.asset.create", undefined, {
          name: "Duravit-DE · " + label,
          manufacturer_name: "Duravit",
          article_reference: "",
          kind: "datasheet",
          studio_scope: "room_plan",
          source_url: sourceUrl,
          source_unit: unit,
          notes:
            "CSV-Lieferung · keine technische Freigabe und keine KI-Verwendungsfreigabe.",
        });
      const doc = await uploadOriginal(file, "manufacturer-assets", asset.id);
      asset = await command(
        "manufacturer.asset.attach",
        asset.id,
        { document_id: doc.id },
        asset.version,
      );
      notice =
        "Datei übertragen. Die echte Dateiprüfung muss abgeschlossen sein, bevor die Vorschau erstellt werden kann.";
      file = null;
      await invalidateAll();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function stage() {
    if (!asset || busy) return;
    busy = true;
    error = "";
    try {
      sourceRights = "";
      sourceConfirmed = false;
      selected = await command("manufacturer.delivery.stage", undefined, {
        label,
        source_document_version_id: asset.document_version_id,
        source_url: sourceUrl,
        unit,
        mapping,
        source_base64: sourceBase64,
      });
      notice =
        "Vorschau erstellt. Artikel und Maße prüfen; der Katalog wurde noch nicht geändert.";
      await refresh();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function apply() {
    if (!selected || busy) return;
    busy = true;
    error = "";
    try {
      selected = await command(
        "manufacturer.delivery.apply",
        selected.id,
        { confirm: true },
        selected.version,
      );
      notice =
        "Referenzstände übernommen. Bestehende Planrevisionen behalten ihre bisherigen Artikelstände. Originalmodelle und Freigaben werden getrennt geführt.";
      await refresh();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function publishSource() {
    if (
      busy ||
      !selected?.source_asset_id ||
      !sourceConfirmed ||
      sourceRights.trim().length < 20
    )
      return;
    busy = true;
    error = "";
    try {
      await command(
        "manufacturer.asset.publish",
        selected.source_asset_id,
        {
          use_planning: true,
          use_ai: false,
          rights_statement: sourceRights,
          rights_confirmed: true,
        },
        selected.source_asset_version,
      );
      await refresh();
      await invalidateAll();
      notice =
        "Die Planungsnutzung dieser Quellenfassung ist bestätigt. Die CSV ist damit nicht als KI-Dateireferenz freigegeben.";
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<details
  class="delivery-panel"
  ontoggle={(event) => {
    if (event.currentTarget.open && !loaded) {
      loaded = true;
      void refresh();
    }
  }}
>
  <summary>Duravit-DE · Artikeldaten importieren und aktualisieren</summary>
  <div class="delivery-body">
    <p>
      CSV-Lieferungen aus dem deutschen Sortiment prüfen und als versionierte
      Herstellerreferenzen übernehmen. Bilder und CAD-Originale werden weiterhin
      in der Herstellerbibliothek zugeordnet und auf ihre erlaubte Verwendung
      geprüft.
    </p>
    <a
      href="https://pro.duravit.de/pro/html/default/downloadcenter.de-de.html"
      target="_blank"
      rel="noreferrer">Offizielles deutsches Downloadcenter öffnen</a
    >
    <p class="hint">
      Ein automatischer Herstellerfeed ist noch nicht eingerichtet. Die
      Abdeckung des gesamten Herstellers ist ohne vollständige Soll-Liste
      unbekannt.
    </p>
    {#if error}<p class="delivery-error" role="alert">
        {error}
      </p>{/if}{#if notice}<p class="notice" role="status">{notice}</p>{/if}
    <fieldset disabled={busy}>
      <label class="file-choice" for={uid + "-file"}
        ><span>CSV-Datei (UTF-8, bis 650 KB, höchstens 500 Artikel)</span><span
          class="file-surface"
          ><span class="file-button"
            ><Icon name="upload" size={17} />Datei auswählen</span
          ><span
            >{file?.name ??
              (asset
                ? "Quelldatei übertragen"
                : "Keine Datei ausgewählt")}</span
          ></span
        ><input
          id={uid + "-file"}
          class="sr-only"
          type="file"
          accept=".csv,text/csv"
          onchange={choose}
        /></label
      >{#if headers.length}<label
          >Lieferstand / Bezeichnung<input
            bind:value={label}
            maxlength="160"
          /></label
        ><label
          >Offizielle deutsche Quelle<input
            type="url"
            bind:value={sourceUrl}
          /></label
        ><label
          >Einheit der Quelldaten<select
            use:searchableSelect={unit}
            bind:value={unit}
            ><option>mm</option><option>cm</option><option>m</option></select
          ></label
        >
        <div class="column-map">
          {#each [["article", "Artikelnummer"], ["name", "Bezeichnung"], ["width", "Breite"], ["depth", "Tiefe / Länge"], ["height", "Höhe"]] as [key, title]}<label
              >{title}<select
                use:searchableSelect={mapping[key as keyof typeof mapping]}
                bind:value={mapping[key as keyof typeof mapping]}
                ><option value=""
                  >{["article", "name"].includes(key)
                    ? "Spalte auswählen"
                    : "Nicht in der Lieferung"}</option
                >{#each headers as header}<option>{header}</option
                  >{/each}</select
              ></label
            >{/each}
        </div>
        <p class="hint">
          Die Spalten und die Originaleinheit ausdrücklich zuordnen. Fehlende
          Maße bleiben unbekannt. Preise, Aufmaß und technische Freigaben werden
          nicht übernommen.
        </p>
        {#if file}<button
            class="btn"
            onclick={upload}
            disabled={!mapping.article || !mapping.name || !label.trim()}
            >Quelldatei privat hochladen</button
          >{/if}{#if asset?.document_version_id}<button
            class="btn primary"
            onclick={stage}>Lieferung prüfen / Vorschau erstellen</button
          >{/if}{/if}
    </fieldset>
    {#if selected}<section class="delivery-preview">
        <h3>{selected.name}</h3>
        <p>
          {selected.report.new ?? selected.report.added ?? 0} neu · {selected
            .report.changed ?? 0} geändert · {selected.report.unchanged ?? 0} unverändert
        </p>
        <p class="hint">
          {selected.report.sourceQuality} · {selected.report.catalogCoverage}
        </p>
        <p class="mobile-table-hint">
          Seitlich wischen, um alle Artikelspalten zu sehen.
        </p>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard focus lets users scroll a long article preview.) -->
        <div
          class="preview-scroll"
          role="region"
          aria-label="Artikelvorschau"
          tabindex="0"
        >
          <table>
            <thead
              ><tr
                ><th>Artikel</th><th>Bezeichnung</th><th>B × T × H in mm</th><th
                  >Änderung</th
                ></tr
              ></thead
            ><tbody
              >{#each selected.report.items ?? [] as item}<tr
                  ><td>{item.article}</td><td>{item.name}</td><td
                    >{item.width ?? "offen"} × {item.depth ?? "offen"} × {item.height ??
                      "offen"}{#if item.previous && item.change === "changed"}<small
                        >Bisher: {item.previous.width ?? "offen"} × {item
                          .previous.depth ?? "offen"} × {item.previous.height ??
                          "offen"}</small
                      >{/if}</td
                  ><td
                    >{{
                      new: "Neu",
                      changed: "Geändert",
                      unchanged: "Unverändert",
                    }[item.change as "new" | "changed" | "unchanged"]}</td
                  ></tr
                >{/each}</tbody
            >
          </table>
        </div>
        {#if selected.status === "review"}
          {#if !selected.source_planning_use}
            {#if selected.source_status === "draft"}
              <fieldset class="source-rights" disabled={busy}>
                <legend>Planungsnutzung der Quelle</legend>
                <p>
                  Bevor Artikeldaten in den Katalog übernommen werden, muss die
                  erlaubte Nutzung dieser Quelldatei feststehen. Originalmodelle
                  und die Übermittlung der Datei an KI bleiben getrennt.
                </p>
                <label for={uid + "-rights"}
                  >Grundlage der Planungsnutzung<textarea
                    id={uid + "-rights"}
                    rows="3"
                    maxlength="2000"
                    bind:value={sourceRights}
                    placeholder="Zum Beispiel Lizenzbeleg oder schriftliche Herstellererlaubnis mit Datum und Umfang"
                  ></textarea></label
                ><label class="rights-confirm"
                  ><input type="checkbox" bind:checked={sourceConfirmed} />Ich
                  habe die angegebene Planungsnutzung dieser Quelle geprüft.</label
                ><button
                  class="btn"
                  disabled={!sourceConfirmed ||
                    sourceRights.trim().length < 20 ||
                    busy}
                  onclick={publishSource}>Planungsnutzung freigeben</button
                >
              </fieldset>
            {:else}<p class="hint">
                Diese Quellenfassung ist nicht für die Planungsnutzung
                verfügbar. Eine neue berechtigt nutzbare Quellenfassung
                hinzufügen.
              </p>{/if}
          {/if}
          <button
            class="btn primary"
            disabled={busy || !selected.source_planning_use}
            onclick={apply}>Geprüfte Referenzstände übernehmen</button
          >{:else}<p role="status">
            Dieser Lieferstand wurde übernommen. Technische Modelle und Rechte
            werden dadurch nicht freigegeben.
          </p>{/if}
      </section>{/if}
    <details class="history">
      <summary>Letzte Lieferungen ({deliveries.length})</summary><button
        class="btn"
        onclick={refresh}
        disabled={busy}>Datei- und Lieferstatus aktualisieren</button
      >{#each deliveries as delivery}<button
          class="delivery-row"
          onclick={() => {
            selected = delivery;
            sourceRights = "";
            sourceConfirmed = false;
          }}
          ><strong>{delivery.name}</strong><span
            >{delivery.status === "applied" ? "Übernommen" : "Vorschau"} · {display(
              delivery.created_at,
              "date",
            )}</span
          ></button
        >{/each}
    </details>
  </div>
</details>

<style>
  .mobile-table-hint {
    display: none;
  }
  @media (max-width: 760px) {
    .mobile-table-hint {
      display: block;
      color: var(--muted);
      font-size: 12px;
    }
  }
  .source-rights {
    margin-block: 18px;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: 11px;
  }
  .source-rights legend {
    font-size: 14px;
    font-weight: 600;
  }
  .source-rights textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 11px 13px;
    margin-top: 7px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--input-surface);
    color: var(--ink);
    font: inherit;
    line-height: 1.6;
  }
  .rights-confirm {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-height: 44px;
  }
  .rights-confirm input {
    width: 18px;
    height: 18px;
    min-height: 18px;
    flex: none;
    padding: 0;
    margin: 3px 0 0;
    accent-color: var(--forest);
  }
  .file-choice {
    position: relative;
  }
  .file-choice input {
    width: 1px;
    height: 1px;
    min-height: 0;
    padding: 0;
    margin: 0;
    left: 0;
    top: 0;
  }
  .file-surface {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    margin-top: 8px;
    border: 1px dashed var(--line);
    border-radius: 11px;
    background: var(--input-surface);
    overflow-wrap: anywhere;
    cursor: pointer;
  }
  .file-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 7px 12px;
    flex: none;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--paper);
    font-weight: 600;
  }
  .file-choice:focus-within .file-surface {
    outline: 2px solid var(--forest);
    outline-offset: 3px;
  }
  @media (max-width: 600px) {
    .file-surface {
      align-items: flex-start;
      flex-direction: column;
    }
    .file-button {
      min-height: 44px;
    }
  }
  .delivery-panel {
    margin: 20px 0;
    padding: 18px 20px;
    border: 1px solid var(--line);
    border-radius: 13px;
    background: var(--paper);
  }
  summary {
    cursor: pointer;
    min-height: 32px;
    font-weight: 600;
    font-size: 14px;
  }
  .delivery-body {
    padding-top: 15px;
    max-width: 1000px;
  }
  .delivery-body p {
    font-size: 13px;
    line-height: 1.7;
  }
  .hint {
    color: var(--muted);
  }
  label {
    display: block;
    font-size: 13px;
    margin: 16px 0;
  }
  input,
  select {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    margin-top: 7px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--input-surface);
    color: var(--ink);
    font: inherit;
  }
  fieldset {
    padding: 0;
    border: 0;
    min-width: 0;
  }
  .column-map {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .btn {
    margin: 10px 10px 10px 0;
  }
  .delivery-error {
    color: var(--danger);
    background: var(--danger-wash);
    padding: 14px;
    border-radius: 9px;
  }
  .preview-scroll {
    overflow: auto;
    max-height: 420px;
  }
  table {
    width: 100%;
    min-width: 600px;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  td small {
    display: block;
    margin-top: 7px;
    color: var(--muted);
  }
  .history {
    margin-top: 24px;
  }
  .delivery-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    width: 100%;
    padding: 15px 0;
    text-align: left;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: none;
    color: var(--ink);
    cursor: pointer;
  }
  .delivery-row span {
    font-size: 12px;
    color: var(--muted);
  }
  @media (max-width: 760px) {
    .column-map {
      grid-template-columns: 1fr;
    }
    .delivery-panel {
      padding: 16px;
    }
    input,
    select {
      font-size: 16px;
      min-height: 48px;
    }
    .delivery-row {
      align-items: start;
      flex-direction: column;
    }
  }
  @media (max-width: 760px) {
    .source-rights textarea {
      font-size: 16px;
    }
  }
</style>
