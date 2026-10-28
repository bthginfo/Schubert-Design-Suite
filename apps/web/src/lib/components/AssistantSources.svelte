<script lang="ts">
  import { onDestroy } from "svelte";
  import { uploadOriginal } from "#lib/client/uploads.ts";
  import { command, request, permitted } from "#lib/client/api.ts";
  import type { AppData } from "#lib/client/types.ts";
  import type { AssistantSource } from "#lib/client/assistant.ts";
  import { assistantUploadTarget } from "#lib/client/assistant.ts";
  import ReferencePicker from "./ReferencePicker.svelte";
  import Status from "./Status.svelte";
  import Icon from "./Icon.svelte";
  import ManufacturerPicker from "./studio/ManufacturerPicker.svelte";
  let manufacturerOpen = $state(false),
    uploadError = $state("");
  const uploads = new Map<string, AbortController>();
  let {
    data,
    rows = $bindable([]),
    disabled = false,
    imageMode = false,
    maxSources = 2,
  }: {
    data: AppData;
    rows?: AssistantSource[];
    disabled?: boolean;
    imageMode?: boolean;
    maxSources?: number;
  } = $props();
  const uploadTarget = $derived(assistantUploadTarget(data));
  function add() {
    if (rows.length < maxSources)
      rows = [
        ...rows,
        {
          key: crypto.randomUUID(),
          documentId: "",
          name: "",
          pageNumber: 1,
          includeImage: imageMode,
        },
      ];
  }
  function selected(
    row: AssistantSource,
    value: string,
    choice?: { name: string },
  ) {
    row.documentId = value;
    row.name = choice?.name || "Ausgewählte Unterlage";
    row.preview = undefined;
    row.includeImage = imageMode;
    row.error = "";
  }
  function identity(row: AssistantSource) {
    return row.documentId + ":" + row.pageNumber;
  }
  async function preview(row: AssistantSource, refresh = false) {
    if (disabled || row.working || !row.documentId) return;
    const target = identity(row);
    row.working = true;
    row.error = "";
    try {
      if (
        !Number.isInteger(row.pageNumber) ||
        Number(row.pageNumber) < 1 ||
        Number(row.pageNumber) > 1000
      )
        throw new Error(
          "Eine konkrete Seite von 1 bis 1.000 wählen. Bei einem Foto verwenden Sie Seite 1.",
        );
      const result = refresh
        ? await request(
            "/api/v1/planning/source-preview/" + row.preview?.job_id,
            undefined,
            "GET",
          )
        : await command("documents.preview", undefined, {
            document_id: row.documentId,
            page_index: Number(row.pageNumber) - 1,
            ai_preview: !imageMode,
            ai_reading: !imageMode,
          });
      if (identity(row) === target) row.preview = result;
    } catch (cause) {
      if (identity(row) === target)
        row.error =
          cause instanceof Error
            ? cause.message
            : "Die Bildreferenz konnte nicht vorbereitet werden.";
    } finally {
      row.working = false;
    }
  }
  function imageUrl(row: AssistantSource) {
    return row.preview?.document_id && row.preview?.document_version_id
      ? `/api/v1/documents/${row.preview.document_id}/download?version=${row.preview.document_version_id}&inline=1`
      : null;
  }

  const pause = (signal: AbortSignal, ms = 1600) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("Vorbereitung pausiert."));
        return;
      }
      const id = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, ms);
      function abort() {
        clearTimeout(id);
        reject(new Error("Vorbereitung pausiert."));
      }
      signal.addEventListener("abort", abort, { once: true });
    });
  async function prepareUploaded(row: AssistantSource, resume = false) {
    const controller = new AbortController();
    uploads.set(row.key, controller);
    const signal = controller.signal,
      deadline = Date.now() + 90000;
    row.working = true;
    row.error = "";
    try {
      if (
        !Number.isInteger(row.pageNumber) ||
        Number(row.pageNumber) < 1 ||
        Number(row.pageNumber) > 1000
      )
        throw Error(
          "Eine konkrete Seite von 1 bis 1.000 wählen. Bei einem Foto verwenden Sie Seite 1.",
        );
      row.stage = "checking";
      while (true) {
        signal.throwIfAborted();
        if (Date.now() > deadline)
          throw Error(
            "Die Datei ist gespeichert. Ihre Prüfung dauert noch. Mit „Vorbereitung fortsetzen“ später fortfahren.",
          );
        const state = await request(
          "/api/v1/ai/attachments/" + row.documentId,
          undefined,
          "GET",
          signal,
        );
        if (state.status === "available") break;
        if (resume && state.can_retry) {
          resume = false;
          await command("documents.document.resume_processing", row.documentId, {
            document_version_id: state.document_version_id,
          }, state.version);
          await pause(signal);
          continue;
        }
        if (state.status === "blocked") row.stage = "blocked";
        if (["blocked", "unavailable"].includes(state.status))
          throw Error(
            state.message ||
              "Die Dateiprüfung konnte noch nicht erfolgreich abgeschlossen werden. Das Original bleibt gespeichert.",
          );
        await pause(signal);
      }
      row.stage = "preparing";
      row.preview = await command("documents.preview", undefined, {
        document_id: row.documentId,
        page_index: Number(row.pageNumber) - 1,
        ai_preview: !imageMode,
        ai_reading: !imageMode,
      });
      while (row.preview?.status !== "completed") {
        signal.throwIfAborted();
        if (Date.now() > deadline)
          throw Error(
            "Die Bildvorlage wird noch vorbereitet. Die Datei ist gespeichert; Sie können die Vorbereitung später fortsetzen.",
          );
        if (
          ["failed", "unavailable", "cancelled"].includes(row.preview?.status)
        )
          throw Error(
            row.preview?.message ||
              "Die Bildvorbereitung ist derzeit nicht verfügbar.",
          );
        await pause(signal);
        row.preview = await request(
          "/api/v1/planning/source-preview/" + row.preview!.job_id,
          undefined,
          "GET",
          signal,
        );
      }
      row.stage = "ready";
    } catch (cause) {
      if (row.stage !== "blocked") row.stage = "paused";
      row.error = signal.aborted
        ? "Die Vorbereitung ist pausiert. Bereits hochgeladene Dateien bleiben gespeichert."
        : cause instanceof Error
          ? cause.message
          : "Die Datei konnte nicht vorbereitet werden.";
    } finally {
      row.working = false;
      if (uploads.get(row.key) === controller) uploads.delete(row.key);
    }
  }
  export async function addFiles(files: File[]) {
    uploadError = "";
    if (disabled) return;
    if (!permitted(data, "documents.upload")) {
      uploadError = "Für das Hochladen fehlt der Dokumentenzugriff.";
      return;
    }
    const available = maxSources - rows.length;
    if (files.length > available)
      uploadError =
        "Bis zu " +
        maxSources +
        " Dateien pro Nachricht. Entfernen Sie eine Quelle, um eine andere auszuwählen.";
    for (const file of files.slice(0, available)) {
      if (
        ![
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/tiff",
        ].includes(file.type)
      ) {
        uploadError =
          "Ein Foto als JPG, PNG, WEBP oder TIFF oder eine PDF-Datei auswählen.";
        continue;
      }
      const key = crypto.randomUUID();
      rows = [
        ...rows,
        {
          key,
          documentId: "",
          name: file.name,
          pageNumber: 1,
          includeImage: true,
          uploaded: true,
          working: true,
          stage: "uploading",
        },
      ];
      const row = rows.find((item) => item.key === key)!;
      const transfer = new AbortController();
      uploads.set(key, transfer);
      try {
        const doc = await uploadOriginal(
          file,
          uploadTarget?.entityType,
          uploadTarget?.entityId,
          transfer.signal,
        );
        row.documentId = doc.id ?? doc.document?.id;
        row.working = false;
        void prepareUploaded(row);
      } catch (cause) {
        row.working = false;
        row.stage = "paused";
        row.error = (cause as Error).message;
        if (uploads.get(key) === transfer) uploads.delete(key);
      }
    }
  }
  function remove(row: AssistantSource) {
    uploads.get(row.key)?.abort();
    rows = rows.filter((item) => item.key !== row.key);
  }
  onDestroy(() => {
    for (const controller of uploads.values()) controller.abort();
  });
</script>

<details class="assistant-sources" open={imageMode || rows.length > 0}>
  <summary
    >{imageMode
      ? "Foto oder Bildvorlage auswählen"
      : "Unterlagen hinzufügen · optional"}{rows.length
      ? ` · ${rows.length}/${maxSources}`
      : ""}<Icon name="file" size={14} /></summary
  >
  <div class="assistant-source-body">
    <p class="field-help">
      {imageMode
        ? "Wählen Sie ein vorhandenes Foto, einen früheren Bildentwurf oder eine bestimmte PDF-Seite aus den Dokumenten. Fotos und PDFs können Sie direkt hier im Chat hochladen."
        : "Fotos, Zeichnungen und PDFs direkt hinzufügen oder vorhandene Unterlagen auswählen. Hochgeladene Bildseiten werden nach der Dateiprüfung automatisch lesbar vorbereitet."}
    </p>
    {#if uploadTarget}<p class="field-help">Neue Uploads werden bei „{uploadTarget.entityName}“ abgelegt und bleiben dort auch nach dem Schließen des Chats auffindbar.</p>{/if}
    {#each rows as row, index (row.key)}<fieldset
        class="assistant-source"
        disabled={disabled || row.working}
      >
        <div class="assistant-source-header">
          <h3>{row.uploaded ? row.name : "Quelle " + (index + 1)}</h3>
          <button
            type="button"
            class="icon-button"
            aria-label={`Quelle ${index + 1} entfernen`}
            onclick={() => remove(row)}><Icon name="trash" size={15} /></button
          >
        </div>
        {#if row.uploaded}<p class="upload-progress" role="status">
            {{
              uploading: "Datei wird hochgeladen …",
              checking: "Datei wird geprüft …",
              preparing: "Bildseite wird lesbar vorbereitet …",
              ready: "Bereit für die KI",
              paused: "Vorbereitung pausiert",
              blocked: "Datei gesperrt",
            }[row.stage ?? "paused"]}
          </p>{/if}
        {#if !row.uploaded}<div class="field">
            <label for={`assistant-source-${row.key}`}
              >Geprüfte Unterlage *</label
            ><ReferencePicker
              id={`assistant-source-${row.key}`}
              bind:value={row.documentId}
              reference="documents"
              initial={data.lookups.documents || []}
              required
              onchange={(value, choice) => selected(row, value, choice)}
            />
          </div>{/if}
        <div class="field mt">
          <label for={`assistant-page-${row.key}`}>Seite im Original *</label
          ><input
            id={`assistant-page-${row.key}`}
            type="number"
            min="1"
            max="1000"
            step="1"
            bind:value={row.pageNumber}
            required
            oninput={() => {
              row.preview = undefined;
              row.error = "";
              if (row.uploaded) row.stage = "paused";
            }}
            onchange={() => {
              if (row.uploaded && row.includeImage) void prepareUploaded(row);
            }}
          /><span class="field-help"
            >Die sichtbare Seitennummer. Bei einem Foto: Seite 1.</span
          >
        </div>
        <label class="check-field mt"
          ><input type="checkbox" bind:checked={row.includeImage} /><span
            >Sichtbaren Bild- oder PDF-Inhalt dieser Seite mitgeben</span
          ></label
        >{#if row.includeImage}<p class="field-help mt">
            {imageMode
              ? "Die gewählte Seite wird bis 1440 Pixel vorbereitet, damit Material und Details für die Bildbearbeitung erkennbar bleiben."
              : "Eine private lesbare Bildvorlage bis 1440 Pixel verwenden. Der gesamte PDF-Inhalt und frühere Unterhaltungen werden nicht als Datei mitgesendet."}
          </p>
          <div class="inline-actions mt">
            <button
              type="button"
              class="btn small"
              disabled={!row.documentId || !permitted(data, "documents")}
              onclick={() => preview(row)}
              ><Icon
                name={row.working ? "refresh" : "file"}
                size={14}
              />{row.working
                ? "Wird vorbereitet …"
                : "Bild vorbereiten"}</button
            >{#if row.preview?.job_id}<button
                type="button"
                class="btn small"
                onclick={() => preview(row, true)}
                ><Icon name="refresh" size={14} />Status aktualisieren</button
              >{/if}
          </div>
          {#if !permitted(data, "documents")}<p class="field-help mt">
              Für die Bildvorbereitung ist das Dokumentenrecht erforderlich.
              Vorhandene Textauszüge bleiben eine getrennte Auswahl.
            </p>{/if}{#if row.preview}<div
              class="assistant-preview-status mt"
              aria-live="polite"
            >
              <Status value={row.preview.status} />{#if row.preview.message}<p
                  class="field-help mt"
                >
                  {row.preview.message}
                </p>{/if}{#if row.preview.status === "completed" && imageUrl(row)}<img
                  src={imageUrl(row)!}
                  alt={`Vorbereitete Bildreferenz von ${row.name}, Seite ${row.pageNumber}`}
                  loading="lazy"
                />
                <p class="field-help">
                  Vorbereitet: {row.preview.width} × {row.preview.height} Pixel ·
                  Quelle und Seite vor dem Senden prüfen.
                </p>
                <a class="btn small mt" href={imageUrl(row)!} target="_blank" rel="noopener" aria-label="Bildvorlage groß ansehen – öffnet einen neuen Tab">Bildvorlage groß ansehen</a>
                <p class="field-help">Öffnet die geprüfte Bildseite in einem neuen Tab.</p>{:else if ["pending", "running", "retry"].includes(row.preview.status)}<p
                  class="field-help mt"
                >
                  Die konkrete Seite wird verarbeitet. Bei einem neuen Upload
                  wird der Status automatisch aktualisiert. Anschließend ist die
                  Quelle zum Senden bereit.
                </p>{/if}
            </div>{/if}{:else}<p class="field-help mt">
            Nur vorhandene Textauszüge dieser Seite. Fehlt eine Erkennung,
            bleibt das für den Assistenten kenntlich.
          </p>{/if}{#if row.error}<p class="field-error mt" role="alert">
            {row.error}
          </p>{/if}
      </fieldset>
      {#if row.uploaded && row.working}<button
          type="button"
          class="text-link"
          onclick={() => uploads.get(row.key)?.abort()}
          >Vorbereitung pausieren</button
        >{:else if row.uploaded && row.documentId && row.stage !== "ready" && row.stage !== "blocked"}<button
          type="button"
          class="btn small"
          {disabled}
          onclick={() => prepareUploaded(row, true)}>Vorbereitung fortsetzen</button
        >{/if}{/each}
    {#if uploadError}<p class="field-error" role="alert">
        {uploadError}
      </p>{/if}<button
      type="button"
      class="btn small mt"
      disabled={disabled || rows.length >= maxSources}
      onclick={add}><Icon name="plus" size={14} />Quelle auswählen</button
    >{#if permitted(data, "planning")}<button
        type="button"
        class="btn small mt"
        disabled={disabled || rows.length >= maxSources}
        onclick={() => (manufacturerOpen = true)}
        ><Icon name="box" size={14} />Aus Herstellerbibliothek</button
      >{/if}
    <p class="field-help mt">
      Personalunterlagen bleiben außerhalb der KI. Die Quelle dient als
      ungeprüfter Bezug; Maße und Aussagen müssen fachlich kontrolliert werden.
    </p>
  </div>
</details>
{#if manufacturerOpen}<ManufacturerPicker
    studio={data.detail?.kind ?? "both"}
    purpose="ai"
    onchoose={(asset) => {
      rows = [
        ...rows,
        {
          key: crypto.randomUUID(),
          documentId: asset.document_id,
          name: asset.name,
          pageNumber: 1,
          includeImage: true,
        },
      ];
    }}
    onclose={() => (manufacturerOpen = false)}
  />{/if}

<style>
  .assistant-source-header h3 {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .upload-progress {
    font-size: 13px;
    line-height: 1.6;
    color: var(--forest);
  }
  .assistant-sources {
    border-top: 1px solid var(--line);
    padding-top: 11px;
    margin-bottom: 15px;
  }
  .assistant-sources > summary {
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    cursor: pointer;
    min-height: 35px;
    color: var(--forest);
  }
  .assistant-source-body {
    max-height: 36dvh;
    overflow: auto;
    padding: 9px 2px 3px;
  }
  .assistant-source {
    border: 1px solid var(--line);
    border-radius: 5px;
    margin: 17px 0 0;
    padding: 14px;
    min-width: 0;
    background: var(--paper);
  }
  .assistant-source-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 12px;
  }
  .assistant-source-header h3 {
    font-size: 13px;
    font-weight: 550;
  }
  .assistant-source :global(.field label) {
    font-size: 12px;
  }
  .assistant-source :global(.field-help) {
    font-size: 11px;
    line-height: 1.65;
  }
  .assistant-source :global(.reference-search > summary) {
    font-size: 11px;
  }
  .assistant-preview-status img {
    display: block;
    max-width: 100%;
    max-height: 140px;
    object-fit: contain;
    margin: 13px 0 10px;
    border: 1px solid var(--line);
    background: white;
  }
  .assistant-source :global(.reference-search-controls) {
    flex-wrap: wrap;
  }
  .assistant-source :global(.reference-search-controls input) {
    flex-basis: 100%;
  }
  .assistant-source .check-field {
    font-size: 12px;
    align-items: start;
  }
  .assistant-source .check-field input {
    flex: none;
  }
  @media (max-width: 760px) {
    .assistant-sources > summary {
      font-size: 13px;
      min-height: 44px;
    }
    .assistant-source-body {
      max-height: 34dvh;
    }
    .assistant-source :global(.field-help) {
      font-size: 12px;
    }
    .assistant-source .check-field {
      font-size: 13px;
    }
    .assistant-source .btn {
      min-height: 44px;
    }
  }
</style>
